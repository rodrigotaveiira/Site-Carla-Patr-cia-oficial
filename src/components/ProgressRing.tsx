import { CirclePlay, FileCheck2, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { StudentProgress } from '@/lib/progress'

// Anel de "progresso geral" do dashboard — clicável: mostra de onde vem o
// número (aulas assistidas + redações entregues), porque um número sozinho
// não explica por que bateu 100% cedo (poucas aulas cadastradas ainda) nem
// convida o aluno a interagir com o card.
//
// O painel é renderizado num portal (fora do card) porque o hero card usa
// overflow:hidden pra conter a decoração de fundo — um painel filho normal
// ficaria cortado nele.
//
// O preenchimento do anel anima via CSS (--ring-percent registrada com
// @property em styles.css), não com JS/requestAnimationFrame: o valor vai de
// 0 (enquanto progress ainda é null, carregando) até o real assim que os
// dados chegam, e o navegador anima a transição sozinho — sem loop manual
// pra manter sincronizado.
export function ProgressRing({ progress }: { progress: StudentProgress | null }) {
  const [expanded, setExpanded] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  function updatePanelPos() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = 240
    // Alinha a borda direita do painel com a borda direita do anel, sem deixar vazar
    // pela esquerda da tela em telas estreitas.
    const left = Math.max(12, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 12))
    setPanelPos({ top: rect.bottom + window.scrollY + 12, left: left + window.scrollX })
  }

  useEffect(() => {
    if (!expanded) return
    updatePanelPos()

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setExpanded(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false)
    }
    function handleReposition() {
      updatePanelPos()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const ringStyle = { '--ring-percent': progress?.overallPercent ?? 0 } as CSSProperties

  return (
    <div className="hero-ring-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="hero-ring"
        style={ringStyle}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label="Ver como o progresso geral é calculado"
      >
        <div>
          <b>{progress ? `${progress.overallPercent}%` : '...'}</b>
          <span>progresso geral</span>
        </div>
      </button>

      {expanded && progress && createPortal(
        <div ref={panelRef} className="hero-ring-panel" style={{ top: panelPos.top, left: panelPos.left }} role="dialog" aria-label="Como calculamos seu progresso">
          <button type="button" className="hero-ring-panel-close" onClick={() => setExpanded(false)} aria-label="Fechar">
            <X size={14} />
          </button>
          <b>Como chegamos nesse número</b>

          {progress.aulasTracked ? (
            <div className="hero-ring-metric">
              <div className="hero-ring-metric-head">
                <span><CirclePlay size={13} /> Aulas assistidas</span>
                <b>{progress.aulasPercent}%</b>
              </div>
              <div className="hero-ring-bar"><i style={{ width: `${progress.aulasPercent}%` }} /></div>
              <small>{progress.aulasAssistidas} de {progress.aulasDisponiveis} aulas</small>
            </div>
          ) : (
            <div className="hero-ring-metric">
              <div className="hero-ring-metric-head">
                <span><CirclePlay size={13} /> Aulas assistidas</span>
              </div>
              <small>Ainda sem aulas cadastradas — essa parte não entra na conta por enquanto.</small>
            </div>
          )}

          <div className="hero-ring-metric">
            <div className="hero-ring-metric-head">
              <span><FileCheck2 size={13} /> Redações entregues</span>
              <b>{progress.redacoesPercent}%</b>
            </div>
            <div className="hero-ring-bar"><i style={{ width: `${progress.redacoesPercent}%` }} /></div>
            <small>{progress.redacoesEntregues} de 5 redações</small>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
