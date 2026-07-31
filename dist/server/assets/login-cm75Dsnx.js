import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { signup, login, AuthError } from "@netlify/identity";
import { ArrowLeft, Sparkles, Check, GraduationCap, Mail, LockKeyhole, EyeOff, Eye, ArrowRight } from "lucide-react";
import { useState } from "react";
import { r as registerLocalUser, l as loginLocalUser } from "./router-BSoNPTDa.js";
import "../server.js";
import "node:async_hooks";
import "node:stream";
import "@tanstack/react-router/ssr/server";
function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isLocalDemoMode = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const name = String(data.get("name") || "Aluno").trim();
    const cpf = String(data.get("cpf") || "").trim();
    try {
      if (isLocalDemoMode) {
        if (mode === "signup") {
          if (!name || !cpf || !email || password.length < 6) {
            setError("Preencha nome, CPF, e-mail e senha com pelo menos 6 caracteres.");
            return;
          }
          const registered = registerLocalUser({
            name,
            cpf,
            email,
            password
          });
          if (!registered) {
            setError("Já existe uma conta para este e-mail. Faça login ou use outro endereço.");
            return;
          }
          setNotice("Conta criada com sucesso. Redirecionando...");
          await navigate({
            to: "/dashboard"
          });
          return;
        }
        const localUser = loginLocalUser(email, password);
        if (!localUser) {
          setError("E-mail ou senha inválidos no ambiente local. Crie a conta primeiro.");
          return;
        }
      }
      if (mode === "signup") {
        const user = await signup(email, password, {
          full_name: name,
          cpf
        });
        if (!user.confirmedAt) {
          setNotice("Cadastro realizado. Confirme o link enviado para o seu e-mail.");
          return;
        }
      } else {
        await login(email, password);
      }
      await navigate({
        to: "/dashboard"
      });
    } catch (caughtError) {
      const message = caughtError instanceof AuthError ? caughtError.message : "Não foi possível acessar. Tente novamente.";
      if (isLocalDemoMode && mode === "signup") {
        const registered = registerLocalUser({
          name,
          cpf,
          email,
          password
        });
        if (!registered) {
          setError("Já existe uma conta para este e-mail. Faça login ou use outro endereço.");
          return;
        }
        setNotice("Ambiente local sem Netlify Identity configurado. Conta criada localmente para uso de teste.");
        await navigate({
          to: "/dashboard"
        });
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("main", { className: "login-page", children: [
    /* @__PURE__ */ jsxs("section", { className: "login-panel brand-panel", children: [
      /* @__PURE__ */ jsxs(Link, { className: "back-home", to: "/", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { size: 17 }),
        " Voltar ao site"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "login-brand", children: [
        /* @__PURE__ */ jsx("span", { className: "brand-mark", children: "CP" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "Carla Patrícia" }),
          /* @__PURE__ */ jsx("small", { children: "Medina · Educação" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "brand-panel-copy", children: [
        /* @__PURE__ */ jsxs("span", { className: "pill", children: [
          /* @__PURE__ */ jsx(Sparkles, { size: 14 }),
          " Espaço do aluno"
        ] }),
        /* @__PURE__ */ jsxs("h1", { children: [
          "Seu conhecimento.",
          /* @__PURE__ */ jsx("br", {}),
          /* @__PURE__ */ jsx("em", { children: "Sua conquista." })
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Organize seus estudos, acompanhe sua evolução e mantenha sua aprovação sempre à vista." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "login-benefits", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(Check, {}),
          " Conteúdo organizado em trilhas"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(Check, {}),
          " Correções e feedbacks em um só lugar"
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(Check, {}),
          " Acompanhamento completo da evolução"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "login-quote", children: [
        /* @__PURE__ */ jsx("p", { children: "“A constância transforma o que parece distante em uma conquista possível.”" }),
        /* @__PURE__ */ jsx("span", { children: "Carla Patrícia Medina" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "login-panel form-panel", children: /* @__PURE__ */ jsxs("div", { className: "login-form-wrap", children: [
      /* @__PURE__ */ jsxs("div", { className: "mobile-login-brand", children: [
        /* @__PURE__ */ jsx(GraduationCap, {}),
        " CPM Educação"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "login-heading", children: [
        /* @__PURE__ */ jsx("span", { children: "Bem-vindo(a)" }),
        /* @__PURE__ */ jsx("h2", { children: mode === "login" ? "Continue sua jornada." : "Comece sua jornada." }),
        /* @__PURE__ */ jsx("p", { children: mode === "login" ? "Acesse sua conta para continuar seus estudos." : "Crie sua conta para acessar a plataforma." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "auth-tabs", children: [
        /* @__PURE__ */ jsx("button", { className: mode === "login" ? "active" : "", onClick: () => setMode("login"), children: "Entrar" }),
        /* @__PURE__ */ jsx("button", { className: mode === "signup" ? "active" : "", onClick: () => setMode("signup"), children: "Criar conta" })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "login-form", onSubmit: handleSubmit, children: [
        mode === "signup" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("label", { children: [
            "Nome completo",
            /* @__PURE__ */ jsxs("div", { className: "input-icon", children: [
              /* @__PURE__ */ jsx(GraduationCap, {}),
              /* @__PURE__ */ jsx("input", { name: "name", placeholder: "Seu nome completo", required: true })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "CPF",
            /* @__PURE__ */ jsxs("div", { className: "input-icon", children: [
              /* @__PURE__ */ jsx(GraduationCap, {}),
              /* @__PURE__ */ jsx("input", { name: "cpf", placeholder: "000.000.000-00", inputMode: "numeric", required: true })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "E-mail",
          /* @__PURE__ */ jsxs("div", { className: "input-icon", children: [
            /* @__PURE__ */ jsx(Mail, {}),
            /* @__PURE__ */ jsx("input", { type: "email", name: "email", placeholder: "voce@email.com", required: true })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Senha",
          /* @__PURE__ */ jsxs("div", { className: "input-icon", children: [
            /* @__PURE__ */ jsx(LockKeyhole, {}),
            /* @__PURE__ */ jsx("input", { type: showPassword ? "text" : "password", name: "password", placeholder: "Mínimo de 6 caracteres", minLength: 6, required: true }),
            /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), "aria-label": "Mostrar senha", children: showPassword ? /* @__PURE__ */ jsx(EyeOff, {}) : /* @__PURE__ */ jsx(Eye, {}) })
          ] })
        ] }),
        mode === "login" && /* @__PURE__ */ jsxs("div", { className: "login-options", children: [
          /* @__PURE__ */ jsxs("label", { children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox" }),
            " Lembrar de mim"
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", children: "Esqueci minha senha" })
        ] }),
        error && /* @__PURE__ */ jsx("p", { className: "form-message error", children: error }),
        notice && /* @__PURE__ */ jsx("p", { className: "form-message success", children: notice }),
        /* @__PURE__ */ jsxs("button", { className: "button login-submit", disabled: loading, children: [
          loading ? "Aguarde..." : mode === "login" ? "Entrar na plataforma" : "Criar minha conta",
          " ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 17 })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "login-support", children: [
        "Precisa de ajuda? ",
        /* @__PURE__ */ jsx("a", { href: "mailto:contato@carlapatriciamedina.com.br", children: "Fale com o suporte" })
      ] })
    ] }) })
  ] });
}
export {
  LoginPage as component
};
