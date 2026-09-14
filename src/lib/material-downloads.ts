import { getStore } from '@netlify/blobs'

export type MaterialDownloadRecord = {
  materialId: string
  materialTitle: string
  studentEmail: string
  studentName: string
  downloadedAt: string
}

function materialDownloadsStore() {
  return getStore({ name: 'material-downloads', consistency: 'strong' })
}

// Índice "quais materiais este aluno já baixou", no mesmo formato de
// lesson-watch-progress: chave = e-mail, valor = lista de ids.
//
// O log acima guarda um registro por download (é dele que vive a tela de
// evolução dos alunos no admin), mas responder "o que ESTE aluno baixou" por
// ali significaria ler o log inteiro de todo mundo a cada carga do dashboard.
// Este índice troca isso por uma leitura só.
function materialDownloadProgressStore() {
  return getStore({ name: 'material-download-progress', consistency: 'strong' })
}

export async function lerMateriaisBaixados(email: string | undefined): Promise<string[]> {
  if (!email) return []
  try {
    const value = await materialDownloadProgressStore().get(email, { type: 'json' })
    return Array.isArray(value) ? (value as string[]) : []
  } catch (error) {
    console.error('Não foi possível ler os materiais baixados do aluno:', error)
    return []
  }
}

// Registra quando um aluno baixa um material — alimenta o bloco "Materiais"
// da tela de evolução dos alunos no admin (student-evolution.ts). Chamada de
// dentro de getMaterialFile, DEPOIS que o arquivo já foi liberado pro aluno —
// por isso nunca lança: o download em si é o que importa, o registro é só
// estatística, e uma falha aqui não pode impedir o aluno de baixar o material.
export async function logMaterialDownload(record: Omit<MaterialDownloadRecord, 'downloadedAt'>): Promise<void> {
  try {
    const store = materialDownloadsStore()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await store.setJSON(id, { ...record, downloadedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Não foi possível registrar o download do material:', error)
  }

  // Índice por aluno, em try separado: se um dos dois falhar, o outro ainda
  // grava — e nenhum dos dois pode atrapalhar o download em si.
  try {
    if (!record.studentEmail) return
    const store = materialDownloadProgressStore()
    const atual = (await store.get(record.studentEmail, { type: 'json' })) as string[] | null
    const baixados = new Set(Array.isArray(atual) ? atual : [])
    if (baixados.has(record.materialId)) return
    baixados.add(record.materialId)
    await store.setJSON(record.studentEmail, Array.from(baixados))
  } catch (error) {
    console.error('Não foi possível atualizar os materiais baixados do aluno:', error)
  }
}
