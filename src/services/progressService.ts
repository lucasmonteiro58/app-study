import { VideoProgress, PdfProgress, LessonNote, ModuleProgress, CourseModule } from '../types'
export type { LessonNote }
import { db } from './firebase'
import { doc, setDoc, getDocs, collection } from 'firebase/firestore'

const key = (userId: string, fileId: string, suffix: string) =>
  `ds:${userId}:${fileId}:${suffix}`

// ── Sync from Firebase ────────────────────────────────────────────────────────

export async function syncFromFirebase(userId: string) {
  if (!userId) return

  try {
    // 1. Videos
    const vSnap = await getDocs(collection(db, `users/${userId}/videos`))
    vSnap.forEach((snapDoc: any) => {
      localStorage.setItem(key(userId, snapDoc.id, 'video'), JSON.stringify(snapDoc.data()))
    })

    // 2. PDFs
    const pSnap = await getDocs(collection(db, `users/${userId}/pdfs`))
    pSnap.forEach((snapDoc: any) => {
      localStorage.setItem(key(userId, snapDoc.id, 'pdf'), JSON.stringify(snapDoc.data()))
    })

    // 3. Notes
    const nSnap = await getDocs(collection(db, `users/${userId}/notes`))
    nSnap.forEach((snapDoc: any) => {
      const data = snapDoc.data()
      if (data.items) {
        localStorage.setItem(`ds:${userId}:notes:${snapDoc.id}`, JSON.stringify(data.items))
      }
    })

    // 4. Recent Courses
    const rSnap = await getDocs(collection(db, `users/${userId}/recentCourses`))
    rSnap.forEach((snapDoc: any) => {
      if (snapDoc.id === 'list') {
        const data = snapDoc.data()
        if (data.items) {
          localStorage.setItem('ds:recentCourses', JSON.stringify(data.items))
        }
      }
    })
  } catch (err) {
    console.error('Error syncing from Firebase:', err)
  }
}

// ── Video Progress ────────────────────────────────────────────────────────────

export function getVideoProgress(userId: string, fileId: string): VideoProgress | null {
  try {
    const raw = localStorage.getItem(key(userId, fileId, 'video'))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveVideoProgress(userId: string, fileId: string, data: Partial<VideoProgress>) {
  const existing = getVideoProgress(userId, fileId) ?? {
    timestamp: 0,
    duration: 0,
    completed: false,
    lastWatched: Date.now(),
  }
  const updated: VideoProgress = {
    ...existing,
    ...data,
    lastWatched: Date.now(),
  }

  // Local
  localStorage.setItem(key(userId, fileId, 'video'), JSON.stringify(updated))

  // Firebase
  setDoc(doc(db, `users/${userId}/videos/${fileId}`), updated, { merge: true }).catch(console.error)
}

export function markVideoCompleted(userId: string, fileId: string) {
  saveVideoProgress(userId, fileId, { completed: true })
}

// ── PDF Progress ──────────────────────────────────────────────────────────────

export function getPdfProgress(userId: string, fileId: string): PdfProgress | null {
  try {
    const raw = localStorage.getItem(key(userId, fileId, 'pdf'))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePdfProgress(userId: string, fileId: string, data: Partial<PdfProgress>) {
  const existing = getPdfProgress(userId, fileId) ?? {
    currentPage: 1,
    totalPages: 1,
    completed: false,
    lastRead: Date.now(),
  }
  const updated: PdfProgress = {
    ...existing,
    ...data,
    lastRead: Date.now(),
  }

  // Local
  localStorage.setItem(key(userId, fileId, 'pdf'), JSON.stringify(updated))

  // Firebase
  setDoc(doc(db, `users/${userId}/pdfs/${fileId}`), updated, { merge: true }).catch(console.error)
}

export function markPdfCompleted(userId: string, fileId: string) {
  savePdfProgress(userId, fileId, { completed: true })
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function getNotes(userId: string, context: string): LessonNote[] {
  try {
    const raw = localStorage.getItem(`ds:${userId}:notes:${context}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveNote(userId: string, context: string, content: string, existingId?: string): LessonNote {
  const notes = getNotes(userId, context)
  if (existingId) {
    const idx = notes.findIndex(n => n.id === existingId)
    if (idx >= 0) {
      notes[idx] = { ...notes[idx], content, updatedAt: Date.now() }
    }
  } else {
    const newNote: LessonNote = {
      id: crypto.randomUUID(),
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    notes.unshift(newNote)
  }

  // Local
  localStorage.setItem(`ds:${userId}:notes:${context}`, JSON.stringify(notes))

  // Firebase (save entire array)
  setDoc(doc(db, `users/${userId}/notes/${context}`), { items: notes }, { merge: true }).catch(console.error)

  return notes[existingId ? notes.findIndex(n => n.id === existingId) : 0]
}

export function deleteNote(userId: string, context: string, noteId: string) {
  const notes = getNotes(userId, context).filter(n => n.id !== noteId)

  // Local
  localStorage.setItem(`ds:${userId}:notes:${context}`, JSON.stringify(notes))

  // Firebase
  setDoc(doc(db, `users/${userId}/notes/${context}`), { items: notes }, { merge: true }).catch(console.error)
}

// ── Progress Calculation ──────────────────────────────────────────────────────

export function isLessonCompleted(userId: string, fileId: string, type: 'video' | 'pdf' | 'other'): boolean {
  if (type === 'video') {
    return getVideoProgress(userId, fileId)?.completed ?? false
  }
  if (type === 'pdf') {
    return getPdfProgress(userId, fileId)?.completed ?? false
  }
  return false
}

export function calculateModuleProgress(mod: CourseModule, userId: string): ModuleProgress {
  const allLessons = collectAllLessons(mod)
  const total = allLessons.length
  const completed = allLessons.filter(l => isLessonCompleted(userId, l.fileId, l.type)).length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { completed, total, percent }
}

function collectAllLessons(mod: CourseModule): Array<{ fileId: string; type: 'video' | 'pdf' | 'other' }> {
  const lessons = mod.lessons.map(l => ({ fileId: l.fileId, type: l.type }))
  for (const sub of mod.subModules) {
    lessons.push(...collectAllLessons(sub))
  }
  return lessons
}

export function calculateCourseProgress(modules: CourseModule[], userId: string): ModuleProgress {
  let total = 0
  let completed = 0
  for (const mod of modules) {
    const p = calculateModuleProgress(mod, userId)
    total += p.total
    completed += p.completed
  }
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { completed, total, percent }
}

// ── Recent Courses ────────────────────────────────────────────────────────────

export interface RecentCourse {
  folderId: string
  name: string
  url: string
  lastAccessed: number
}

// Helper getter that doesn't need userId for backwards compat
export function getRecentCourses(): RecentCourse[] {
  try {
    const raw = localStorage.getItem('ds:recentCourses')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Pass userId inside optional object if we want to sync it
export function addRecentCourse(course: RecentCourse, userId?: string) {
  const courses = getRecentCourses().filter(c => c.folderId !== course.folderId)
  courses.unshift(course)

  const limitedCourses = courses.slice(0, 10)

  // Local
  localStorage.setItem('ds:recentCourses', JSON.stringify(limitedCourses))

  // Firebase
  if (userId) {
    setDoc(doc(db, `users/${userId}/recentCourses/list`), { items: limitedCourses }, { merge: true }).catch(console.error)
  }
}
