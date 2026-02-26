import { useState, useEffect } from 'react'
import { getNotes, saveNote, deleteNote, LessonNote } from '../services/progressService'
import { StickyNote, Plus, Trash2, Save, X } from 'lucide-react'

interface NotesPanelProps {
  userId: string
  context: string
  title?: string
}

export default function NotesPanel({ userId, context, title = 'Anotações' }: NotesPanelProps) {
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    setNotes(getNotes(userId, context))
  }, [userId, context])

  function handleAdd() {
    if (!draft.trim()) return
    const note = saveNote(userId, context, draft.trim())
    setNotes(getNotes(userId, context))
    setDraft('')
  }

  function handleEdit(note: LessonNote) {
    setEditing(note.id)
    setEditDraft(note.content)
  }

  function handleSaveEdit() {
    if (!editing || !editDraft.trim()) return
    saveNote(userId, context, editDraft.trim(), editing)
    setNotes(getNotes(userId, context))
    setEditing(null)
    setEditDraft('')
  }

  function handleDelete(id: string) {
    deleteNote(userId, context, id)
    setNotes(getNotes(userId, context))
  }

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(ts))
  }

  return (
    <div className="card h-full flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-brand-400" />
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>

      {/* Add new note */}
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAdd() }}
          placeholder="Nova anotação... (Ctrl+Enter para salvar)"
          rows={3}
          className="input-field resize-none text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="btn-primary flex items-center justify-center gap-2 text-sm py-2"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin max-h-96">
        {notes.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">
            Nenhuma anotação ainda.
          </p>
        )}
        {notes.map(note => (
          <div key={note.id} className="glass rounded-xl p-3 group">
            {editing === note.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  rows={3}
                  className="input-field resize-none text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
                    <Save className="w-3.5 h-3.5" /> Salvar
                  </button>
                  <button onClick={() => setEditing(null)} className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">{note.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">{formatDate(note.updatedAt)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(note)}
                      className="p-1 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
