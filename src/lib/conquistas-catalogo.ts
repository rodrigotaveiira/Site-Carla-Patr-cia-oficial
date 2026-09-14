// Catálogo das conquistas da área "Minhas Conquistas".
//
// Este arquivo é de propósito "puro": sem React, sem Netlify, sem servidor. Ele
// roda igual no navegador (pra desenhar os selos) e no servidor (pra decidir o
// que está desbloqueado), e é aqui que entram medalhas novas no futuro —
// acrescentar um item nesta lista já faz a conquista aparecer bloqueada na
// coleção; só a regra de desbloqueio precisa ser escrita em conquistas.ts.

export type Raridade = 'comum' | 'bronze' | 'prata' | 'ouro' | 'diamante' | 'lendaria'

// Três sistemas rodando ao mesmo tempo: a meta da semana (reinicia toda
// segunda), a sequência de dias seguidos (nunca reinicia sozinha) e a coleção
// de conquistas especiais (cada uma com sua própria regra).
export type GrupoConquista = 'semana' | 'sequencia' | 'especial'

// Nome do desenho do selo. O componente ConquistaBadge traduz para um ícone
// Lucide — a lista fica em português pra o catálogo não depender da biblioteca.
export type IconeConquista =
  | 'chama' | 'trofeu' | 'alvo' | 'medalha' | 'coroa' | 'diamante' | 'estrela'
  | 'livro' | 'mira' | 'calendario' | 'ampulheta' | 'cerebro' | 'subindo'
  | 'camadas' | 'escudo' | 'selo' | 'faisca' | 'louros'

export type Conquista = {
  id: string
  nome: string
  // Frase de parabéns, mostrada no desbloqueio e no selo já conquistado.
  mensagem: string
  // O que falta fazer — é o que aparece enquanto o selo está bloqueado.
  requisito: string
  raridade: Raridade
  grupo: GrupoConquista
  icone: IconeConquista
  // Misteriosa: o aluno vê "Conquista misteriosa" no lugar do nome e do prêmio
  // até desbloquear. Serve pra criar curiosidade, então use com parcimônia —
  // as metas do dia a dia precisam continuar visíveis pra puxar o aluno.
  misteriosa?: boolean
  // Só para 'semana' (1 a 5 dias na semana atual) e 'sequencia' (dias seguidos).
  dias?: number
}

export const RARIDADES: Record<Raridade, { nome: string; ordem: number }> = {
  comum: { nome: 'Comum', ordem: 0 },
  bronze: { nome: 'Bronze', ordem: 1 },
  prata: { nome: 'Prata', ordem: 2 },
  ouro: { nome: 'Ouro', ordem: 3 },
  diamante: { nome: 'Diamante', ordem: 4 },
  lendaria: { nome: 'Lendária', ordem: 5 },
}

// Jornada da semana: 5 dias de estudo, uma recompensa por dia. Reinicia toda
// segunda-feira junto com a meta semanal (ver weekly-activity.ts).
export const JORNADA_SEMANAL: Conquista[] = [
  {
    id: 'semana-1',
    nome: 'Primeiro Passo',
    mensagem: 'Sua jornada começou. Continue construindo sua semana.',
    requisito: 'Estude 1 dia nesta semana.',
    raridade: 'comum',
    grupo: 'semana',
    icone: 'chama',
    dias: 1,
  },
  {
    id: 'semana-2',
    nome: 'Troféu Bronze',
    mensagem: 'Dois dias concluídos. Sua consistência já começou a aparecer.',
    requisito: 'Estude 2 dias nesta semana.',
    raridade: 'bronze',
    grupo: 'semana',
    icone: 'trofeu',
    dias: 2,
  },
  {
    id: 'semana-3',
    nome: 'Selo de Foco',
    mensagem: 'Você chegou à metade da jornada. Mantenha o ritmo.',
    requisito: 'Estude 3 dias nesta semana.',
    raridade: 'bronze',
    grupo: 'semana',
    icone: 'selo',
    dias: 3,
  },
  {
    id: 'semana-4',
    nome: 'Troféu Prata',
    mensagem: 'Você está a apenas 1 dia de concluir sua meta.',
    requisito: 'Estude 4 dias nesta semana.',
    raridade: 'prata',
    grupo: 'semana',
    icone: 'trofeu',
    dias: 4,
  },
  {
    id: 'semana-5',
    nome: 'Troféu Ouro',
    mensagem: 'Meta concluída. Você venceu sua semana de estudos!',
    requisito: 'Estude 5 dias nesta semana.',
    raridade: 'ouro',
    grupo: 'semana',
    icone: 'trofeu',
    dias: 5,
  },
]

// Sequência de dias seguidos. Ao contrário da jornada semanal, estas não
// reiniciam: é a camada que segura o aluno depois que ele bate os 5 dias.
export const SEQUENCIAS: Conquista[] = [
  {
    id: 'sequencia-5',
    nome: 'Semana de Ouro',
    mensagem: 'Cinco dias seguidos. Uma semana inteira construída por você.',
    requisito: 'Estude 5 dias seguidos.',
    raridade: 'ouro',
    grupo: 'sequencia',
    icone: 'medalha',
    dias: 5,
  },
  {
    id: 'sequencia-7',
    nome: 'Diamante da Constância',
    mensagem: 'Sete dias sem falhar. Constância é o que separa quem passa de quem quase passa.',
    requisito: 'Estude 7 dias seguidos.',
    raridade: 'diamante',
    grupo: 'sequencia',
    icone: 'diamante',
    dias: 7,
  },
  {
    id: 'sequencia-10',
    nome: 'Guardião do Ritmo',
    mensagem: 'Dez dias seguidos. O ritmo agora é seu — proteja ele.',
    requisito: 'Estude 10 dias seguidos.',
    raridade: 'diamante',
    grupo: 'sequencia',
    icone: 'escudo',
    dias: 10,
  },
  {
    id: 'sequencia-15',
    nome: 'Aluno em Ascensão',
    mensagem: 'Quinze dias seguidos. Sua evolução já aparece na sua rotina.',
    requisito: 'Estude 15 dias seguidos.',
    raridade: 'diamante',
    grupo: 'sequencia',
    icone: 'subindo',
    dias: 15,
  },
  {
    id: 'sequencia-20',
    nome: 'Mestre da Consistência',
    mensagem: 'Vinte dias seguidos. Estudar virou hábito, não esforço.',
    requisito: 'Estude 20 dias seguidos.',
    raridade: 'diamante',
    grupo: 'sequencia',
    icone: 'estrela',
    dias: 20,
  },
  {
    id: 'sequencia-30',
    nome: 'Lenda dos Estudos',
    mensagem: 'Trinta dias seguidos. Um mês inteiro de disciplina.',
    requisito: 'Estude 30 dias seguidos.',
    raridade: 'lendaria',
    grupo: 'sequencia',
    icone: 'louros',
    dias: 30,
  },
  {
    id: 'sequencia-50',
    nome: 'Elite Acadêmica',
    mensagem: 'Cinquenta dias seguidos. Pouquíssimos alunos chegam até aqui.',
    requisito: 'Continue sua sequência para descobrir.',
    raridade: 'lendaria',
    grupo: 'sequencia',
    icone: 'coroa',
    misteriosa: true,
    dias: 50,
  },
  {
    id: 'sequencia-100',
    nome: 'Conquista Suprema',
    mensagem: 'Cem dias seguidos. Isso não é sorte, é construção.',
    requisito: 'Continue sua sequência para descobrir.',
    raridade: 'lendaria',
    grupo: 'sequencia',
    icone: 'coroa',
    misteriosa: true,
    dias: 100,
  },
]

// Conquistas especiais: dependem do que o aluno faz na plataforma, não de
// quantos dias ele entrou. São elas que dão o que buscar quando a sequência
// já está alta.
export const ESPECIAIS: Conquista[] = [
  {
    id: 'especial-aulas-5',
    nome: 'Explorador do Conhecimento',
    mensagem: 'Cinco aulas concluídas. Você já conhece o caminho.',
    requisito: 'Conclua 5 aulas.',
    raridade: 'bronze',
    grupo: 'especial',
    icone: 'livro',
  },
  {
    id: 'especial-questoes-100',
    nome: 'Mestre da Prática',
    mensagem: 'Cem questões resolvidas. Prática é o que fixa o conteúdo.',
    requisito: 'Resolva 100 questões.',
    raridade: 'prata',
    grupo: 'especial',
    icone: 'alvo',
  },
  {
    id: 'especial-precisao',
    nome: 'Precisão',
    mensagem: '90% ou mais em uma atividade. Isso é domínio do conteúdo.',
    requisito: 'Alcance 90% ou mais em uma atividade.',
    raridade: 'ouro',
    grupo: 'especial',
    icone: 'mira',
  },
  {
    id: 'especial-revisao',
    nome: 'Revisão em Dia',
    mensagem: 'Revisão concluída. Revisar é o que transforma estudo em memória.',
    requisito: 'Refaça uma atividade que você já tinha entregue.',
    raridade: 'bronze',
    grupo: 'especial',
    icone: 'calendario',
  },
  {
    id: 'especial-semana-perfeita',
    nome: 'Semana Perfeita',
    mensagem: 'Os sete dias da semana, sem falhar em nenhum.',
    requisito: 'Estude todos os 7 dias de uma mesma semana.',
    raridade: 'ouro',
    grupo: 'especial',
    icone: 'faisca',
  },
  {
    id: 'especial-ultimo-esforco',
    nome: 'Último Esforço',
    mensagem: 'Meta batida no último dia. Você não deixou a semana escapar.',
    requisito: 'Continue estudando para descobrir.',
    raridade: 'prata',
    grupo: 'especial',
    icone: 'ampulheta',
    misteriosa: true,
  },
  {
    id: 'especial-memoria',
    nome: 'Memória de Aço',
    mensagem: '100% ao refazer uma atividade. O conteúdo ficou.',
    requisito: 'Continue estudando para descobrir.',
    raridade: 'diamante',
    grupo: 'especial',
    icone: 'cerebro',
    misteriosa: true,
  },
  {
    id: 'especial-evolucao',
    nome: 'Em Evolução',
    mensagem: 'Você superou o seu próprio resultado anterior.',
    requisito: 'Supere a sua nota da atividade anterior.',
    raridade: 'prata',
    grupo: 'especial',
    icone: 'subindo',
  },
  {
    id: 'especial-imparavel',
    nome: 'Imparável',
    mensagem: 'Duas semanas seguidas de estudo. Nada te parou.',
    requisito: 'Chegue a 14 dias seguidos de estudo.',
    raridade: 'diamante',
    grupo: 'especial',
    icone: 'chama',
  },
  {
    id: 'especial-modulo',
    nome: 'Módulo Concluído',
    mensagem: 'Um módulo inteiro finalizado. Etapa vencida.',
    requisito: 'Assista a todas as aulas de um módulo.',
    raridade: 'ouro',
    grupo: 'especial',
    icone: 'camadas',
  },
]

export const CONQUISTAS: Conquista[] = [...JORNADA_SEMANAL, ...SEQUENCIAS, ...ESPECIAIS]

const POR_ID = new Map(CONQUISTAS.map((conquista) => [conquista.id, conquista]))

export function conquistaPorId(id: string): Conquista | undefined {
  return POR_ID.get(id)
}

// O que mostrar num selo bloqueado e misterioso: nem o nome nem o prêmio,
// só o convite pra continuar.
export const CONQUISTA_MISTERIOSA = {
  nome: 'Conquista misteriosa',
  requisito: 'Continue estudando para descobrir.',
} as const
