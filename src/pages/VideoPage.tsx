import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CourseLesson } from '../types'
import { getVideoProgress, saveVideoProgress, markVideoCompleted } from '../services/progressService'
import { getCachedVideo, setCachedVideo, deleteCachedVideo, isVideoCached } from '../services/videoCacheService'
import Navbar from '../components/Navbar'
import NotesPanel from '../components/NotesPanel'
import { CheckCircle2, StickyNote, ExternalLink, AlertTriangle, RefreshCw, Download, HardDrive, Trash2, History } from 'lucide-react'

type PlayerMode = 'loading' | 'native' | 'iframe' | 'error'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'

export default function VideoPage() {
  const { folderId, fileId } = useParams<{ folderId: string; fileId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const lesson: CourseLesson | undefined = location.state?.lesson
  const courseData = location.state?.courseData
  const module = location.state?.module
  const topic = location.state?.topic

  const [completed, setCompleted] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [playerMode, setPlayerMode] = useState<PlayerMode>('loading')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [downloadedMb, setDownloadedMb] = useState(0)
  const [totalMb, setTotalMb] = useState(0)
  const [isCached, setIsCached] = useState(false)
  const [resumeTime, setResumeTime] = useState(0)    // seconds to resume from
  const videoRef = useRef<HTMLVideoElement>(null)

  // ── Load completion & saved position ──────────────────────────────────────────
  useEffect(() => {
    if (!user || !fileId) return
    const prog = getVideoProgress(user.email, fileId)
    if (prog) {
      setCompleted(prog.completed)
      setResumeTime(prog.timestamp ?? 0)
    }
    saveVideoProgress(user.email, fileId, { lastWatched: Date.now() })
  }, [user, fileId])

  // ── Load video: check cache then download ─────────────────────────────────────
  useEffect(() => {
    if (!fileId || !user?.token) {
      setPlayerMode('iframe')
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    async function loadVideo() {
      try {
        setPlayerMode('loading')
        setProgress(0)

        // 1) Check cache first
        const cachedUrl = await getCachedVideo(fileId!)
        if (cachedUrl && !cancelled) {
          objectUrl = cachedUrl
          setBlobUrl(cachedUrl)
          setIsCached(true)
          setPlayerMode('native')
          return
        }

        // 2) Download from Drive
        const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${user!.token}` },
        })

        if (!res.ok || cancelled) {
          if (!cancelled) setPlayerMode('iframe')
          return
        }

        const contentLength = Number(res.headers.get('Content-Length') || 0)
        setTotalMb(Math.round((contentLength / (1024 * 1024)) * 10) / 10)

        const reader = res.body?.getReader()
        if (!reader) {
          if (!cancelled) setPlayerMode('iframe')
          return
        }

        const allChunks: ArrayBuffer[] = []
        let received = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          allChunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer)
          received += value.byteLength
          setDownloadedMb(Math.round((received / (1024 * 1024)) * 10) / 10)
          if (contentLength > 0) {
            setProgress(Math.min(99, Math.round((received / contentLength) * 100)))
          }
        }

        if (cancelled) return

        setProgress(100)
        const mimeType = lesson?.mimeType || res.headers.get('Content-Type') || 'video/mp4'
        const blob = new Blob(allChunks, { type: mimeType })

        // 3) Save to cache
        await setCachedVideo(fileId!, blob)
        setIsCached(true)

        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setPlayerMode('native')
      } catch {
        if (!cancelled) setPlayerMode('iframe')
      }
    }

    loadVideo()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId, user?.token, lesson?.mimeType])

  // Sync isCached badge on mount
  useEffect(() => {
    if (!fileId) return
    isVideoCached(fileId).then(setIsCached)
  }, [fileId])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Video position tracking ───────────────────────────────────────────────────

  /** Seek to saved position once metadata is loaded */
  function handleLoadedMetadata() {
    if (!videoRef.current) return
    const dur = videoRef.current.duration
    if (resumeTime > 5 && dur > 0 && resumeTime < dur - 10) {
      videoRef.current.currentTime = resumeTime
    }
  }

  /** Save position every 5 accumulated seconds of playback */
  function handleTimeUpdate() {
    if (!user || !fileId || !videoRef.current) return
    const video = videoRef.current
    if (video.paused || video.ended) return
    const sec = Math.floor(video.currentTime)
    if (sec % 5 === 0 && sec > 0) {
      saveVideoProgress(user.email, fileId, {
        timestamp: video.currentTime,
        duration: video.duration,
      })
    }
  }

  /** Save exact position on pause / end */
  function handlePauseOrEnded() {
    if (!user || !fileId || !videoRef.current) return
    const video = videoRef.current
    saveVideoProgress(user.email, fileId, {
      timestamp: video.currentTime,
      duration: video.duration,
    })
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

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

  function handleFallbackToIframe() {
    setPlayerMode('iframe')
  }

  async function handleDeleteCache() {
    if (!fileId) return
    await deleteCachedVideo(fileId)
    setIsCached(false)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    setPlayerMode('loading')
    setProgress(0)
  }

  const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`

  // Format seconds → "mm:ss"
  function fmtTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh">
      <Navbar
        breadcrumbs={[
          courseData?.name,
          module?.name,
          topic?.name,
          lesson?.name,
        ].filter(Boolean) as string[]}
        showBackButton
        backTo={lesson ? `/course/${folderId}/module/${location.state?.module?.id}` : `/course/${folderId}`}
      />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="mb-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-video">Vídeo</span>
                {completed && (
                  <span className="badge-done flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Concluído
                  </span>
                )}
                {resumeTime > 5 && playerMode === 'native' && (
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <History className="w-3 h-3" /> Retomando em {fmtTime(resumeTime)}
                  </span>
                )}
              </div>
              {topic?.name && <p className="text-sm text-brand-400 font-medium mb-1">{topic.name}</p>}
              <h1 className="text-2xl font-bold text-white">{lesson?.name || 'Vídeo'}</h1>
            </div>

            {/* Player */}
            <div
              className="relative bg-black rounded-2xl overflow-hidden animate-slide-up"
              style={{ paddingTop: (playerMode === 'loading' || playerMode === 'error') ? '56.25%' : undefined }}
            >
              {/* Loading */}
              {playerMode === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">
                  <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <div className="w-full max-w-xs text-center">
                    <p className="text-white text-sm font-semibold mb-3">
                      {progress === 0 ? 'Conectando ao Drive…' : 'Baixando vídeo para reprodução…'}
                    </p>
                    {progress > 0 && (
                      <>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">
                          {downloadedMb} MB{totalMb > 0 ? ` / ${totalMb} MB` : ''} &nbsp;·&nbsp; {progress}%
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleFallbackToIframe}
                    className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Usar player do Drive (pode não funcionar)
                  </button>
                </div>
              )}

              {/* Native player */}
              {playerMode === 'native' && blobUrl && (
                <video
                  ref={videoRef}
                  src={blobUrl}
                  controls
                  autoPlay
                  className="w-full rounded-2xl"
                  style={{ maxHeight: '72vh' }}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPause={handlePauseOrEnded}
                  onEnded={handlePauseOrEnded}
                  onError={handleFallbackToIframe}
                  title={lesson?.name || 'Vídeo'}
                />
              )}

              {/* iframe Fallback */}
              {playerMode === 'iframe' && (
                <div style={{ paddingTop: '56.25%', position: 'relative' }}>
                  <iframe
                    id="video-player"
                    src={`https://drive.google.com/file/d/${fileId}/preview`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay"
                    allowFullScreen
                    title={lesson?.name || 'Vídeo'}
                  />
                  <div className="absolute top-2 right-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span className="text-xs text-yellow-300">Player do Drive — pode não funcionar para arquivos grandes</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {playerMode === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertTriangle className="w-10 h-10 text-yellow-400" />
                  <p className="text-white font-semibold">Não foi possível reproduzir</p>
                  <p className="text-gray-400 text-sm max-w-sm">Tente baixar o vídeo ou abrí-lo no Google Drive.</p>
                </div>
              )}
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

              <div className="flex items-center gap-3">
                {isCached && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                      <HardDrive className="w-3.5 h-3.5" /> Em cache
                    </span>
                    <button
                      onClick={handleDeleteCache}
                      title="Remover do cache"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <a
                  href={driveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <Download className="w-4 h-4" /> Baixar
                </a>
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
