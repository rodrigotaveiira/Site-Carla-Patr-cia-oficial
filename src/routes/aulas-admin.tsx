import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, FolderPlus, Pencil, Trash2, Video, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { readLocalUser } from '@/lib/identity-context'
import { getServerUser } from '@/lib/auth'
import { userHasRole } from '@/lib/roles'
import {
  addLesson, createLessonModule, deleteLesson, deleteLessonModule, listLessonModules, listLessons,
  moveLessonModule, renameLessonModule, updateLesson, type Lesson, type LessonModule,
} from '@/lib/aulas'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/aulas-admin')({
  beforeLoad: async () => {
    if (typeof window !== 'undefined') {
      const localUser = readLocalUser()
      if (localUser && userHasRole(localUser, 'admin')) return { user: localUser }
    }

    const user = await getServerUser()
    if (!user) throw redirect({ to: '/login' })
    if (!userHasRole(user, 'admin')) throw redirect({ to: '/dashboard' })
    return { user }
  },
  component: AulasAdminPage,
})

const NO_MODULE_LABEL = 'Sem módulo'

function AulasAdminPage() {
  const showToast = useToast()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [modules, setModules] = useState<LessonModule[]>([])
  const [loading, setLoading] = useState(true)

  // Formulário de aula: o mesmo formulário serve pra adicionar e pra editar —
  // `editingId` diz qual dos dois modos está ativo.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Gerenciar módulos: novo módulo + renomear módulo existente.
  const [newModuleName, setNewModuleName] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [lessonsList, modulesList] = await Promise.all([listLessons(), listLessonModules()])
      setLessons(lessonsList)
      setModules(modulesList)
      if (!moduleName && modulesList.length > 0) setModuleName(modulesList[0]!.name)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setModuleName(modules[0]?.name ?? '')
    setDescription('')
    setVideoUrl('')
    setError('')
  }

  function startEdit(lesson: Lesson) {
    setEditingId(lesson.id)
    setTitle(lesson.title)
    setModuleName(lesson.module)
    setDescription(lesson.description)
    setVideoUrl(lesson.videoUrl)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editingId) {
        await updateLesson({ data: { id: editingId, title, module: moduleName, description, videoUrl } })
        showToast('Aula atualizada.')
      } else {
        await addLesson({ data: { title, module: moduleName, description, videoUrl } })
        showToast('Aula adicionada.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a aula.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta aula?')) return
    try {
      await deleteLesson({ data: { id } })
      if (editingId === id) resetForm()
      await load()
      showToast('Aula excluída.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir a aula.', 'error')
    }
  }

  async function handleMoveToModule(lesson: Lesson, newModule: string) {
    if (newModule === lesson.module) return
    try {
      await updateLesson({ data: { id: lesson.id, title: lesson.title, module: newModule, description: lesson.description, videoUrl: lesson.videoUrl } })
      await load()
      showToast(`"${lesson.title}" movida pra ${newModule}.`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível mover a aula.', 'error')
    }
  }

  async function handleAddModule(event: FormEvent) {
    event.preventDefault()
    if (!newModuleName.trim()) return
    setAddingModule(true)
    try {
      const created = await createLessonModule({ data: { name: newModuleName.trim() } })
      setNewModuleName('')
      if (!editingId && lessons.length === 0) setModuleName(created.name)
      await load()
      showToast('Módulo criado.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível criar o módulo.', 'error')
    } finally {
      setAddingModule(false)
    }
  }

  function startRename(module: LessonModule) {
    setRenamingId(module.id)
    setRenameValue(module.name)
  }

  async function handleRename(module: LessonModule) {
    const name = renameValue.trim()
    if (!name || name === module.name) { setRenamingId(null); return }
    try {
      await renameLessonModule({ data: { id: module.id, name } })
      setRenamingId(null)
      await load()
      showToast('Módulo renomeado.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível renomear o módulo.', 'error')
    }
  }

  async function handleMoveModule(module: LessonModule, direction: 'up' | 'down') {
    try {
      const updated = await moveLessonModule({ data: { id: module.id, direction } })
      setModules(updated)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível reordenar.', 'error')
    }
  }

  async function handleDeleteModule(module: LessonModule) {
    if (!confirm(`Excluir o módulo "${module.name}"?`)) return
    try {
      await deleteLessonModule({ data: { id: module.id } })
      await load()
      showToast('Módulo excluído.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir o módulo.', 'error')
    }
  }

  const lessonCountByModule = new Map<string, number>()
  for (const lesson of lessons) {
    lessonCountByModule.set(lesson.module, (lessonCountByModule.get(lesson.module) ?? 0) + 1)
  }

  // Agrupa as aulas cadastradas na mesma ordem dos módulos gerenciados; aulas
  // cujo texto de módulo não bate com nenhum módulo cadastrado (aulas antigas,
  // ou digitadas antes de existir essa lista) caem num grupo "Sem módulo" no fim.
  const knownModuleNames = new Set(modules.map((m) => m.name))
  const groups: { label: string; lessons: Lesson[] }[] = modules.map((m) => ({
    label: m.name,
    lessons: lessons.filter((l) => l.module === m.name),
  }))
  const orphanLessons = lessons.filter((l) => !knownModuleNames.has(l.module))
  if (orphanLessons.length > 0) groups.push({ label: NO_MODULE_LABEL, lessons: orphanLessons })

  return (
    <main className="panel">
      <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
      <h1><Video /> Aulas em vídeo</h1>
      <p className="panel-subtitle">
        Cadastre suas aulas aqui. Como os vídeos são arquivos grandes, o recomendado é subir o vídeo primeiro no
        YouTube (como "não listado", pra não aparecer em buscas) ou no Vimeo, e colar o link aqui — a plataforma
        mostra o vídeo embutido para o aluno, sem precisar sair do site.
      </p>

      <section>
        <h2 className="panel-section-title">Módulos</h2>
        <p className="panel-section-hint">Agrupe as aulas por conteúdo. A ordem daqui é a mesma que o aluno vê em "Aulas".</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {modules.map((module, index) => (
            <div key={module.id} className="list-row">
              {renamingId === module.id ? (
                <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleRename(module) }}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => void handleRename(module)} className="btn btn-primary btn-sm">Salvar</button>
                  <button onClick={() => setRenamingId(null)} className="btn btn-ghost btn-sm"><X size={15} /></button>
                </div>
              ) : (
                <>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ color: 'var(--navy)' }}>{module.name}</b>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                      {lessonCountByModule.get(module.name) ?? 0} aula(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => void handleMoveModule(module, 'up')} disabled={index === 0} className="icon-btn" aria-label="Mover pra cima" title="Mover pra cima">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => void handleMoveModule(module, 'down')} disabled={index === modules.length - 1} className="icon-btn" aria-label="Mover pra baixo" title="Mover pra baixo">
                      <ChevronDown size={16} />
                    </button>
                    <button onClick={() => startRename(module)} className="icon-btn" aria-label="Renomear" title="Renomear">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => void handleDeleteModule(module)}
                      className="icon-btn"
                      aria-label="Excluir módulo"
                      title={(lessonCountByModule.get(module.name) ?? 0) > 0 ? 'Mova as aulas pra outro módulo antes de excluir' : 'Excluir módulo'}
                      disabled={(lessonCountByModule.get(module.name) ?? 0) > 0}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {modules.length === 0 && !loading && <p className="empty-state">Nenhum módulo cadastrado ainda.</p>}
        </div>

        <form onSubmit={handleAddModule} style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 420 }}>
          <input
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            placeholder="Nome do novo módulo, ex.: Redação · Argumentação"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={addingModule || !newModuleName.trim()} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
            <FolderPlus size={15} /> Criar módulo
          </button>
        </form>
      </section>

      <form onSubmit={handleSubmit} className="panel-card" style={{ maxWidth: 480, marginTop: 28 }}>
        <b style={{ color: 'var(--navy)' }}>{editingId ? 'Editar aula' : 'Nova aula'}</b>
        <div className="field">
          <label>Título da aula</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Módulo</label>
          {modules.length > 0 ? (
            <select value={moduleName} onChange={(e) => setModuleName(e.target.value)}>
              {modules.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          ) : (
            <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Crie um módulo acima primeiro" />
          )}
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="field">
          <label>Link do vídeo (YouTube, Vimeo ou link direto)</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: 'fit-content' }}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar aula'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn btn-ghost" style={{ width: 'fit-content' }}>Cancelar</button>
          )}
        </div>
        {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      <section>
        <h2 className="panel-section-title">Aulas cadastradas</h2>
        {loading && <p className="panel-subtitle">Carregando...</p>}
        {!loading && lessons.length === 0 && <p className="empty-state">Nenhuma aula cadastrada ainda.</p>}
        <div style={{ display: 'grid', gap: 24, marginTop: 12 }}>
          {groups.filter((group) => group.lessons.length > 0).map((group) => (
            <div key={group.label}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: group.label === NO_MODULE_LABEL ? '#a16207' : 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {group.label}
              </h3>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {group.lessons.map((lesson) => (
                  <div key={lesson.id} className="list-row">
                    <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
                      <b style={{ color: 'var(--navy)' }}>{lesson.title}</b>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {modules.length > 0 && (
                        <select
                          value={lesson.module}
                          onChange={(e) => void handleMoveToModule(lesson, e.target.value)}
                          className="lesson-move-select"
                          aria-label={`Mover "${lesson.title}" pra outro módulo`}
                          title="Mover pra outro módulo"
                        >
                          {!knownModuleNames.has(lesson.module) && <option value={lesson.module}>{lesson.module}</option>}
                          {modules.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                      )}
                      <button onClick={() => startEdit(lesson)} className="btn btn-ghost btn-sm"><Pencil size={14} /> Editar</button>
                      <button onClick={() => handleDelete(lesson.id)} className="btn btn-danger btn-sm">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
