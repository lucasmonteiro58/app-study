import { CourseModule } from '../types'
import { ModuleProgress } from '../types'
import { Play, FileText, ChevronRight, CheckCircle2 } from 'lucide-react'

interface ModuleCardProps {
  module: CourseModule
  progress: ModuleProgress
  index: number
  onClick: () => void
}

export default function ModuleCard({ module, progress, index, onClick }: ModuleCardProps) {
  const videoCount = countByType(module, 'video')
  const pdfCount = countByType(module, 'pdf')

  const hue = (index * 37) % 360
  const isComplete = progress.percent >= 100

  return (
    <button
      id={`module-card-${module.id}`}
      onClick={onClick}
      className="card glass-hover text-left group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 relative overflow-hidden"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-all duration-300 group-hover:h-1"
        style={{ background: `hsl(${hue}, 70%, 55%)` }}
      />

      {/* Icon + name */}
      <div className="flex items-start justify-between mb-4 pt-2">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
          style={{
            background: `hsla(${hue}, 70%, 20%, 0.5)`,
            border: `1px solid hsla(${hue}, 70%, 55%, 0.3)`,
            color: `hsl(${hue}, 70%, 65%)`,
          }}
        >
          {index + 1}
        </div>
        {isComplete && (
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
        )}
      </div>

      <h3 className="font-bold text-white mb-1 pr-2 leading-snug">{module.name}</h3>

      {/* File badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {videoCount > 0 && (
          <span className="badge-video flex items-center gap-1">
            <Play className="w-2.5 h-2.5" /> {videoCount} vídeo{videoCount !== 1 ? 's' : ''}
          </span>
        )}
        {pdfCount > 0 && (
          <span className="badge-pdf flex items-center gap-1">
            <FileText className="w-2.5 h-2.5" /> {pdfCount} PDF{pdfCount !== 1 ? 's' : ''}
          </span>
        )}
        {module.subModules.length > 0 && (
          <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {module.subModules.length} unidade{module.subModules.length !== 1 ? 's' : ''}
          </span>
        )}
        {countTopics(module) > 0 && (
          <span className="badge bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            {countTopics(module)} tópico{countTopics(module) !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="progress-bar mb-1">
        <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{progress.completed}/{progress.total} aulas</span>
        <div className="flex items-center gap-1 text-xs text-gray-500 group-hover:text-brand-400 transition-colors">
          <span>{progress.percent}%</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  )
}

function countByType(mod: CourseModule, type: 'video' | 'pdf'): number {
  let count = mod.lessons.filter(l => l.type === type).length
  for (const sub of mod.subModules) count += countByType(sub, type)
  return count
}

/** Count leaf-level sub-modules (topics that directly contain files) */
function countTopics(mod: CourseModule): number {
  if (mod.subModules.length === 0) return 0
  let count = 0
  for (const sub of mod.subModules) {
    if (sub.subModules.length === 0) count++
    else count += countTopics(sub)
  }
  return count
}
