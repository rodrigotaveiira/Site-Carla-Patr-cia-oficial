import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useIdentity } from '@/lib/identity-context'
import { userHasRole } from '@/lib/roles'

// Botão de voltar das telas de administração.
//
// Anda UM passo atrás no histórico, devolvendo a pessoa exatamente de onde ela
// veio. Antes era um link fixo, e destino fixo mente: quem entrava em Materiais
// vindo de outro lugar era mandado pro painel; e no próprio painel o link
// levava pro dashboard do ALUNO, que é sair da ferramenta inteira em vez de
// voltar um passo.
//
// Sem página anterior — link aberto direto, ou recarregado — não dá pra andar
// pra trás sem jogar a pessoa pra fora do site. Aí o destino é o painel do
// papel dela: `/admin` para admin, `/professor` para a professora, que não tem
// permissão no primeiro.
// `destino` deixa a tela dizer pra onde cair quando nao ha pagina anterior.
// Sem ele vale o painel do papel de quem esta logado (uso das telas de
// administracao); as telas do aluno passam "/dashboard".
export function VoltarAoPainel({ destino }: { destino?: string } = {}) {
  const router = useRouter()
  const { user } = useIdentity()
  // `canGoBack` depende do histórico do navegador, que não existe no servidor.
  // Começa `false` nos dois lados e se ajusta depois de montar, senão o HTML
  // do servidor e o do cliente divergem.
  const [podeVoltar, setPodeVoltar] = useState(false)

  useEffect(() => {
    setPodeVoltar(router.history.canGoBack())
  }, [router])

  const painel = destino ?? (userHasRole(user, 'admin') ? '/admin' : '/professor')

  return (
    <button
      type="button"
      className="panel-back"
      onClick={() => (podeVoltar ? router.history.back() : router.navigate({ to: painel }))}
    >
      ← Voltar
    </button>
  )
}
