import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/lgpd')({
  head: pageHead({
    path: '/lgpd',
    title: 'LGPD — Seus direitos sobre os dados | Carla Patrícia Medina',
    description:
      'Seus direitos sobre os dados pessoais na plataforma da Carla Patrícia Medina, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
  }),
  component: LgpdPage,
})

function LgpdPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', lineHeight: 1.7 }}>
      <h1>LGPD — Seus Direitos</h1>
      <p><em>Rascunho — este texto ainda precisa ser revisado por um profissional antes de valer oficialmente.</em></p>

      <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantimos aos alunos os seguintes direitos sobre seus dados pessoais:</p>

      <ul>
        <li>Confirmar se tratamos seus dados e acessá-los;</li>
        <li>Corrigir dados incompletos, incorretos ou desatualizados;</li>
        <li>Solicitar a exclusão dos seus dados, quando aplicável;</li>
        <li>Revogar o consentimento dado no cadastro, a qualquer momento.</li>
      </ul>

      <p>Para exercer qualquer um desses direitos, entre em contato pelo e-mail informado na página inicial.</p>

      <p>Veja também nossa <a href="/privacidade">Política de Privacidade</a> e os <a href="/termos">Termos de Uso</a>.</p>
    </div>
  )
}