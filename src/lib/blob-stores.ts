// Nomes dos stores do Netlify Blobs, num lugar só.
//
// A função agendada em netlify/functions/ não passa pelo TanStack Start e por
// isso não consegue importar as server functions — ela lê os Blobs direto. Sem
// esta lista compartilhada, o nome do store ficaria escrito em dois lugares, e
// um erro de digitação não daria erro nenhum: `getStore` com nome errado
// devolve um store vazio, e o lembrete simplesmente nunca sairia.
export const STORES = {
  mentorias: 'mentorias-slots',
  mentoriasGrupo: 'mentorias-grupo-slots',
  eventosCalendario: 'calendar-events',
  lembretesMentoria: 'mentoria-reminders',
} as const
