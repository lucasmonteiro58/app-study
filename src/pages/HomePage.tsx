import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { parseGoogleDriveUrl, buildCourseStructure } from '../services/driveService'
import { addRecentCourse, getRecentCourses, RecentCourse } from '../services/progressService'
import Navbar from '../components/Navbar'
import { FolderOpen, ArrowRight, Clock, Loader2, AlertCircle, BookOpen } from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentCourses] = useState<RecentCourse[]>(getRecentCourses)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleLoad() {
    if (!url.trim()) {
      setError('Cole o link da pasta do Google Drive')
      inputRef.current?.focus()
      return
    }
    const folderId = parseGoogleDriveUrl(url.trim())
    if (!folderId) {
      setError('Link inválido. Use o link de compartilhamento de uma pasta do Google Drive.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const { name, modules } = await buildCourseStructure(folderId, user!.token)
      addRecentCourse({ folderId, name, url: url.trim(), lastAccessed: Date.now() })
      // Store course in sessionStorage for the dashboard
      sessionStorage.setItem(`ds:course:${folderId}`, JSON.stringify({ name, modules }))
      navigate(`/course/${folderId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(`Não foi possível carregar a pasta: ${msg}`)
      setLoading(false)
    }
  }

  function openRecent(course: RecentCourse) {
    navigate(`/course/${course.folderId}`)
  }

  function formatDate(ts: number) {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
      Math.round((ts - Date.now()) / (1000 * 60 * 60 * 24)),
      'day',
    )
  }

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh">
      <Navbar showBackButton={false} />

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-16">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 mb-6">
            <BookOpen className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Olá, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Cole o link de uma pasta do Google Drive para transformá-la em um curso estruturado
          </p>
        </div>

        {/* Input Card */}
        <div className="card mb-8 animate-slide-up">
          <label className="block text-sm font-medium text-gray-400 mb-3">
            Link da pasta do Google Drive
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                ref={inputRef}
                id="drive-url-input"
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLoad()}
                placeholder="https://drive.google.com/drive/folders/..."
                className="input-field pl-12"
                disabled={loading}
              />
            </div>
            <button
              id="load-course-btn"
              onClick={handleLoad}
              disabled={loading}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
              ) : (
                <><ArrowRight className="w-4 h-4" /> Carregar</>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg py-2.5 px-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-600">
            💡 A pasta deve estar compartilhada com sua conta do Google ({user?.email})
          </p>
        </div>

        {/* Recent Courses */}
        {recentCourses.length > 0 && (
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Cursos recentes
            </h2>
            <div className="grid gap-3">
              {recentCourses.map(course => (
                <button
                  key={course.folderId}
                  onClick={() => openRecent(course)}
                  className="card glass-hover flex items-center gap-4 text-left group p-4 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{course.name}</p>
                    <p className="text-xs text-gray-500 truncate">{course.url}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs flex-shrink-0">
                    <span>{formatDate(course.lastAccessed)}</span>
                    <ArrowRight className="w-4 h-4 group-hover:text-brand-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {recentCourses.length === 0 && (
          <div className="text-center py-16 text-gray-600 animate-fade-in">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum curso recente. Comece colando um link acima!</p>
          </div>
        )}
      </div>
    </div>
  )
}
