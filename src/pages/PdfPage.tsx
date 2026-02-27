import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CourseLesson } from '../types'
import { getPdfProgress, savePdfProgress, markPdfCompleted } from '../services/progressService'
import Navbar from '../components/Navbar'
import NotesPanel from '../components/NotesPanel'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  CheckCircle2, StickyNote, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, ExternalLink, Loader2
} from 'lucide-react'

// pdfjs-dist v3.x uses .js (not .mjs — that's only v4+)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`


export default function PdfPage() {
  const { folderId, fileId } = useParams<{ folderId: string; fileId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const lesson: CourseLesson | undefined = location.state?.lesson
  const courseData = location.state?.courseData
  const module = location.state?.module
  const topic = location.state?.topic

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [completed, setCompleted] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [pdfError, setPdfError] = useState('')

  // Construct the proxied PDF URL using Drive API with the user's token
  const pdfUrl = fileId
    ? {
        url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        httpHeaders: { Authorization: `Bearer ${user?.token}` },
        withCredentials: false,
      }
    : null

  useEffect(() => {
    if (!user || !fileId) return
    const prog = getPdfProgress(user.email, fileId)
    if (prog) {
      setCurrentPage(prog.currentPage || 1)
      setCompleted(prog.completed)
    }
  }, [user, fileId])

  const savePage = useCallback(
    (page: number) => {
      if (!user || !fileId) return
      savePdfProgress(user.email, fileId, {
        currentPage: page,
        totalPages: numPages,
        completed: page >= numPages,
      })
      if (page >= numPages && numPages > 0) {
        markPdfCompleted(user.email, fileId)
        setCompleted(true)
      }
    },
    [user, fileId, numPages],
  )

  function onDocumentLoadSuccess({ numPages: np }: { numPages: number }) {
    setNumPages(np)
    savePdfProgress(user!.email, fileId!, { totalPages: np })
  }

  function goToPage(page: number) {
    const p = Math.max(1, Math.min(page, numPages))
    setCurrentPage(p)
    savePage(p)
  }

  function handleToggleComplete() {
    if (!user || !fileId) return
    if (completed) {
      savePdfProgress(user.email, fileId, { completed: false })
      setCompleted(false)
    } else {
      markPdfCompleted(user.email, fileId)
      setCompleted(true)
    }
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
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-pdf">PDF</span>
              {completed && <span className="badge-done flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</span>}
            </div>
            {topic?.name && (
              <p className="text-sm text-brand-400 font-medium mb-1">{topic.name}</p>
            )}
            <h1 className="text-2xl font-bold text-white">{lesson?.name || 'Apostila'}</h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="glass rounded-xl flex items-center gap-1 p-1">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="btn-ghost p-2 rounded-lg">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400 w-14 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="btn-ghost p-2 rounded-lg">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              id="pdf-mark-complete-btn"
              onClick={handleToggleComplete}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                ${completed
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                  : 'btn-primary'}`}
              title={completed ? 'Clique para desmarcar' : 'Marcar como concluído'}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completed ? 'Concluído ✓' : 'Marcar Concluído'}
            </button>

            <button
              onClick={() => setShowNotes(p => !p)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${showNotes ? 'bg-brand-600/30 border border-brand-500/30 text-brand-400' : 'glass glass-hover text-gray-400'}`}
            >
              <StickyNote className="w-4 h-4" /> Anotações
            </button>

            <a
              href={`https://drive.google.com/file/d/${fileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* PDF Viewer */}
          <div className="flex-1 min-w-0">
            <div className="glass rounded-2xl p-4 animate-slide-up">
              {pdfError && (
                <div className="text-center py-16 text-red-400">
                  <p className="mb-2">Não foi possível carregar o PDF.</p>
                  <p className="text-sm text-gray-500">{pdfError}</p>
                  <a
                    href={`https://drive.google.com/file/d/${fileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2 mt-4"
                  >
                    <ExternalLink className="w-4 h-4" /> Abrir no Google Drive
                  </a>
                </div>
              )}

              {!pdfError && pdfUrl && (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => setPdfError(err.message)}
                  loading={
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                      <p className="text-gray-400">Carregando PDF...</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    loading={
                      <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                      </div>
                    }
                  />
                </Document>
              )}
            </div>

            {/* Page Navigation */}
            {numPages > 0 && (
              <div className="flex items-center justify-center gap-4 mt-4 glass rounded-2xl p-3 animate-fade-in">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="btn-ghost disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={currentPage}
                    onChange={e => goToPage(Number(e.target.value))}
                    min={1}
                    max={numPages}
                    className="w-16 text-center bg-surface-700 rounded-lg px-2 py-1 text-white text-sm border border-white/10 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-gray-500 text-sm">de {numPages}</span>
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= numPages}
                  className="btn-ghost disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Progress bar */}
            {numPages > 0 && (
              <div className="mt-3 progress-bar">
                <div className="progress-fill" style={{ width: `${(currentPage / numPages) * 100}%` }} />
              </div>
            )}
          </div>

          {/* Notes */}
          {showNotes && user && (
            <div className="w-80 flex-shrink-0 animate-fade-in">
              <NotesPanel userId={user.email} context={`pdf:${fileId}`} title="Anotações desta apostila" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
