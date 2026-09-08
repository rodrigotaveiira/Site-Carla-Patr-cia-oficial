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
}
