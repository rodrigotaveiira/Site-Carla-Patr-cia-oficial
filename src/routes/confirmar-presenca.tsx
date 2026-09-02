import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarCheck, CircleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { confirmarPresenca, type ResultadoConfirmacao } from '@/lib/confirmacao-presenca'
import { noindexHead } from '@/lib/seo'

// Destino do botão "Confirmar presença" do e-mail de lembrete. Página pública,
// aberta pelo token do e-mail — por isso `noindex`, pra não entrar na busca.
export const Route = createFileRoute('/confirmar-presenca')({
  head: noindexHead,
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === 'string' ? search.t : '',
  }),
  component: ConfirmarPresencaPage,
})

function formatarData(date: string) {
  const [ano, mes, dia] = date.split('-').map(Number)
  const texto = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function ConfirmarPresencaPage() {
  const { t } = Route.useSearch()
  const [resultado, setResultado] = useState<ResultadoConfirmacao | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    if (!t) {
      setResultado({ ok: false, motivo: 'token-invalido' })
      return
    }
    confirmarPresenca({ data: { token: t } })
      .then(setResultado)
      .catch(() => setFalhou(true))
  }, [t])

  const carregando = !resultado && !falhou

  return (
    <main className="panel" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
      {carregando && <p className="panel-subtitle" style={{ marginTop: 40 }}>Confirmando...</p>}

      {falhou && (
        <div className="designed-empty" style={{ padding: '48px 0 12px' }}>
          <span className="designed-empty-icon"><CircleAlert /></span>
          <b style={{ fontSize: 17 }}>Não foi possível confirmar agora</b>
          <p>Tente abrir o link do e-mail de novo em alguns instantes.</p>
        </div>
      )}

      {resultado && !resultado.ok && (
        <div className="designed-empty" style={{ padding: '48px 0 12px' }}>
          <span className="designed-empty-icon"><CircleAlert /></span>
          <b style={{ fontSize: 17 }}>Este link não é mais válido</b>
          <p>
            Ele pode ter expirado ou já ter sido substituído por um mais recente.
            Você pode conferir seus horários direto na plataforma.
          </p>
        </div>
      )}

      {resultado?.ok && (
        <div className="designed-empty" style={{ padding: '48px 0 12px' }}>
          <span className="designed-empty-icon"><CalendarCheck /></span>
          <b style={{ fontSize: 17 }}>
            {resultado.jaConfirmado ? 'Sua presença já estava confirmada' : 'Presença confirmada!'}
          </b>
          {resultado.data && resultado.hora && (
            <p>
              {formatarData(resultado.data)} às {resultado.hora}
              {resultado.duracao ? ` · ${resultado.duracao} minutos` : ''}.
            </p>
          )}
          <p>Até lá! Se algo mudar, é só cancelar pela plataforma.</p>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Link to="/mentorias" className="btn btn-primary">Ver meus horários</Link>
      </div>
    </main>
  )
}
