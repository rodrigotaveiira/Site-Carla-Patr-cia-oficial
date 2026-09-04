import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/privacidade')({
  head: pageHead({
    path: '/privacidade',
    title: 'Política de Privacidade | Carla Patrícia Medina',
    description:
      'Quais dados a plataforma da Carla Patrícia Medina coleta, como são usados, por quanto tempo ficam guardados e quais são os seus direitos.',
  }),
  component: PrivacidadePage,
})

function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', lineHeight: 1.7 }}>
      <h1>Política de Privacidade</h1>
      <p><em>Rascunho — este texto ainda precisa ser revisado por um profissional antes de valer oficialmente.</em></p>

      <h2>Quais dados coletamos</h2>
      <p>Ao criar uma conta na plataforma, coletamos nome, e-mail, CPF e senha, usados exclusivamente para identificar o aluno e permitir acesso ao conteúdo do curso.</p>

      <h2>Como usamos seus dados</h2>
      <p>Seus dados são usados para gerenciar sua matrícula, corrigir suas redações e enviar comunicações sobre o curso. Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing.</p>

      <h2>Por quanto tempo guardamos</h2>
      <p>Mantemos seus dados enquanto sua conta estiver ativa. Você pode solicitar a exclusão a qualquer momento pelo contato abaixo.</p>

      <h2>Seus direitos (LGPD)</h2>
      <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento, entrando em contato pelo e-mail informado na página inicial.</p>
    </div>
  )
}