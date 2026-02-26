export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  webContentLink?: string
  size?: string
  thumbnailLink?: string
  videoMediaMetadata?: {
    durationMillis?: string
    width?: number
    height?: number
  }
}

export interface CourseLesson {
  id: string
  name: string
  type: 'video' | 'pdf' | 'other'
  fileId: string
  mimeType: string
  webViewLink: string
  size?: string
  order: number
}

export interface CourseModule {
  id: string
  name: string
  lessons: CourseLesson[]
  subModules: CourseModule[]
  order: number
  depth?: number  // 0 = subject/module, 1 = unit (01,02...), 2 = topic (files here)
}

export interface Course {
  id: string
  name: string
  driveUrl: string
  folderId: string
  modules: CourseModule[]
  loadedAt: number
}

export interface VideoProgress {
  timestamp: number
  duration: number
  completed: boolean
  lastWatched: number
}

export interface PdfProgress {
  currentPage: number
  totalPages: number
  completed: boolean
  lastRead: number
}

export interface LessonNote {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface ModuleProgress {
  completed: number
  total: number
  percent: number
}

export interface User {
  email: string
  name: string
  picture: string
  token: string
}
