import { createRootRoute, HeadContent, Scripts, createFileRoute, lazyRouteComponent, redirect, createRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState, createContext, useContext } from "react";
import { handleAuthCallback, getUser, onAuthChange, logout } from "@netlify/identity";
import { T as TSS_SERVER_FUNCTION, g as getServerFnById, c as createServerFn } from "../server.js";
const AUTH_HASH_PATTERN = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;
function CallbackHandler({ children }) {
  useEffect(() => {
    if (AUTH_HASH_PATTERN.test(window.location.hash)) void handleAuthCallback();
  }, []);
  return children;
}
const IdentityContext = createContext(null);
function IdentityProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getUser().then((currentUser) => {
      setUser(currentUser);
      setReady(true);
    });
    return onAuthChange((_event, currentUser) => setUser(currentUser));
  }, []);
  const logout$1 = async () => {
    await logout();
    setUser(null);
  };
  return /* @__PURE__ */ jsx(IdentityContext.Provider, { value: { user, ready, logout: logout$1 }, children });
}
function useIdentity() {
  const context = useContext(IdentityContext);
  if (!context) throw new Error("useIdentity must be used within IdentityProvider");
  return context;
}
const Route$3 = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Carla Patrícia Medina | Redação e Língua Portuguesa" },
      {
        name: "description",
        content: "Aulas de Redação, Gramática e Língua Portuguesa com correção personalizada para ENEM, vestibulares e concursos."
      },
      { name: "theme-color", content: "#0F2D52" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Carla Patrícia Medina | Sua aprovação começa aqui" },
      {
        property: "og:description",
        content: "Metodologia exclusiva, correção individual e acompanhamento completo para sua aprovação."
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:image",
        content: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85"
      }
    ],
    links: [
      { rel: "canonical", href: "https://friendly-pothos-3cd60f.netlify.app/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap"
      }
    ]
  }),
  shellComponent: RootDocument
});
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "pt-BR", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx(HeadContent, {}),
      /* @__PURE__ */ jsx(
        "script",
        {
          type: "application/ld+json",
          dangerouslySetInnerHTML: {
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "Carla Patrícia Medina",
              description: "Cursos de Redação, Gramática e Língua Portuguesa.",
              url: "https://friendly-pothos-3cd60f.netlify.app/",
              areaServed: "Brasil"
            })
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(IdentityProvider, { children: /* @__PURE__ */ jsx(CallbackHandler, { children }) }),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$2 = () => import("./login-Bc7j7Usg.js");
const Route$2 = createFileRoute("/login")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getServerUser = createServerFn({
  method: "GET"
}).handler(createSsrRpc("49106938b52c8bf2e7795ac418917757130e43844a341613882f98c174227919"));
const $$splitComponentImporter$1 = () => import("./dashboard-C1jDwU6y.js");
const Route$1 = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const user = await getServerUser();
    if (!user) throw redirect({
      to: "/login"
    });
    return {
      user
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./index-5mPBJ73p.js");
const Route = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const LoginRoute = Route$2.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$3
});
const DashboardRoute = Route$1.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => Route$3
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$3
});
const rootRouteChildren = {
  IndexRoute,
  DashboardRoute,
  LoginRoute
};
const routeTree = Route$3._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  router as r,
  useIdentity as u
};
