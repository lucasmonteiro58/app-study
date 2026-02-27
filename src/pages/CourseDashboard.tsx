import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CourseModule } from '../types'
import { buildCourseStructure } from '../services/driveService'
import { calculateModuleProgress, calculateCourseProgress } from '../services/progressService'
import Navbar from '../components/Navbar'
import ProgressRing from '../components/ProgressRing'
import ModuleCard from '../components/ModuleCard'
import { Loader2, RefreshCw } from 'lucide-react'

interface CourseData {
  name: string
  modules: CourseModule[]
}

export default function CourseDashboard() {
  const { folderId } = useParams<{ folderId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!folderId || !user) return

    const cached = localStorage.getItem(`ds:course:${folderId}`)
    if (cached) {
      setCourseData(JSON.parse(cached))
      setLoading(false)
      return
    }

    buildCourseStructure(folderId, user.token)
      .then(data => {
        localStorage.setItem(`ds:course:${folderId}`, JSON.stringify(data))
        setCourseData(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [folderId, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 bg-mesh">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
          <p className="text-gray-400">Estruturando o curso...</p>
        </div>
      </div>
    )
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-surface-900 bg-mesh">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <p className="text-red-400">{error || 'Não foi possível carregar o curso.'}</p>
          <button className="btn-secondary" onClick={() => navigate('/')}>Voltar ao início</button>
        </div>
      </div>
    )
  }

  const courseProgress = calculateCourseProgress(courseData.modules, user!.email)
  const totalLessons = courseData.modules.reduce((acc, m) => {
    const p = calculateModuleProgress(m, user!.email)
    return acc + p.total
  }, 0)
  const completedLessons = courseData.modules.reduce((acc, m) => {
    const p = calculateModuleProgress(m, user!.email)
    return acc + p.completed
  }, 0)

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh">
      <Navbar breadcrumbs={[courseData.name]} />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        {/* Course Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-10 animate-fade-in">
          <ProgressRing percent={courseProgress.percent} size={120} strokeWidth={10} />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{courseData.name}</h1>
            <p className="text-gray-400 mb-4">
              {completedLessons} de {totalLessons} aulas concluídas •{' '}
              {courseData.modules.length} módulo{courseData.modules.length !== 1 ? 's' : ''}
            </p>
            <div className="progress-bar max-w-sm">
              <div className="progress-fill" style={{ width: `${courseProgress.percent}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{courseProgress.percent}% concluído</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(`ds:course:${folderId}`)
              setLoading(true)
              buildCourseStructure(folderId!, user!.token)
                .then(data => { localStorage.setItem(`ds:course:${folderId}`, JSON.stringify(data)); setCourseData(data) })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false))
            }}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        {/* Modules Grid */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-5">
          Módulos do curso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courseData.modules.map((mod, idx) => {
            const progress = calculateModuleProgress(mod, user!.email)
            return (
              <ModuleCard
                key={mod.id}
                module={mod}
                progress={progress}
                index={idx}
                onClick={() => navigate(`/course/${folderId}/module/${mod.id}`)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
