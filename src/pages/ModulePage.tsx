import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CourseModule, CourseLesson } from '../types'
import { calculateModuleProgress, isLessonCompleted } from '../services/progressService'
import Navbar from '../components/Navbar'
import NotesPanel from '../components/NotesPanel'
import {
  Play, FileText, CheckCircle2, ChevronRight, ChevronDown,
  StickyNote, FolderOpen, Folder, BookOpen,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function findModule(modules: CourseModule[], id: string): CourseModule | null {
  for (const m of modules) {
    if (m.id === id) return m
    const found = findModule(m.subModules, id)
    if (found) return found
  }
  return null
}

/** Collect all leaf lessons across all depths */
function getAllLessons(mod: CourseModule): CourseLesson[] {
  const lessons = [...mod.lessons]
  for (const sub of mod.subModules) lessons.push(...getAllLessons(sub))
  return lessons
}

/** Returns true if module has any sub-modules (i.e. is not a leaf topic) */
function hasSubModules(mod: CourseModule): boolean {
  return mod.subModules.length > 0
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  userId,
  folderId,
  onOpen,
  activeId,
}: {
  lesson: CourseLesson
  userId: string
  folderId: string
  onOpen: (l: CourseLesson) => void
  activeId: string | null
}) {
  const completed = isLessonCompleted(userId, lesson.fileId, lesson.type)
  const isActive = activeId === lesson.id
  return (
    <button
      onClick={() => onOpen(lesson)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group
        ${isActive
          ? 'bg-brand-600/30 border border-brand-500/30 text-white'
          : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
        ${lesson.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
        {lesson.type === 'video' ? <Play className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
      </div>
      <span className="flex-1 text-xs leading-snug truncate">{lesson.name}</span>
      {completed && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
    </button>
  )
}

/** Renders a Topic (depth=2): shows its lessons directly */
function TopicRow({
  topic,
  userId,
  folderId,
  selectedTopicId,
  onSelectTopic,
  activeLesson,
  onOpenLesson,
}: {
  topic: CourseModule
  userId: string
  folderId: string
  selectedTopicId: string | null
  onSelectTopic: (id: string) => void
  activeLesson: string | null
  onOpenLesson: (l: CourseLesson) => void
}) {
  const progress = calculateModuleProgress(topic, userId)
  const isSelected = selectedTopicId === topic.id

  return (
    <div className="mb-1">
      <button
        onClick={() => onSelectTopic(topic.id)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150
          ${isSelected
            ? 'bg-brand-600/20 text-brand-300'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
      >
        {isSelected
          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-brand-400" />
          : <Folder className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="flex-1 text-xs leading-snug truncate">{topic.name}</span>
        <span className="text-[10px] text-gray-600 flex-shrink-0">
          {progress.completed}/{progress.total}
        </span>
      </button>

      {/* If topic has direct lessons and is selected, show them inline */}
      {isSelected && topic.lessons.length > 0 && (
        <div className="ml-4 mt-1 space-y-0.5">
          {topic.lessons.map(l => (
            <LessonRow
              key={l.id} lesson={l} userId={userId}
              folderId={folderId} onOpen={onOpenLesson} activeId={activeLesson}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Renders a Unit (depth=1): collapsible, lists its topic sub-folders */
function UnitSection({
  unit,
  userId,
  folderId,
  selectedTopicId,
  onSelectTopic,
  activeLesson,
  onOpenLesson,
  defaultOpen,
}: {
  unit: CourseModule
  userId: string
  folderId: string
  selectedTopicId: string | null
  onSelectTopic: (id: string) => void
  activeLesson: string | null
  onOpenLesson: (l: CourseLesson) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const progress = calculateModuleProgress(unit, userId)

  // If the unit has no sub-modules (it IS itself a topic), treat it as a topic
  if (!hasSubModules(unit)) {
    return (
      <TopicRow
        topic={unit} userId={userId} folderId={folderId}
        selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic}
        activeLesson={activeLesson} onOpenLesson={onOpenLesson}
      />
    )
  }

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors group"
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
        <span className="flex-1 text-sm font-semibold text-gray-300 truncate">{unit.name}</span>
        <span className="text-[10px] text-gray-600 flex-shrink-0">
          {progress.percent}%
        </span>
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/10 pl-2">
          {/* Direct lessons in this unit */}
          {unit.lessons.map(l => (
            <LessonRow
              key={l.id} lesson={l} userId={userId}
              folderId={folderId} onOpen={onOpenLesson} activeId={activeLesson}
            />
          ))}
          {/* Sub-folders = topics */}
          {unit.subModules.map(topic => (
            <TopicRow
              key={topic.id} topic={topic} userId={userId} folderId={folderId}
              selectedTopicId={selectedTopicId} onSelectTopic={onSelectTopic}
              activeLesson={activeLesson} onOpenLesson={onOpenLesson}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ModulePage() {
  const { folderId, moduleId } = useParams<{ folderId: string; moduleId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courseData, setCourseData] = useState<{ name: string; modules: CourseModule[] } | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const cached = localStorage.getItem(`ds:course:${folderId}`)
    if (cached) setCourseData(JSON.parse(cached))
  }, [folderId])

  const module = useMemo(() => {
    if (!courseData) return null
    return findModule(courseData.modules, moduleId!)
  }, [courseData, moduleId])

  // Auto-select first topic on load
  useEffect(() => {
    if (!module || selectedTopicId) return
    const firstTopic = findFirstTopic(module)
    if (firstTopic) setSelectedTopicId(firstTopic.id)
  }, [module])

  const selectedTopic = useMemo(() => {
    if (!module || !selectedTopicId) return null
    return findModule([module], selectedTopicId)
  }, [module, selectedTopicId])

  const progress = useMemo(
    () => module && user ? calculateModuleProgress(module, user.email) : null,
    [module, user, forceUpdate], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const topicProgress = useMemo(
    () => selectedTopic && user ? calculateModuleProgress(selectedTopic, user.email) : null,
    [selectedTopic, user, forceUpdate], // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (!courseData || !module) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function openLesson(lesson: CourseLesson) {
    setActiveLesson(lesson.id)
    if (lesson.type === 'video') {
      navigate(`/course/${folderId}/watch/${lesson.fileId}`, { state: { lesson, module, topic: selectedTopic, courseData } })
    } else if (lesson.type === 'pdf') {
      navigate(`/course/${folderId}/read/${lesson.fileId}`, { state: { lesson, module, topic: selectedTopic, courseData } })
    }
    setTimeout(() => forceUpdate(n => n + 1), 300)
  }

  // Determine if the module itself is a flat list (no nested folders)
  const isFlatModule = !hasSubModules(module)
  const allLessons = getAllLessons(module)

  // Get the lessons to show in the main panel
  const mainLessons: CourseLesson[] = selectedTopic
    ? getAllLessons(selectedTopic)
    : isFlatModule ? allLessons : []

  return (
    <div className="min-h-screen bg-surface-900 bg-mesh">
      <Navbar breadcrumbs={[courseData.name, module.name]} showBackButton backTo={`/course/${folderId}`} />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16 flex gap-6">

        {/* ── Sidebar ── */}
        <aside className="w-80 flex-shrink-0 animate-fade-in">
          <div className="card sticky top-20 flex flex-col gap-4 overflow-hidden" style={{ maxHeight: 'calc(100vh - 5.5rem)' }}>

            {/* Module header */}
            <div>
              <h2 className="font-bold text-white text-base leading-tight mb-1">{module.name}</h2>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 progress-bar">
                  <div className="progress-fill" style={{ width: `${progress?.percent ?? 0}%` }} />
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">{progress?.percent ?? 0}%</span>
              </div>
              <p className="text-xs text-gray-600">
                {progress?.completed ?? 0} de {progress?.total ?? 0} aulas concluídas
              </p>
            </div>

            {/* Tree */}
            <div className="overflow-y-auto flex-1 scrollbar-thin pr-1">
              {isFlatModule ? (
                /* Flat: just show lessons */
                <div className="space-y-0.5">
                  {module.lessons.map(l => (
                    <LessonRow
                      key={l.id} lesson={l} userId={user!.email}
                      folderId={folderId!} onOpen={openLesson} activeId={activeLesson}
                    />
                  ))}
                </div>
              ) : (
                /* Nested: units → topics */
                <div className="space-y-1">
                  {module.subModules.map((unit, idx) => (
                    <UnitSection
                      key={unit.id}
                      unit={unit}
                      userId={user!.email}
                      folderId={folderId!}
                      selectedTopicId={selectedTopicId}
                      onSelectTopic={setSelectedTopicId}
                      activeLesson={activeLesson}
                      onOpenLesson={openLesson}
                      defaultOpen={idx === 0}
                    />
                  ))}
                  {/* Direct lessons at module level */}
                  {module.lessons.map(l => (
                    <LessonRow
                      key={l.id} lesson={l} userId={user!.email}
                      folderId={folderId!} onOpen={openLesson} activeId={activeLesson}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 animate-slide-up">

          {/* Topic header */}
          <div className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                    {module.name}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white leading-tight mb-3">
                  {selectedTopic ? selectedTopic.name : module.name}
                </h1>

                {topicProgress && (
                  <>
                    <div className="progress-bar max-w-xs mb-1">
                      <div className="progress-fill" style={{ width: `${topicProgress.percent}%` }} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{topicProgress.completed} concluídas</span>
                      <span>•</span>
                      <span>{topicProgress.total} aulas</span>
                      <span>•</span>
                      <span>{topicProgress.percent}%</span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowNotes(p => !p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 transition-all duration-200
                  ${showNotes ? 'bg-brand-600/30 border border-brand-500/30 text-brand-400' : 'glass glass-hover text-gray-400'}`}
              >
                <StickyNote className="w-4 h-4" /> Anotações
              </button>
            </div>
          </div>

          {/* Notes Panel */}
          {showNotes && user && selectedTopic && (
            <div className="mb-6">
              <NotesPanel
                userId={user.email}
                context={`topic:${selectedTopic.id}`}
                title={`Anotações — ${selectedTopic.name}`}
              />
            </div>
          )}

          {/* Files grid */}
          {mainLessons.length === 0 ? (
            <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <FolderOpen className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-500">
                {selectedTopic
                  ? 'Nenhum arquivo neste tópico.'
                  : 'Selecione um tópico na barra lateral para ver os arquivos.'}
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Arquivos do tópico
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {mainLessons.map((lesson, idx) => {
                  const completed = isLessonCompleted(user!.email, lesson.fileId, lesson.type)
                  const isActive = activeLesson === lesson.id
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => openLesson(lesson)}
                      className={`rounded-xl p-4 flex items-center gap-4 text-left transition-all duration-200 hover:-translate-y-0.5 group
                        ${isActive
                          ? 'bg-brand-600/20 border border-brand-500/30'
                          : 'glass glass-hover'}`}
                    >
                      <span className="text-xl font-bold text-gray-700 w-7 text-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${lesson.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                        {lesson.type === 'video' ? <Play className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{lesson.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {lesson.type === 'video' ? '▶ Vídeo' : '📄 PDF / Apostila'}
                        </p>
                      </div>
                      {completed ? (
                        <span className="badge-done flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Concluído
                        </span>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────────

/** Find the first leaf topic (module without sub-modules) */
function findFirstTopic(mod: CourseModule): CourseModule | null {
  if (!hasSubModules(mod)) return mod
  for (const sub of mod.subModules) {
    const found = findFirstTopic(sub)
    if (found) return found
  }
  return null
}
