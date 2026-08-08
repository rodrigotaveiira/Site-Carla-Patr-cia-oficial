import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { X, Home, CirclePlay, Library, Files, CircleHelp, Target, FileCheck2, CalendarDays, BookMarked, Zap, TrendingUp, User, MessageSquareText, LogOut, Menu, Search, Bell, ChevronRight, MoreHorizontal, Clock3, Trophy, BookOpen, ShieldCheck, Download } from "lucide-react";
import { useState } from "react";
import { u as useIdentity } from "./router-BSoNPTDa.js";
import "@netlify/identity";
import "../server.js";
import "node:async_hooks";
import "node:stream";
import "@tanstack/react-router/ssr/server";
const sidebarItems = [{
  icon: Home,
  label: "Dashboard",
  href: "#top"
}, {
  icon: CirclePlay,
  label: "Aulas",
  href: "#em-breve"
}, {
  icon: Library,
  label: "Biblioteca",
  href: "#em-breve"
}, {
  icon: Files,
  label: "Materiais",
  href: "#materiais"
}, {
  icon: CircleHelp,
  label: "Questões",
  href: "#em-breve"
}, {
  icon: Target,
  label: "Simulados",
  href: "#em-breve"
}, {
  icon: FileCheck2,
  label: "Redações",
  href: "#em-breve"
}, {
  icon: CalendarDays,
  label: "Calendário",
  href: "#em-breve"
}, {
  icon: BookMarked,
  label: "Repertórios",
  href: "#em-breve"
}, {
  icon: Zap,
  label: "Dicas",
  href: "#em-breve"
}, {
  icon: TrendingUp,
  label: "Meu progresso",
  href: "#em-breve"
}, {
  icon: User,
  label: "Perfil",
  href: "#em-breve"
}];
const materials = [{
  title: "Mapa mental da redação",
  tag: "Estratégia",
  accent: "#6d28d9",
  description: "Estrutura completa para organizar tese, argumentos e conclusão com clareza."
}, {
  title: "Checklist de revisão",
  tag: "Prático",
  accent: "#0f7890",
  description: "Lista rápida para revisar coesão, concordância, pontuação e bordão de apresentação."
}, {
  title: "Guia de repertório",
  tag: "Exclusivo",
  accent: "#c8a24d",
  description: "Temas e ideias prontas para enriquecer seus textos com segurança e naturalidade."
}];
function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}
function downloadProtectedMaterial(materialTitle, studentName) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#f8f4ff");
  background.addColorStop(1, "#eef7ff");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f2342";
  ctx.font = "700 72px Arial";
  ctx.fillText("Material exclusivo", 100, 140);
  ctx.fillStyle = "#6d28d9";
  ctx.font = "700 92px Arial";
  ctx.fillText(materialTitle, 100, 260);
  ctx.strokeStyle = "#d9d7e7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 330);
  ctx.lineTo(1100, 330);
  ctx.stroke();
  ctx.fillStyle = "#3b4455";
  ctx.font = "500 38px Arial";
  ctx.fillText("Propriedade do aluno:", 100, 418);
  ctx.fillStyle = "#111827";
  ctx.font = "700 52px Arial";
  ctx.fillText(studentName, 100, 490);
  ctx.fillStyle = "#a1a9b7";
  ctx.font = "600 26px Arial";
  ctx.fillText("Download protegido · uso pessoal com marca d'água", 100, 560);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(100, 640, 1e3, 720);
  ctx.strokeStyle = "#ece7f7";
  ctx.strokeRect(100, 640, 1e3, 720);
  ctx.fillStyle = "#111827";
  ctx.font = "700 54px Arial";
  ctx.fillText("Conteúdo do material", 150, 730);
  ctx.fillStyle = "#4b5563";
  ctx.font = "500 34px Arial";
  const lines = ["• Estratégia clara e visual", "• Conteúdo pensado para o aluno", "• Uso exclusivo da plataforma", "• Proteção por marca d'água com identidade"];
  lines.forEach((line, index) => {
    ctx.fillText(line, 150, 805 + index * 58);
  });
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-0.58);
  ctx.fillStyle = "rgba(109, 40, 217, 0.09)";
  ctx.font = "700 112px Arial";
  ctx.fillText(studentName.toUpperCase(), -620, 0);
  ctx.restore();
  const link = document.createElement("a");
  const fileName = `${slugify(materialTitle)}-${slugify(studentName)}.png`;
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
function DashboardPage() {
  const {
    user,
    logout
  } = useIdentity();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const studentName = user?.name || "";
  return /* @__PURE__ */ jsxs("main", { className: "student-app", children: [
    /* @__PURE__ */ jsxs("aside", { className: sidebarOpen ? "student-sidebar open" : "student-sidebar", children: [
      /* @__PURE__ */ jsxs("div", { className: "sidebar-head", children: [
        /* @__PURE__ */ jsxs(Link, { className: "dashboard-brand", to: "/", children: [
          /* @__PURE__ */ jsx("span", { className: "brand-mark", children: "CP" }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("b", { children: "Carla Patrícia" }),
            /* @__PURE__ */ jsx("small", { children: "Área do aluno" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setSidebarOpen(false), children: /* @__PURE__ */ jsx(X, {}) })
      ] }),
      /* @__PURE__ */ jsx("nav", { children: sidebarItems.map(({
        icon: Icon,
        label,
        href
      }, index) => /* @__PURE__ */ jsxs("a", { className: index === 0 ? "active" : "", href, children: [
        /* @__PURE__ */ jsx(Icon, {}),
        label,
        label === "Redações" && /* @__PURE__ */ jsx("i", { children: "2" })
      ] }, label)) }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar-help", children: [
        /* @__PURE__ */ jsx(MessageSquareText, {}),
        /* @__PURE__ */ jsx("b", { children: "Precisa de ajuda?" }),
        /* @__PURE__ */ jsx("p", { children: "Nossa equipe está por perto." }),
        /* @__PURE__ */ jsx("a", { href: "mailto:contato@carlapatriciamedina.com.br", children: "Falar com suporte" })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "logout", onClick: () => void logout(), children: [
        /* @__PURE__ */ jsx(LogOut, {}),
        " Sair da conta"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "student-main", id: "top", children: [
      /* @__PURE__ */ jsxs("header", { className: "dashboard-topbar", children: [
        /* @__PURE__ */ jsx("button", { className: "dashboard-menu", onClick: () => setSidebarOpen(true), children: /* @__PURE__ */ jsx(Menu, {}) }),
        /* @__PURE__ */ jsxs("div", { className: "dashboard-search", children: [
          /* @__PURE__ */ jsx(Search, {}),
          /* @__PURE__ */ jsx("input", { placeholder: "Buscar aulas, materiais, temas..." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "topbar-actions", children: [
          /* @__PURE__ */ jsxs("button", { children: [
            /* @__PURE__ */ jsx(Bell, {}),
            /* @__PURE__ */ jsx("i", {})
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "user-chip", children: [
            /* @__PURE__ */ jsx("img", { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80", alt: "Perfil" }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsxs("b", { children: [
                studentName,
                " "
              ] }),
              /* @__PURE__ */ jsx("small", { children: "Aluna · Redação" })
            ] }),
            /* @__PURE__ */ jsx(ChevronRight, {})
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "dashboard-content", children: [
        /* @__PURE__ */ jsxs("div", { className: "welcome-row", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { children: "TERÇA-FEIRA, 28 DE JULHO" }),
            /* @__PURE__ */ jsxs("h1", { children: [
              "Olá, ",
              studentName,
              "! ",
              /* @__PURE__ */ jsx("span", { children: "✦" })
            ] }),
            /* @__PURE__ */ jsx("p", { children: "Você está construindo um excelente ritmo. Continue assim!" })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "outline-button", children: [
            /* @__PURE__ */ jsx(CalendarDays, {}),
            " Ver calendário"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "dashboard-hero-card", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("span", { className: "pill", children: [
              /* @__PURE__ */ jsx(Zap, {}),
              " Sua jornada"
            ] }),
            /* @__PURE__ */ jsxs("h2", { children: [
              "Faltam ",
              /* @__PURE__ */ jsx("em", { children: "103 dias" }),
              " para a Prova da FMC."
            ] }),
            /* @__PURE__ */ jsx("p", { children: "Cada aula concluída hoje deixa você mais perto da aprovação." }),
            /* @__PURE__ */ jsxs("button", { children: [
              "Continuar estudando ",
              /* @__PURE__ */ jsx(CirclePlay, {})
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "hero-ring", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("b", { children: "76%" }),
            /* @__PURE__ */ jsx("span", { children: "progresso geral" })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "dashboard-decoration", children: "A+" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "dashboard-grid", children: [
          /* @__PURE__ */ jsxs("section", { className: "dashboard-card progress-card", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-title", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "Meu progresso" }),
                /* @__PURE__ */ jsx("h3", { children: "Visão geral" })
              ] }),
              /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(MoreHorizontal, {}) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "progress-list", children: [["Redação", "18 de 24 aulas", 75, "#6d28d9"], ["Gramática", "14 de 20 aulas", 70, "#0f7890"], ["Repertório", "8 de 16 aulas", 50, "#c8a24d"]].map(([title, detail, value, color]) => /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx("b", { children: title }),
                /* @__PURE__ */ jsx("small", { children: detail })
              ] }),
              /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("i", { style: {
                width: `${value}%`,
                background: color
              } }) }),
              /* @__PURE__ */ jsxs("strong", { children: [
                value,
                "%"
              ] })
            ] }, title)) }),
            /* @__PURE__ */ jsxs("a", { href: "#progresso", children: [
              "Ver relatório completo ",
              /* @__PURE__ */ jsx(ChevronRight, {})
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "dashboard-card next-class", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-title", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "Próxima aula" }),
                /* @__PURE__ */ jsx("h3", { children: "Hoje, às 19h" })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "live-dot", children: "Ao vivo" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "class-thumb", children: [
              /* @__PURE__ */ jsx("img", { src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85", alt: "Caderno de estudos" }),
              /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx(CirclePlay, {}) })
            ] }),
            /* @__PURE__ */ jsx("small", { children: "MÓDULO 04 · REDAÇÃO" }),
            /* @__PURE__ */ jsx("h4", { children: "Projeto de texto: da tese à conclusão" }),
            /* @__PURE__ */ jsxs("p", { children: [
              /* @__PURE__ */ jsx(Clock3, {}),
              " 1h30 de duração · Prof.ª Carla"
            ] }),
            /* @__PURE__ */ jsxs("button", { children: [
              "Entrar na aula ",
              /* @__PURE__ */ jsx(ChevronRight, {})
            ] })
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "dashboard-card weekly-goal", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-title", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "Meta semanal" }),
                /* @__PURE__ */ jsx("h3", { children: "4 de 5 atividades" })
              ] }),
              /* @__PURE__ */ jsx(Trophy, {})
            ] }),
            /* @__PURE__ */ jsx("div", { className: "week-days", children: ["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => /* @__PURE__ */ jsxs("span", { className: index < 4 ? "done" : index === 4 ? "today" : "", children: [
              /* @__PURE__ */ jsx("i", { children: index < 4 ? "✓" : index + 28 }),
              /* @__PURE__ */ jsx("small", { children: day })
            ] }, `${day}${index}`)) }),
            /* @__PURE__ */ jsx("p", { children: "Você está a uma atividade de completar sua meta!" })
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "dashboard-card recent-content", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-title", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "Continue de onde parou" }),
                /* @__PURE__ */ jsx("h3", { children: "Últimas aulas" })
              ] }),
              /* @__PURE__ */ jsx("a", { href: "#aulas", children: "Ver todas" })
            ] }),
            [["Competência 3: argumentação", "Redação · 72%", "32 min"], ["Concordância verbal", "Gramática · 45%", "28 min"], ["Repertório sociocultural", "Repertório · 20%", "41 min"]].map(([title, info, time], index) => /* @__PURE__ */ jsxs("div", { className: "recent-item", children: [
              /* @__PURE__ */ jsx("span", { className: `recent-icon icon-${index}`, children: /* @__PURE__ */ jsx(BookOpen, {}) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("b", { children: title }),
                /* @__PURE__ */ jsx("small", { children: info })
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx(Clock3, {}),
                time
              ] }),
              /* @__PURE__ */ jsx("button", { children: /* @__PURE__ */ jsx(CirclePlay, {}) })
            ] }, title))
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "dashboard-card material-card", id: "materiais", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-title", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "Arquivos exclusivos" }),
                /* @__PURE__ */ jsx("h3", { children: "Material protegido" })
              ] }),
              /* @__PURE__ */ jsx(ShieldCheck, {})
            ] }),
            /* @__PURE__ */ jsx("p", { className: "material-intro", children: "Baixe os materiais do curso com uma marca d'água personalizada com o nome do aluno para proteger cada arquivo." }),
            /* @__PURE__ */ jsx("div", { className: "material-list", children: materials.map((material) => /* @__PURE__ */ jsxs("div", { className: "material-item", children: [
              /* @__PURE__ */ jsx("div", { className: "material-badge", style: {
                background: `${material.accent}1a`,
                color: material.accent
              }, children: material.tag }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("b", { children: material.title }),
                /* @__PURE__ */ jsx("small", { children: material.description })
              ] }),
              /* @__PURE__ */ jsxs("button", { onClick: () => downloadProtectedMaterial(material.title, studentName), children: [
                /* @__PURE__ */ jsx(Download, {}),
                " Baixar"
              ] })
            ] }, material.title)) })
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "dashboard-card correction-card", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-title", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "Redação corrigida" }),
                /* @__PURE__ */ jsx("h3", { children: "Inteligência artificial e sociedade" })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "grade", children: "920" })
            ] }),
            /* @__PURE__ */ jsx("p", { children: "Seu texto demonstrou excelente domínio da proposta. Há uma nova correção pronta para você." }),
            /* @__PURE__ */ jsx("div", { className: "competencies", children: [180, 200, 160, 180, 200].map((score, index) => /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("i", { style: {
                height: `${score / 2.2}%`
              } }),
              /* @__PURE__ */ jsxs("small", { children: [
                "C",
                index + 1
              ] }),
              /* @__PURE__ */ jsx("b", { children: score })
            ] }, index)) }),
            /* @__PURE__ */ jsxs("button", { children: [
              "Ver correção detalhada ",
              /* @__PURE__ */ jsx(ChevronRight, {})
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  DashboardPage as component
}

