import { Link } from '@tanstack/react-router'
import { useIdentity } from '@/lib/identity-context'
import { userHasRole } from '@/lib/roles'

// Link de volta das telas de administração.
//
// Existem dois painéis: `/admin`, só para admin, e `/professor`, para admin ou
// professora. Várias telas são alcançáveis pelos dois, e o link fixo que havia
// antes quebrava para a professora: em Dicas e em Redações ele apontava para
// `/admin`, onde ela não tem permissão — clicar em "Voltar" a expulsava para o
// dashboard do aluno. Outras cinco telas mandavam todo mundo para o dashboard,
// tirando de dentro da ferramenta quem estava no meio de uma tarefa.
//
// O destino vem do papel de quem está logado, pelo mesmo `useIdentity` que o
// menu do aluno já usa. Enquanto a identidade não carregou, o padrão é
// `/professor`: admin também tem acesso a ele, então nesse instante o link
// ainda leva a um painel válido — ao contrário de `/admin`, que devolveria a
// professora ao dashboard.
export function VoltarAoPainel() {
  const { user } = useIdentity()

  return userHasRole(user, 'admin')
    ? <Link to="/admin" className="panel-back">← Voltar ao painel admin</Link>
    : <Link to="/professor" className="panel-back">← Voltar ao painel</Link>
}
