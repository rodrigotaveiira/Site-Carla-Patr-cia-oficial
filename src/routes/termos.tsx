import { createFileRoute } from '@tanstack/react-router'
import { canonicalHead } from '@/lib/seo'

export const Route = createFileRoute('/termos')({
  head: canonicalHead('/termos'),
  component: TermosPage,
})

function TermosPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', lineHeight: 1.7 }}>
      <h1>Termos de Uso</h1>
      <p><em>Rascunho — este texto ainda precisa ser revisado por um profissional antes de valer oficialmente.</em></p>

      <h2>Sobre a plataforma</h2>
      <p>Esta plataforma oferece cursos, materiais e correção de redações voltados à preparação para vestibulares e concursos, sob responsabilidade da professora Carla Patrícia Medina.</p>

      <h2>Cadastro e conta</h2>
      <p>Ao criar uma conta, você se compromete a fornecer informações verdadeiras e manter sua senha em sigilo. O acesso é pessoal e intransferível.</p>

      <h2>Uso do conteúdo</h2>
      <p>Os materiais, vídeos e correções disponibilizados são de uso exclusivo do aluno matriculado, sendo proibida a reprodução, redistribuição ou revenda sem autorização.</p>

      <h2>Cancelamento</h2>
      <p>O aluno pode solicitar o cancelamento da matrícula a qualquer momento, entrando em contato pelo e-mail informado na página inicial.</p>

      <h2>Alterações</h2>
      <p>Estes termos podem ser atualizados periodicamente, com aviso na própria plataforma.</p>
    </div>
  )
}