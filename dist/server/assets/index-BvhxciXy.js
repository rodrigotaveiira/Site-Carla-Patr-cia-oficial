import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, X, Menu, CirclePlay, Star, TrendingUp, Award, Quote, ShieldCheck, Users, FileCheck2, Target, BookOpen, Check, Zap, CalendarDays, ChevronDown, MessageCircle, Mail, Instagram, Send } from "lucide-react";
import { useState } from "react";
const reveal = {
  initial: {
    opacity: 0,
    y: 28
  },
  whileInView: {
    opacity: 1,
    y: 0
  },
  viewport: {
    once: true,
    margin: "-80px"
  },
  transition: {
    duration: 0.65
  }
};
const methods = [{
  icon: FileCheck2,
  title: "Correção personalizada",
  text: "Feedback criterioso, humano e direcionado para cada ponto de evolução."
}, {
  icon: Target,
  title: "Redação prática",
  text: "Treino estratégico com temas atuais e repertórios que fazem sentido."
}, {
  icon: BookOpen,
  title: "Gramática aplicada",
  text: "A norma culta explicada dentro do texto, sem decoreba ou fórmulas vazias."
}, {
  icon: CirclePlay,
  title: "Aulas ao vivo",
  text: "Encontros dinâmicos, plantões de dúvida e proximidade com a professora."
}, {
  icon: TrendingUp,
  title: "Simulados inteligentes",
  text: "Diagnóstico contínuo para acompanhar desempenho, tempo e segurança."
}, {
  icon: Sparkles,
  title: "Material exclusivo",
  text: "Mapas, guias e exercícios autorais para acelerar o seu aprendizado."
}];
const courses = [{
  tag: "Mais procurado",
  title: "Redação de Excelência",
  text: "Do planejamento à conclusão: domine as competências avaliadas e escreva com segurança.",
  image: "https://i.im.ge/QM8BQuT/carla-t300.webp",
  items: ["Correções individuais", "Aulas semanais", "Temas inéditos"]
}, {
  tag: "Base sólida",
  title: "Gramática sem Mistério",
  text: "Aprenda gramática de forma contextualizada e transforme conhecimento em resultado.",
  image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=85",
  items: ["Trilha progressiva", "Exercícios comentados", "Revisões práticas"]
}, {
  tag: "Experiência VIP",
  title: "Encontro Individual",
  text: "Plano de estudos personalizado, encontros exclusivos e acompanhamento da sua redação do início ao fim.",
  image: "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1000&q=85",
  items: ["Plano sob medida", "Contato direto", "Metas personalizadas"]
}];
const testimonials = [{
  name: " ",
  result: "Direito — UFMG",
  text: "Eu saí dos 720 para 960 pontos. A Carla não entrega uma fórmula: ela ensina a pensar, argumentar e confiar no próprio texto.",
  image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80"
}, {
  name: "Lucas Fernandes",
  result: "Medicina — UFJF",
  text: "As correções são extremamente detalhadas. Pela primeira vez entendi exatamente o que precisava melhorar e como fazer isso.",
  image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
}, {
  name: "Beatriz Moura",
  result: "Analista — TRT",
  text: "A metodologia trouxe organização e objetividade para a minha escrita. Foi decisiva para a aprovação no concurso.",
  image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
}];
const faqs = [["Para quem são os cursos?", "Para estudantes do ensino médio, ENEM, vestibulares, concursos e universitários que desejam escrever com mais clareza, técnica e confiança."], ["Como funcionam as correções?", "Cada texto recebe uma análise criteriosa dos critérios da prova, comentários por trecho, nota detalhada e orientações práticas para a próxima produção."], ["As aulas ficam gravadas?", "Sim. As aulas ao vivo ficam disponíveis na plataforma para revisão durante o período de acesso do curso."], ["Posso começar do zero?", "Com certeza. A trilha respeita seu nível atual e conduz passo a passo da estrutura básica às estratégias avançadas."], ["Há acompanhamento individual?", "Sim. Todos os planos incluem feedback, e a Mentoria Individual oferece encontros e plano de estudos totalmente personalizados."]];
function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [testimonial, setTestimonial] = useState(0);
  const [formState, setFormState] = useState("idle");
  const submitContact = async (event) => {
    event.preventDefault();
    setFormState("sending");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await fetch("/contact-form.html", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(Array.from(formData.entries()).map(([key, value]) => [key, String(value)])).toString()
      });
      setFormState("success");
      form.reset();
    } catch {
      setFormState("error");
    }
  };
  return /* @__PURE__ */ jsxs("main", { className: "site-shell", children: [
    /* @__PURE__ */ jsxs("div", { className: "announcement", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsx(Sparkles, { size: 14 }),
        " Turmas 2026-2027 abertas"
      ] }),
      /* @__PURE__ */ jsxs("a", { href: "#cursos", children: [
        "Garanta sua vaga ",
        /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("header", { className: "nav-wrap", children: [
      /* @__PURE__ */ jsxs("a", { className: "brand", href: "#inicio", "aria-label": "Carla Patrícia Medina — início", children: [
        /* @__PURE__ */ jsx("span", { className: "brand-mark", children: /* @__PURE__ */ jsx("img", { src: "https://i.im.ge/QM8BQuT/carla-t300.webp", alt: "Carla" }) }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("b", { children: "Carla Patrícia" }),
          /* @__PURE__ */ jsx("small", { children: "Medina · Educação" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: menuOpen ? "nav-links open" : "nav-links", "aria-label": "Navegação principal", children: [
        ["Início", "Sobre", "Metodologia", "Cursos", "Resultados", "FAQ", "Contato"].map((item) => /* @__PURE__ */ jsx("a", { href: `#${item.toLowerCase().replace("ç", "c")}`, onClick: () => setMenuOpen(false), children: item }, item)),
        /* @__PURE__ */ jsx(Link, { className: "nav-student mobile-only", to: "/login", children: "Área do aluno" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "nav-actions", children: [
        /* @__PURE__ */ jsx(Link, { className: "text-link", to: "/login", children: "Área do aluno" }),
        /* @__PURE__ */ jsxs(Link, { className: "button small", to: "/login", children: [
          "Entrar ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "menu-button", onClick: () => setMenuOpen(!menuOpen), "aria-label": "Abrir menu", children: menuOpen ? /* @__PURE__ */ jsx(X, {}) : /* @__PURE__ */ jsx(Menu, {}) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "hero", id: "inicio", children: [
      /* @__PURE__ */ jsx("div", { className: "hero-orb orb-one" }),
      /* @__PURE__ */ jsx("div", { className: "hero-orb orb-two" }),
      /* @__PURE__ */ jsxs(motion.div, { className: "hero-copy", initial: {
        opacity: 0,
        x: -35
      }, animate: {
        opacity: 1,
        x: 0
      }, transition: {
        duration: 0.8
      }, children: [
        /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
          /* @__PURE__ */ jsx("span", {}),
          " Estratégia que transforma resultados"
        ] }),
        /* @__PURE__ */ jsxs("h1", { children: [
          "Sua aprovação começa por uma ",
          /* @__PURE__ */ jsx("em", { children: "redação de excelência." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Aulas de Redação e Gramática com metodologia exclusiva, correção personalizada e acompanhamento completo para ENEM, vestibulares e concursos." }),
        /* @__PURE__ */ jsxs("div", { className: "hero-proof", children: [
          /* @__PURE__ */ jsx("strong", { children: "4,9/5" }),
          /* @__PURE__ */ jsx("span", { children: "avaliação média dos alunos" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "hero-buttons", children: [
          /* @__PURE__ */ jsxs("a", { className: "button", href: "#cursos", children: [
            "Quero começar ",
            /* @__PURE__ */ jsx(ArrowRight, { size: 18 })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "button ghost", href: "#metodologia", children: [
            /* @__PURE__ */ jsx(CirclePlay, { size: 19 }),
            " Conheça o método"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "hero-trust", children: [
          /* @__PURE__ */ jsx("div", { className: "avatar-stack", children: testimonials.map((item) => /* @__PURE__ */ jsx("img", { src: item.image, alt: "" }, item.name)) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { children: [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsx(Star, { size: 13, fill: "currentColor" }, n)) }),
            /* @__PURE__ */ jsx("small", { children: "Mais de 200 histórias de aprovação" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(motion.div, { className: "hero-visual", initial: {
        opacity: 0,
        scale: 0.94
      }, animate: {
        opacity: 1,
        scale: 1
      }, transition: {
        duration: 0.9,
        delay: 0.15
      }, children: /* @__PURE__ */ jsxs("div", { className: "portrait-frame", children: [
        /* @__PURE__ */ jsxs("div", { className: "portrait-label", children: [
          "Prof.ª Carla",
          /* @__PURE__ */ jsx("br", {}),
          /* @__PURE__ */ jsx("b", { children: "Patrícia Medina" })
        ] }),
        /* @__PURE__ */ jsx("a", { href: "https://im.ge/i/QM8BQuT", children: /* @__PURE__ */ jsx("img", { src: "https://i.im.ge/QM8BQuT/carla-t300.webp", alt: "Carla" }) }),
        /* @__PURE__ */ jsxs("div", { className: "floating-card score-card", children: [
          /* @__PURE__ */ jsx("span", { children: "Nota alcançada" }),
          /* @__PURE__ */ jsx("b", { children: "960" }),
          /* @__PURE__ */ jsxs("small", { children: [
            /* @__PURE__ */ jsx(TrendingUp, { size: 14 }),
            " +180 pontos"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "floating-card experience-card", children: [
          /* @__PURE__ */ jsx(Award, { size: 22 }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("b", { children: "15+ anos" }),
            /* @__PURE__ */ jsx("span", { children: "de experiência" })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(motion.div, { className: "stats-strip", initial: {
        opacity: 0,
        y: 30
      }, animate: {
        opacity: 1,
        y: 0
      }, transition: {
        delay: 0.65
      }, children: [["5.000+", "redações corrigidas"], ["300+", "alunos aprovados"], ["22 anos", "de experiência"], ["4,9/5", "satisfação dos alunos"]].map(([number, label]) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: number }),
        /* @__PURE__ */ jsx("span", { children: label })
      ] }, label)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "section about", id: "sobre", children: [
      /* @__PURE__ */ jsxs(motion.div, { className: "about-collage", ...reveal, children: [
        /* @__PURE__ */ jsx("div", { className: "about-main-image", children: /* @__PURE__ */ jsx("img", { src: "https://i.im.ge/QM8BQuT/carla-t300.webp", alt: "Professora Carla Patrícia Medina" }) }),
        /* @__PURE__ */ jsxs("div", { className: "quote-card", children: [
          /* @__PURE__ */ jsx(Quote, { size: 28 }),
          /* @__PURE__ */ jsx("p", { children: "Ensinar a escrever é ensinar a organizar ideias, defender sonhos e ocupar espaços." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "gold-seal", children: [
          /* @__PURE__ */ jsx("span", { children: "CP" }),
          /* @__PURE__ */ jsxs("small", { children: [
            "Excelência",
            /* @__PURE__ */ jsx("br", {}),
            "em educação"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(motion.div, { className: "about-copy", ...reveal, children: [
        /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Conheça sua professora" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "Experiência, sensibilidade e um olhar ",
          /* @__PURE__ */ jsx("em", { children: "único" }),
          " para cada aluno."
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Carla Patrícia Medina é professora de Língua Portuguesa e especialista em produção textual. Há mais de 22 anos, transforma insegurança em repertório, técnica e autonomia." }),
        /* @__PURE__ */ jsx("p", { children: "Sua metodologia une rigor acadêmico a uma orientação próxima e acolhedora — porque cada aprovação começa quando o aluno entende que é capaz." }),
        /* @__PURE__ */ jsxs("div", { className: "signature", children: [
          /* @__PURE__ */ jsx("span", { className: "signature-name", children: "Carla Patrícia Medina" }),
          /* @__PURE__ */ jsx("small", { children: "Domine as palavras. Transforme suas ideias." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mini-values", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(ShieldCheck, {}),
            " Ensino responsável"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(Users, {}),
            " Acompanhamento humano"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("a", { className: "inline-arrow", href: "#metodologia", children: [
          "Conheça minha trajetória ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 17 })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "method section-full", id: "metodologia", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-heading centered light", children: [
        /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Método CPM" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "Um caminho claro entre o seu texto de hoje e a ",
          /* @__PURE__ */ jsx("em", { children: "aprovação de amanhã." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Técnica, prática e acompanhamento em uma experiência de aprendizagem desenhada para gerar evolução real." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "method-grid", children: methods.map((item, index) => /* @__PURE__ */ jsxs(motion.article, { className: "method-card", ...reveal, transition: {
        duration: 0.55,
        delay: index * 0.06
      }, children: [
        /* @__PURE__ */ jsxs("div", { className: "method-number", children: [
          "0",
          index + 1
        ] }),
        /* @__PURE__ */ jsx(item.icon, {}),
        /* @__PURE__ */ jsx("h3", { children: item.title }),
        /* @__PURE__ */ jsx("p", { children: item.text }),
        /* @__PURE__ */ jsx("span", { className: "card-line" })
      ] }, item.title)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "courses section-full", id: "cursos", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-heading split", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Escolha sua jornada" }),
          /* @__PURE__ */ jsxs("h2", { children: [
            "Cursos criados para o seu ",
            /* @__PURE__ */ jsx("em", { children: "próximo nível." })
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Da base à alta performance, encontre a experiência que combina com seu momento e seus objetivos." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "course-grid", children: courses.map((course, index) => /* @__PURE__ */ jsxs(motion.article, { className: `course-card ${index === 0 ? "featured" : ""}`, ...reveal, transition: {
        delay: index * 0.08
      }, children: [
        /* @__PURE__ */ jsxs("div", { className: "course-image", children: [
          /* @__PURE__ */ jsx("img", { src: course.image, alt: "" }),
          /* @__PURE__ */ jsx("span", { children: course.tag })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "course-body", children: [
          /* @__PURE__ */ jsxs("small", { children: [
            "0",
            index + 1,
            " · Formação"
          ] }),
          /* @__PURE__ */ jsx("h3", { children: course.title }),
          /* @__PURE__ */ jsx("p", { children: course.text }),
          /* @__PURE__ */ jsx("ul", { children: course.items.map((item) => /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx(Check, { size: 15 }),
            " ",
            item
          ] }, item)) }),
          /* @__PURE__ */ jsxs("a", { href: "#contato", children: [
            "Saiba mais ",
            /* @__PURE__ */ jsx(ArrowRight, { size: 17 })
          ] })
        ] })
      ] }, course.title)) }),
      /* @__PURE__ */ jsx("div", { className: "secondary-courses", children: ["Mentoria Coletiva", "Simuladinhos", "Simuladão Intensivo"].map((item, index) => /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsxs("b", { children: [
          "0",
          index + 4
        ] }),
        item,
        /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
      ] }, item)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "results", id: "resultados", children: [
      /* @__PURE__ */ jsxs(motion.div, { className: "results-copy", ...reveal, children: [
        /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Resultados que falam" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "Mais do que notas.",
          /* @__PURE__ */ jsx("br", {}),
          /* @__PURE__ */ jsx("em", { children: "Novas possibilidades." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Quando existe método, acompanhamento e constância, a evolução deixa de ser promessa e vira conquista." }),
        /* @__PURE__ */ jsxs("div", { className: "result-numbers", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("b", { children: "98%" }),
            /* @__PURE__ */ jsx("span", { children: "recomendam o método" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("b", { children: "+180" }),
            /* @__PURE__ */ jsx("span", { children: "pontos de evolução média" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "university-cloud", "aria-label": "Universidades com alunos aprovados", children: ["USP", "UFMG", "UNESP", "UFJF", "PUC", "UnB"].map((name, i) => /* @__PURE__ */ jsxs(motion.span, { ...reveal, transition: {
        delay: i * 0.06
      }, children: [
        name,
        /* @__PURE__ */ jsx("small", { children: "aprovações" })
      ] }, name)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "testimonials section-full", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-heading centered", children: [
        /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Histórias reais" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "Quem viveu a transformação ",
          /* @__PURE__ */ jsx("em", { children: "conta melhor." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "testimonial-wrap", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setTestimonial((testimonial + testimonials.length - 1) % testimonials.length), "aria-label": "Depoimento anterior", children: "←" }),
        /* @__PURE__ */ jsxs(motion.article, { initial: {
          opacity: 0,
          y: 12
        }, animate: {
          opacity: 1,
          y: 0
        }, children: [
          /* @__PURE__ */ jsx(Quote, { className: "big-quote" }),
          /* @__PURE__ */ jsx("div", { className: "stars", children: [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsx(Star, { fill: "currentColor" }, n)) }),
          /* @__PURE__ */ jsxs("blockquote", { children: [
            "“",
            testimonials[testimonial].text,
            "”"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "student", children: [
            /* @__PURE__ */ jsx("img", { src: testimonials[testimonial].image, alt: testimonials[testimonial].name }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("b", { children: testimonials[testimonial].name }),
              /* @__PURE__ */ jsx("small", { children: testimonials[testimonial].result })
            ] })
          ] })
        ] }, testimonial),
        /* @__PURE__ */ jsx("button", { onClick: () => setTestimonial((testimonial + 1) % testimonials.length), "aria-label": "Próximo depoimento", children: "→" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "dots", children: testimonials.map((_, index) => /* @__PURE__ */ jsx("button", { className: index === testimonial ? "active" : "", onClick: () => setTestimonial(index), "aria-label": `Ver depoimento ${index + 1}` }, index)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "platform-preview section-full", children: [
      /* @__PURE__ */ jsxs(motion.div, { className: "platform-copy", ...reveal, children: [
        /* @__PURE__ */ jsxs("span", { className: "pill", children: [
          /* @__PURE__ */ jsx(Zap, { size: 14 }),
          " Tudo em um só lugar"
        ] }),
        /* @__PURE__ */ jsx("h2", { children: "Uma plataforma que acompanha o seu ritmo." }),
        /* @__PURE__ */ jsx("p", { children: "Aulas, materiais, correções, simulados e progresso organizados para você focar no que realmente importa: aprender." }),
        /* @__PURE__ */ jsxs("div", { className: "platform-features", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(CirclePlay, {}),
            " Aulas e trilhas"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(FileCheck2, {}),
            " Correções detalhadas"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(TrendingUp, {}),
            " Evolução visual"
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx(CalendarDays, {}),
            " Agenda organizada"
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Link, { className: "button light-button", to: "/login", children: [
          "Entrar na área do aluno ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 18 })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(motion.div, { className: "dashboard-mock", ...reveal, children: [
        /* @__PURE__ */ jsxs("div", { className: "mock-sidebar", children: [
          /* @__PURE__ */ jsx("b", { children: "CP" }),
          [1, 2, 3, 4, 5, 6].map((i) => /* @__PURE__ */ jsx("span", { className: i === 1 ? "active" : "" }, i))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mock-content", children: [
          /* @__PURE__ */ jsxs("div", { className: "mock-top", children: [
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("i", {})
          ] }),
          /* @__PURE__ */ jsx("h4", { children: "Olá, Marina!" }),
          /* @__PURE__ */ jsx("p", { children: "Continue firme. Sua aprovação está cada vez mais perto." }),
          /* @__PURE__ */ jsxs("div", { className: "mock-grid", children: [
            /* @__PURE__ */ jsxs("div", { className: "mock-progress", children: [
              /* @__PURE__ */ jsx("small", { children: "Progresso geral" }),
              /* @__PURE__ */ jsx("b", { children: "76%" }),
              /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx("i", {}) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mock-class", children: [
              /* @__PURE__ */ jsx("small", { children: "Próxima aula" }),
              /* @__PURE__ */ jsx("b", { children: "Projeto de texto" }),
              /* @__PURE__ */ jsx("em", { children: "Hoje · 19h" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mock-chart", children: [
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {}),
            /* @__PURE__ */ jsx("span", {})
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "faq section", id: "faq", children: [
      /* @__PURE__ */ jsxs("div", { className: "faq-intro", children: [
        /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Perguntas frequentes" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "Tudo o que você precisa saber para ",
          /* @__PURE__ */ jsx("em", { children: "começar." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Ainda ficou com alguma dúvida?" }),
        /* @__PURE__ */ jsxs("a", { href: "#contato", children: [
          "Fale com a nossa equipe ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "accordion", children: faqs.map(([question, answer], index) => /* @__PURE__ */ jsxs("div", { className: `faq-item ${activeFaq === index ? "active" : ""}`, children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setActiveFaq(activeFaq === index ? -1 : index), children: [
          /* @__PURE__ */ jsx("span", { children: question }),
          /* @__PURE__ */ jsx(ChevronDown, {})
        ] }),
        activeFaq === index && /* @__PURE__ */ jsx(motion.p, { initial: {
          opacity: 0
        }, animate: {
          opacity: 1
        }, children: answer })
      ] }, question)) })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "contact section-full", id: "contato", children: /* @__PURE__ */ jsxs("div", { className: "contact-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "contact-copy", children: [
        /* @__PURE__ */ jsx("div", { className: "section-kicker", children: "Vamos conversar?" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "O próximo capítulo da sua história pode começar ",
          /* @__PURE__ */ jsx("em", { children: "agora." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Conte seus objetivos. Nossa equipe ajuda você a escolher o melhor caminho." }),
        /* @__PURE__ */ jsxs("div", { className: "contact-channels", children: [
          /* @__PURE__ */ jsxs("a", { href: "https://wa.me/2299932-5306
", children: [
            /* @__PURE__ */ jsx(MessageCircle, {}),
            " WhatsApp"
          ] }),
          /* @__PURE__ */ jsxs("a", { href: "mailto:contato@carlapatriciamedina.com.br", children: [
            /* @__PURE__ */ jsx(Mail, {}),
            " E-mail"
          ] }),
          /* @__PURE__ */ jsxs("a", { href: "https://instagram.com/carlapatricia.medina", children: [
            /* @__PURE__ */ jsx(Instagram, {}),
            " Instagram"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "contact-form", name: "contato", onSubmit: submitContact, children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "form-name", value: "contato" }),
        /* @__PURE__ */ jsx("input", { className: "hidden-field", name: "bot-field", tabIndex: -1, autoComplete: "off" }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Seu nome",
          /* @__PURE__ */ jsx("input", { name: "nome", placeholder: "Como podemos chamar você?", required: true })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxs("label", { children: [
            "E-mail",
            /* @__PURE__ */ jsx("input", { type: "email", name: "email", placeholder: "voce@email.com", required: true })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "WhatsApp",
            /* @__PURE__ */ jsx("input", { name: "telefone", placeholder: "(00) 00000-0000" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Como podemos ajudar?",
          /* @__PURE__ */ jsx("textarea", { name: "mensagem", placeholder: "Conte um pouco sobre seu objetivo...", rows: 4, required: true })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "button", disabled: formState === "sending", children: [
          formState === "sending" ? "Enviando..." : "Enviar mensagem",
          " ",
          /* @__PURE__ */ jsx(Send, { size: 17 })
        ] }),
        formState === "success" && /* @__PURE__ */ jsx("p", { className: "form-message success", children: "Mensagem enviada. Em breve entraremos em contato!" }),
        formState === "error" && /* @__PURE__ */ jsx("p", { className: "form-message error", children: "Não foi possível enviar. Tente novamente." })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("footer", { children: [
      /* @__PURE__ */ jsxs("div", { className: "footer-main", children: [
        /* @__PURE__ */ jsxs("div", { className: "footer-brand", children: [
          /* @__PURE__ */ jsxs("a", { className: "brand", href: "#inicio", children: [
            /* @__PURE__ */ jsx("span", { className: "brand-mark", children: "CP" }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("b", { children: "Carla Patrícia" }),
              /* @__PURE__ */ jsx("small", { children: "Medina · Educação" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "Sua aprovação começa por uma redação de excelência." }),
          /* @__PURE__ */ jsxs("div", { className: "socials", children: [
            /* @__PURE__ */ jsx("a", { href: "https://instagram.com/carlapatricia.medina", "aria-label": "Instagram", children: /* @__PURE__ */ jsx(Instagram, {}) }),
            /* @__PURE__ */ jsx("a", { href: "https://wa.me/2299932-5306", "aria-label": "WhatsApp", children: /* @__PURE__ */ jsx(MessageCircle, {}) }),
            /* @__PURE__ */ jsx("a", { href: "mailto:contato@carlapatriciamedina.com.br", "aria-label": "E-mail", children: /* @__PURE__ */ jsx(Mail, {}) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "Navegue" }),
          /* @__PURE__ */ jsx("a", { href: "#sobre", children: "Sobre" }),
          /* @__PURE__ */ jsx("a", { href: "#metodologia", children: "Metodologia" }),
          /* @__PURE__ */ jsx("a", { href: "#cursos", children: "Cursos" }),
          /* @__PURE__ */ jsx("a", { href: "#resultados", children: "Resultados" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "Conteúdo" }),
          /* @__PURE__ */ jsx("a", { href: "#faq", children: "FAQ" }),
          /* @__PURE__ */ jsx("a", { href: "#contato", children: "Contato" }),
          /* @__PURE__ */ jsx(Link, { to: "/dashboard", children: "Área do aluno" }),
          /* @__PURE__ */ jsx(Link, { to: "/login", children: "Entrar" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "Fale conosco" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "contato@carla",
            /* @__PURE__ */ jsx("br", {}),
            "patriciamedina.com.br"
          ] }),
          /* @__PURE__ */ jsx("span", { children: "Seg–Sex · 9h às 18h" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "footer-bottom", children: [
        /* @__PURE__ */ jsx("span", { children: "© 2026 Carla Patrícia Medina. Todos os direitos reservados." }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("a", { href: "#", children: "Privacidade" }),
          /* @__PURE__ */ jsx("a", { href: "#", children: "Termos de uso" }),
          /* @__PURE__ */ jsx("a", { href: "#", children: "LGPD" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("a", { className: "whatsapp-float", href: "https://wa.me/5522999325306", "aria-label": "Conversar no WhatsApp", children: /* @__PURE__ */ jsx(MessageCircle, {}) })
  ] });
}
export {
  HomePage as component
};
