import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, GraduationCap, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

// Casca visual das telas de autenticação (login, pedir link de recuperação e
// criar senha nova). Fica em um componente só pra que as três telas nunca
// saiam de sintonia: o painel da marca, o cabeçalho mobile e o rodapé de
// suporte são idênticos em todas, e só o miolo muda.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="login-page">
      <section className="login-panel brand-panel">
        <Link className="back-home" to="/"><ArrowLeft size={17} /> Voltar ao site</Link>
        <div className="login-brand"><span className="brand-mark"><img src="/logo-icone.png" alt="Carla Patrícia Medina" /></span><div><b>Carla Patrícia</b><small>Redação · Gramática</small></div></div>
        <div className="brand-panel-copy"><span className="pill"><Sparkles size={14} /> Espaço do aluno</span><h1>Seu conhecimento.<br /><em>Sua conquista.</em></h1><p>Organize seus estudos, acompanhe sua evolução e mantenha sua aprovação sempre à vista.</p></div>
        <div className="login-benefits"><span><Check /> Conteúdo organizado em trilhas</span><span><Check /> Correções e feedbacks em um só lugar</span><span><Check /> Acompanhamento completo da evolução</span></div>
        <div className="login-quote"><p>“Cada movimento transforma o que parece distante em uma conquista possível.”</p><span>Carla Patrícia Medina</span></div>
      </section>

      <section className="login-panel form-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-brand"><GraduationCap /> CPM Educação</div>
          {children}
          <div className="login-support">Precisa de ajuda? <a href="mailto:contato.carlapatriciamedina@gmail.com">Fale com o suporte</a></div>
        </div>
      </section>
    </main>
  )
}
