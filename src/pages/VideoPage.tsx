import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CourseLesson } from '../types'
import { getVideoProgress, saveVideoProgress, markVideoCompleted } from '../services/progressService'
import { getVideoEmbedUrl } from '../services/driveService'
import Navbar from '../components/Navbar'
import NotesPanel from '../components/NotesPanel'
import { CheckCircle2, StickyNote, ExternalLink } from 'lucide-react'

export default function VideoPage() {
  const { folderId, fileId } = useParams<{ folderId: string; fileId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const lesson: CourseLesson | undefined = location.state?.lesson
  const courseData = location.state?.courseData

  const [completed, setCompleted] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const embedUrl = getVideoEmbedUrl(fileId || '')

  useEffect(() => {
    if (!user || !fileId) return
    const prog = getVideoProgress(user.email, fileId)
    if (prog) setCompleted(prog.completed)
    // Record visit time
    saveVideoProgress(user.email, fileId, { lastWatched: Date.now() })
  }, [user, fileId])

  function handleToggleComplete() {
    if (!user || !fileId) return
    if (completed) {
      saveVideoProgress(user.email, fileId, { completed: false })
      setCompleted(false)
    } else {
      markVideoCompleted(user.email, fileId)
      setCompleted(true)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh">
      <Navbar
        title={courseData?.name}
        showBackButton
        backTo={lesson ? `/course/${folderId}/module/${location.state?.module?.id}` : `/course/${folderId}`}
      />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="flex gap-6 items-start">
          {/* Video Section */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="mb-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-video">Vídeo</span>
                {completed && <span className="badge-done flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</span>}
              </div>
              <h1 className="text-2xl font-bold text-white">{lesson?.name || 'Vídeo'}</h1>
            </div>

            {/* Video Frame */}
            <div className="relative bg-black rounded-2xl overflow-hidden animate-slide-up" style={{ paddingTop: '56.25%' }}>
              <iframe
                id="video-player"
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay"
                allowFullScreen
                title={lesson?.name || 'Vídeo'}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-5 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  id="mark-complete-btn"
                  onClick={handleToggleComplete}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                    ${completed
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                      : 'btn-primary'
                    }`}
                  title={completed ? 'Clique para desmarcar' : 'Marcar como concluído'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {completed ? 'Concluído ✓' : 'Marcar como Concluído'}
                </button>

                <button
                  onClick={() => setShowNotes(p => !p)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${showNotes ? 'bg-brand-600/30 border border-brand-500/30 text-brand-400' : 'glass glass-hover text-gray-400'}`}
                >
                  <StickyNote className="w-4 h-4" /> Anotações
                </button>
              </div>

              <a
                href={`https://drive.google.com/file/d/${fileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Abrir no Drive
              </a>
            </div>
          </div>

          {/* Notes Panel */}
          {showNotes && user && (
            <div className="w-80 flex-shrink-0 animate-fade-in">
              <NotesPanel userId={user.email} context={`video:${fileId}`} title="Anotações desta aula" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
