import { VideoProgress, PdfProgress, LessonNote, ModuleProgress, CourseModule } from '../types'

const key = (userId: string, fileId: string, suffix: string) =>
  `ds:${userId}:${fileId}:${suffix}`

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
  localStorage.setItem(key(userId, fileId, 'video'), JSON.stringify(updated))
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
  localStorage.setItem(key(userId, fileId, 'pdf'), JSON.stringify(updated))
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
  localStorage.setItem(`ds:${userId}:notes:${context}`, JSON.stringify(notes))
  return notes[existingId ? notes.findIndex(n => n.id === existingId) : 0]
}

export function deleteNote(userId: string, context: string, noteId: string) {
  const notes = getNotes(userId, context).filter(n => n.id !== noteId)
  localStorage.setItem(`ds:${userId}:notes:${context}`, JSON.stringify(notes))
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

export function getRecentCourses(): RecentCourse[] {
  try {
    const raw = localStorage.getItem('ds:recentCourses')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addRecentCourse(course: RecentCourse) {
  const courses = getRecentCourses().filter(c => c.folderId !== course.folderId)
  courses.unshift(course)
  localStorage.setItem('ds:recentCourses', JSON.stringify(courses.slice(0, 10)))
}
