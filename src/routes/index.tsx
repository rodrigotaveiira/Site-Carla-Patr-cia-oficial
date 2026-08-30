import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlay,
  FileCheck2,
  Instagram,
  Mail,
  Menu,
  MessageCircle,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

export const Route = createFileRoute('/')({ component: HomePage })

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.65 },
}

const methods = [
  { icon: FileCheck2, title: 'Correção personalizada', text: 'Feedback criterioso, humano e direcionado para cada ponto de evolução.' },
  { icon: Target, title: 'Redação prática', text: 'Treino estratégico com temas atuais e repertórios que fazem sentido.' },
  { icon: BookOpen, title: 'Gramática aplicada', text: 'A norma culta explicada dentro do texto, sem decoreba ou fórmulas vazias.' },
  { icon: CirclePlay, title: 'Aulas ao vivo', text: 'Encontros dinâmicos, plantões de dúvida e proximidade com a professora.' },
  { icon: TrendingUp, title: 'Simulados inteligentes', text: 'Diagnóstico contínuo para acompanhar desempenho, tempo e segurança.' },
  { icon: Sparkles, title: 'Material exclusivo', text: 'Mapas, guias e exercícios autorais para acelerar o seu aprendizado.' },
]

const courses = [
  {
    tag: 'Mais procurado',
    title: 'Redação de Excelência',
    text: 'Do planejamento à conclusão: domine as competências avaliadas e escreva com segurança.',
    image: 'https://i.im.ge/QM8BQuT/carla-t300.webp',
    items: ['Correções individuais', 'Aulas semanais', 'Temas inéditos'],
  },
  {
    tag: 'Base sólida',
    title: 'Gramática sem Mistério',
    text: 'Aprenda gramática de forma contextualizada e transforme conhecimento em resultado.',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85',
    items: ['Trilha progressiva', 'Exercícios comentados', 'Revisões práticas'],
  },
  {
    tag: 'Experiência VIP',
    title: 'Encontros Individuais',
    text: 'Plano de estudos personalizado, encontros exclusivos e acompanhamento da redação.',
    image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1000&q=85',
    items: ['Plano sob medida', 'Contato direto', 'Metas personalizadas'],
  },
]

const testimonials = [
  {
    name: 'Isabel Pontes',
    result: 'Medicina — FMC',
    text: 'Carlinha é uma professora diferenciada! Entrei em fevereiro, e no primeiro semestre passei para a FMC. Ela é diferente não só na didática, é também no aspecto emocional,  que prioriza nossa sanidade mental, com muitas conversas. Em relação ao conteúdo, ela usa todos os métodos, monitorias (que avalia nossa redação parte por parte), aula, simulados, simuladinhos e o WhatsApp 100% disponível em qualquer horário. Eu indicaria para QUALQUER pessoa, independente do nível de escolaridade. O curso é extremamente acolhedor, eu sou apaixonada na didática e no ambiente.',
    image: '/depoimentos/isabel-pontes.jpeg',
  },
  {
    name: 'Maria Clara Kemp',
    result: 'Medicina — FMC e FMP',
    text: `Ter Carlinha do meu lado durante a minha trajetória no vestibular foi crucial. Ela acreditava em mim mesmo quando eu estava exausta e pensando em desistir. 
Estar no saberes tornou o processo, que não é fácil, muito mais leve! O ambiente é super acolhedor nos mínimos detalhes! 
Minha gratidão eterna a esse lugar e essa profissional maravilhosa. 
É difícil achar alguém como Carlinha hoje em dia`,
image: '/depoimentos/maria-clara-kemp.jpeg',  },
  {
    name: 'Thaís Taveres',
    result: 'Medicina — FMC',
    text: 'Mais do que uma professora, você foi a pessoa que acreditou em mim quando eu mesma não conseguia acreditar. Seu incentivo, carinho e confiança mudaram a minha história e fizeram parte da realização de um grande sonho. Hoje tenho a felicidade de dizer que, além de uma profissional extraordinária, ganhei uma amiga para sempre. Você sempre terá um lugar muito especial no meu coração! Obrigada por tudo, Carlinha, amo muito você!',
    image: '/depoimentos/thais-tavares.jpeg',
  },
]

const faqs = [
  ['Para quem são os cursos?', 'PVoltado para estudantes do Ensino Médio, candidatos ao ENEM, vestibulares e concursos, e universitários que desejam aprimorar a escrita, desenvolver maior clareza e domínio técnico, e escrever com mais confiança.'],
  ['Como funcionam as correções?', 'Cada texto recebe uma análise criteriosa dos critérios da prova, comentários por trecho, nota detalhada e orientações práticas para a próxima produção.'],
  ['As aulas ficam gravadas?', 'Sim. As aulas ao vivo ficam disponíveis na plataforma para revisão durante o período de acesso do curso.'],
  ['Posso começar do zero?', 'Com certeza. A trilha respeita seu nível atual e conduz passo a passo da estrutura básica às estratégias avançadas.'],
  ['Há acompanhamento individual?', 'Sim. Todos os planos incluem feedback, e os Encontros Individuais oferecem conversas e plano de estudos totalmente personalizados.'],
]

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState(0)
  const [testimonial, setTestimonial] = useState(0)
  const [formState, setFormState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormState('sending')
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      await fetch('/contact-form.html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(
          Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
        ).toString(),
      })
      setFormState('success')
      form.reset()
    } catch {
      setFormState('error')
    }
  }

  return (
    <main className="site-shell">
      <div className="announcement">
        <span><Sparkles size={14} /> Turmas 2026/2027 abertas</span>
        <a href="#cursos">Garanta sua vaga <ArrowRight size={14} /></a>
      </div>

      <header className="nav-wrap">
        <a className="brand" href="#inicio" aria-label="Carla Patrícia Medina — início">
          <span className="brand-mark"><img src="https://i.im.ge/QM8BQuT/carla-t300.webp" alt="Carla" /></span>
          <span><b>Carla Patrícia Medina</b><small>Redação e Gramática</small></span>
        </a>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Navegação principal">
          {['Início', 'Sobre', 'Metodologia', 'Cursos', 'Resultados', 'FAQ', 'Contato'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace('ç', 'c')}`} onClick={() => setMenuOpen(false)}>{item}</a>
          ))}
          <Link className="nav-student mobile-only" to="/login">Área do aluno</Link>
        </nav>
        <div className="nav-actions">
          <Link className="text-link" to="/login">Área do aluno</Link>
          <Link className="button small" to="/login">Entrar <ArrowRight size={16} /></Link>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <motion.div className="hero-copy" initial={{ opacity: 0, x: -35 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .8 }}>
          <div className="eyebrow"><span /> Estratégia que transforma resultados</div>
          <h1>Sua aprovação começa por uma <em>redação de excelência.</em></h1>
          <p>Aulas de Redação e Gramática com metodologia exclusiva, correção personalizada e acompanhamento completo para ENEM, vestibulares e concursos.</p>
          <div className="hero-proof">
            <strong>4,9/5</strong>
            <span>avaliação média dos alunos</span>
          </div>
          <div className="hero-buttons">
            <a className="button" href="#cursos">Quero começar <ArrowRight size={18} /></a>
            <a className="button ghost" href="#metodologia"><CirclePlay size={19} /> Conheça o método</a>
          </div>
          <div className="hero-trust">
            <div className="avatar-stack">
              {testimonials.map((item) => <img key={item.name} src={item.image} alt="" />)}
            </div>
            <div><span>{[1,2,3,4,5].map(n => <Star key={n} size={13} fill="currentColor" />)}</span><small>Mais de 300 histórias de aprovação</small></div>
          </div>
        </motion.div>

        <motion.div className="hero-visual" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, delay: .15 }}>
          <div className="portrait-frame">
            <div className="portrait-label"><br /><b></b></div>
            <a href="https://im.ge/i/QM8BQuT"><img src="https://i.im.ge/QM8BQuT/carla-t300.webp" alt="Carla" /></a>
            <div className="floating-card score-card"><span>Nota alcançada</span><b>35+</b><small><TrendingUp size={14} /> +180 pontos</small></div>
            <div className="floating-card experience-card"><Award size={22} /><div><b>22+ anos</b><span>de experiência</span></div></div>
          </div>
        </motion.div>

        <motion.div className="stats-strip" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .65 }}>
          {[['5.000+', 'redações corrigidas'], ['300+', 'alunos aprovados'], ['22 anos', 'de experiência'], ['4,9/5', 'satisfação dos alunos']].map(([number, label]) => (
            <div key={label}><b>{number}</b><span>{label}</span></div>
          ))}
        </motion.div>
      </section>

      <section className="section about" id="sobre">
        <motion.div className="about-collage" {...reveal}>
          <div className="about-main-image"><img src="https://i.im.ge/QM8BQuT/carla-t300.webp" alt="Professora Carla Patrícia Medina" loading="lazy" /></div>
          <div className="quote-card"><Quote size={28} /><p>Ensinar a escrever é ensinar a organizar ideias, defender sonhos e ocupar espaços.</p></div>
          <div className="gold-seal"><span>CP</span><small>Excelência<br />em educação</small></div>
        </motion.div>
        <motion.div className="about-copy" {...reveal}>
          <div className="section-kicker">Conheça sua professora</div>
          <h2>Experiência, sensibilidade e um olhar <em>único</em> para cada aluno.</h2>
          <p>Carla Patrícia Medina é professora de Língua Portuguesa e especialista em produção textual. Há mais de 22 anos, transforma insegurança em repertório, técnica e autonomia.</p>
          <p>Sua metodologia une rigor acadêmico a uma orientação próxima e acolhedora — porque cada aprovação começa quando o aluno entende que é capaz.</p>
          <div className="signature">Carla Patrícia <span>Medina</span></div>
          <div className="mini-values">
            <span><ShieldCheck /> Ensino responsável</span><span><Users /> Acompanhamento humano</span>
          </div>
          <a className="inline-arrow" href="#metodologia">Conheça minha trajetória <ArrowRight size={17} /></a>
        </motion.div>
      </section>

      <section className="method section-full" id="metodologia">
        <div className="section-heading centered light">
          <div className="section-kicker">Método CPM</div>
          <h2>Um caminho claro entre o seu texto de hoje e a <em>aprovação de amanhã.</em></h2>
          <p>Técnica, prática e acompanhamento em uma experiência de aprendizagem desenhada para gerar evolução real.</p>
        </div>
        <div className="method-grid">
          {methods.map((item, index) => (
            <motion.article className="method-card" key={item.title} {...reveal} transition={{ duration: .55, delay: index * .06 }}>
              <div className="method-number">0{index + 1}</div><item.icon /><h3>{item.title}</h3><p>{item.text}</p><span className="card-line" />
            </motion.article>
          ))}
        </div>
      </section>

      <section className="courses section-full" id="cursos">
        <div className="section-heading split">
          <div><div className="section-kicker">Escolha sua jornada</div><h2>Cursos criados para o seu <em>próximo nível.</em></h2></div>
          <p></p>
        </div>
        <div className="course-grid">
          {courses.map((course, index) => (
            <motion.article className={`course-card ${index === 0 ? 'featured' : ''}`} key={course.title} {...reveal} transition={{ delay: index * .08 }}>
              <div className="course-image"><img src={course.image} alt="" loading="lazy" /><span>{course.tag}</span></div>
              <div className="course-body"><small>0{index + 1} · Formação</small><h3>{course.title}</h3><p>{course.text}</p>
                <ul>{course.items.map(item => <li key={item}><Check size={15} /> {item}</li>)}</ul>
                <a href="#contato">Saiba mais <ArrowRight size={17} /></a>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="secondary-courses">
          {['Mentoria Coletiva', 'Simuladinhos', 'Simuladão Intensivo'].map((item, index) => <span key={item}><b>0{index + 4}</b>{item}<ArrowRight size={16} /></span>)}
        </div>
      </section>

      <section className="results" id="resultados">
        <motion.div className="results-copy" {...reveal}>
          <div className="section-kicker">Resultados que falam</div>
          <h2>Mais do que notas.<br /><em>Novas possibilidades.</em></h2>
          <p>Quando existe método, acompanhamento e constância, a evolução deixa de ser promessa e vira conquista.</p>
          <div className="result-numbers">
            <div><b>84%</b><span>Alcançaram 30+ na redação</span></div><div><b>82%</b><span>Aprovados no vestibular</span></div>
          </div>
        </motion.div>
        <div className="university-cloud" aria-label="Universidades com alunos aprovados">
          {['FMC', 'FMP', 'UFF', 'UENF', 'UVV', 'UFRJ'].map((name, i) => <motion.span key={name} {...reveal} transition={{ delay: i * .06 }}>{name}<small>aprovações</small></motion.span>)}
        </div>
      </section>

      <section className="testimonials section-full">
        <div className="section-heading centered"><div className="section-kicker">Histórias reais</div><h2>Quem viveu a transformação <em>conta melhor.</em></h2></div>
        <div className="testimonial-wrap">
          <button onClick={() => setTestimonial((testimonial + testimonials.length - 1) % testimonials.length)} aria-label="Depoimento anterior">←</button>
          <motion.article key={testimonial} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Quote className="big-quote" /><div className="stars">{[1,2,3,4,5].map(n => <Star key={n} fill="currentColor" />)}</div>
            <blockquote>“{testimonials[testimonial].text}”</blockquote>
            <div className="student"><img src={testimonials[testimonial].image} alt={testimonials[testimonial].name} loading="lazy" /><span><b>{testimonials[testimonial].name}</b><small>{testimonials[testimonial].result}</small></span></div>
          </motion.article>
          <button onClick={() => setTestimonial((testimonial + 1) % testimonials.length)} aria-label="Próximo depoimento">→</button>
        </div>
        <div className="dots">{testimonials.map((_, index) => <button className={index === testimonial ? 'active' : ''} onClick={() => setTestimonial(index)} key={index} aria-label={`Ver depoimento ${index + 1}`} />)}</div>
      </section>

      <section className="platform-preview section-full">
        <motion.div className="platform-copy" {...reveal}>
          <span className="pill"><Zap size={14} /> Tudo em um só lugar</span>
          <h2>Uma plataforma que acompanha o seu ritmo.</h2>
          <p>Aulas, materiais, correções, simulados e progresso organizados para você focar no que realmente importa: aprender.</p>
          <div className="platform-features">
            <span><CirclePlay /> Aulas e trilhas</span><span><FileCheck2 /> Correções detalhadas</span><span><TrendingUp /> Evolução visual</span><span><CalendarDays /> Agenda organizada</span>
          </div>
          <Link className="button light-button" to="/login">Entrar na área do aluno <ArrowRight size={18} /></Link>
        </motion.div>
        <motion.div className="dashboard-mock" {...reveal}>
          <div className="mock-sidebar"><b>CP</b>{[1,2,3,4,5,6].map(i => <span key={i} className={i === 1 ? 'active' : ''} />)}</div>
          <div className="mock-content"><div className="mock-top"><span /><i /></div><h4>Olá, Marina!</h4><p>Continue firme. Sua aprovação está cada vez mais perto.</p><div className="mock-grid"><div className="mock-progress"><small>Progresso geral</small><b>76%</b><span><i /></span></div><div className="mock-class"><small>Próxima aula</small><b>Projeto de texto</b><em>Hoje · 19h</em></div></div><div className="mock-chart"><span /><span /><span /><span /><span /><span /><span /></div></div>
        </motion.div>
      </section>

      <section className="faq section" id="faq">
        <div className="faq-intro"><div className="section-kicker">Perguntas frequentes</div><h2>Tudo o que você precisa saber para <em>começar.</em></h2><p>Ainda ficou com alguma dúvida?</p><a href="#contato">Fale com a nossa equipe <ArrowRight size={16} /></a></div>
        <div className="accordion">
          {faqs.map(([question, answer], index) => <div className={`faq-item ${activeFaq === index ? 'active' : ''}`} key={question}><button onClick={() => setActiveFaq(activeFaq === index ? -1 : index)}><span>{question}</span><ChevronDown /></button>{activeFaq === index && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{answer}</motion.p>}</div>)}
        </div>
      </section>

      <section className="contact section-full" id="contato">
        <div className="contact-card">
          <div className="contact-copy"><div className="section-kicker">Vamos conversar?</div><h2>O próximo capítulo da sua história pode começar <em>agora.</em></h2><p>Conte seus objetivos. Nossa equipe ajuda você a escolher o melhor caminho.</p>
            <div className="contact-channels"><a href="https://wa.me/5522999325306"><MessageCircle /> WhatsApp</a><a href="mailto:contato@carlapatriciamedina.com.br"><Mail /> E-mail</a><a href="https://instagram.com/carlapatricia.medina"><Instagram /> Instagram</a></div>
          </div>
          <form className="contact-form" name="contato" onSubmit={submitContact}>
            <input type="hidden" name="form-name" value="contato" /><input className="hidden-field" name="bot-field" tabIndex={-1} autoComplete="off" />
            <label>Seu nome<input name="nome" placeholder="Como podemos chamar você?" required /></label>
            <div className="form-row"><label>E-mail<input type="email" name="email" placeholder="voce@email.com" required /></label><label>WhatsApp<input name="telefone" placeholder="(00) 00000-0000" /></label></div>
            <label>Como podemos ajudar?<textarea name="mensagem" placeholder="Conte um pouco sobre seu objetivo..." rows={4} required /></label>
            <button className="button" disabled={formState === 'sending'}>{formState === 'sending' ? 'Enviando...' : 'Enviar mensagem'} <Send size={17} /></button>
            {formState === 'success' && <p className="form-message success">Mensagem enviada. Em breve entraremos em contato!</p>}
            {formState === 'error' && <p className="form-message error">Não foi possível enviar. Tente novamente.</p>}
          </form>
        </div>
      </section>

      <footer>
        <div className="footer-main"><div className="footer-brand"><a className="brand" href="#inicio"><span className="brand-mark">CP</span><span><b>Carla Patrícia Medina</b><small>Redação e Gramática</small></span></a><p>Sua aprovação começa por uma redação de excelência.</p><div className="socials"><a href="https://instagram.com/carlapatricia.medina" aria-label="Instagram"><Instagram /></a><a href="https://wa.me/5522999325306" aria-label="WhatsApp"><MessageCircle /></a><a href="mailto:contato@carlapatriciamedina.com.br" aria-label="E-mail"><Mail /></a></div></div>
          <div><b>Navegue</b><a href="#sobre">Sobre</a><a href="#metodologia">Metodologia</a><a href="#cursos">Cursos</a><a href="#resultados">Resultados</a></div>
          <div><b>Conteúdo</b><a href="#faq">FAQ</a><a href="#contato">Contato</a><Link to="/dashboard">Área do aluno</Link><Link to="/login">Entrar</Link></div>
          <div><b>Fale conosco</b><span>contato@carla<br />patriciamedina.com.br</span><span>Seg–Sex · 9h às 18h</span></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Carla Patrícia Medina. Todos os direitos reservados.</span><div><a href="/privacidade">Privacidade</a><a href="/termos">Termos de uso</a><a href="/lgpd">LGPD</a></div></div>
      </footer>

      <a className="whatsapp-float" href="https://wa.me/5522999325306" aria-label="Conversar no WhatsApp"><MessageCircle /></a>
    </main>
  )
}
