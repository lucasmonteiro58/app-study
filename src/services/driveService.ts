import { CourseModule, CourseLesson, DriveFile } from '../types'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'

// ── URL Parsing ───────────────────────────────────────────────────────────────

export function parseGoogleDriveUrl(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// ── Drive API ─────────────────────────────────────────────────────────────────

async function listFolderContents(folderId: string, token: string): Promise<DriveFile[]> {
  const fields = 'files(id,name,mimeType,webViewLink,webContentLink,size,thumbnailLink,videoMediaMetadata)'
  const url = `${DRIVE_API}/files?q='${folderId}'+in+parents+and+trashed=false&fields=${fields}&pageSize=1000&orderBy=name`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Erro ao acessar o Google Drive')
  }

  const data = await res.json()
  return data.files || []
}

async function getFolderName(folderId: string, token: string): Promise<string> {
  const url = `${DRIVE_API}/files/${folderId}?fields=name`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return 'Curso'
  const data = await res.json()
  return data.name || 'Curso'
}

// ── Type Detection ────────────────────────────────────────────────────────────

function getLessonType(mimeType: string): 'video' | 'pdf' | 'other' {
  if (mimeType.startsWith('video/') || mimeType === 'application/vnd.google-apps.video') return 'video'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'other'
}

// ── Course Structure Builder ──────────────────────────────────────────────────

async function buildModule(
  folderId: string,
  folderName: string,
  token: string,
  order: number,
  depth: number = 0,
): Promise<CourseModule> {
  const files = await listFolderContents(folderId, token)

  const lessons: CourseLesson[] = []
  const subModuleFolders: DriveFile[] = []

  files.forEach((file, idx) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      subModuleFolders.push(file)
    } else {
      const type = getLessonType(file.mimeType)
      if (type !== 'other') {
        lessons.push({
          id: file.id,
          name: file.name.replace(/\.[^.]+$/, ''), // strip extension
          type,
          fileId: file.id,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          size: file.size,
          order: idx,
        })
      }
    }
  })

  // Recursively build sub-modules (max depth 3 to avoid infinite loops)
  const subModules: CourseModule[] = depth < 3
    ? await Promise.all(
        subModuleFolders.map((f, i) => buildModule(f.id, f.name, token, i, depth + 1))
      )
    : []

  return {
    id: folderId,
    name: folderName,
    lessons,
    subModules,
    order,
    depth,
  }
}

export async function buildCourseStructure(
  folderId: string,
  token: string,
): Promise<{ name: string; modules: CourseModule[] }> {
  const name = await getFolderName(folderId, token)
  const files = await listFolderContents(folderId, token)

  const folderFiles = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder')
  const rootFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder')

  let modules: CourseModule[] = []

  if (folderFiles.length > 0) {
    // Has sub-folders → each folder is a module
    modules = await Promise.all(
      folderFiles.map((f, i) => buildModule(f.id, f.name, token, i))
    )
  }

  // If root has direct video/pdf files, create a "Geral" module
  const rootLessons: CourseLesson[] = rootFiles
    .filter(f => getLessonType(f.mimeType) !== 'other')
    .map((f, i) => ({
      id: f.id,
      name: f.name.replace(/\.[^.]+$/, ''),
      type: getLessonType(f.mimeType),
      fileId: f.id,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink,
      size: f.size,
      order: i,
    }))

  if (rootLessons.length > 0) {
    modules.unshift({
      id: `${folderId}_root`,
      name: 'Geral',
      lessons: rootLessons,
      subModules: [],
      order: -1,
    })
  }

  return { name, modules }
}

// ── Drive Embed URLs ──────────────────────────────────────────────────────────

export function getVideoEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

export function getPdfUrl(fileId: string, token: string): string {
  return `${DRIVE_API}/files/${fileId}?alt=media`
}

export function getDriveThumbnail(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
}
