# Carla Patrícia Medina — Plataforma Educacional

Plataforma educacional premium para ensino de Redação, Gramática e Língua Portuguesa. O projeto reúne um site institucional orientado à conversão, autenticação de alunos e uma experiência LMS responsiva para acompanhamento de aulas, correções, metas e progresso.

## Principais experiências

- Site institucional completo com apresentação, metodologia, cursos, resultados, depoimentos, FAQ e contato.
- Área de autenticação com login e cadastro por Netlify Identity.
- Dashboard protegido com progresso, próximas aulas, metas, redações corrigidas e conteúdos recentes.
- Formulário de contato processado pelo Netlify Forms com proteção honeypot.
- SEO básico com metadados sociais, `robots.txt` e `sitemap.xml`.
- Design responsivo, acessível e otimizado para desktop, tablet e celular.

## Tecnologias

- React 19 e TypeScript
- TanStack Start e TanStack Router
- Vite e Tailwind CSS 4
- Framer Motion e Lucide Icons
- Netlify Identity e Netlify Forms

## Executando localmente

Instale as dependências e inicie o ambiente:

```bash
pnpm install
pnpm dev
```

Para testar autenticação e integrações da plataforma Netlify localmente:

```bash
netlify dev --port 8889
```

O site básico fica disponível na porta informada pelo terminal. Recursos de Identity e Forms dependem do ambiente Netlify e devem ser validados em um deploy preview.
