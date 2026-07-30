# Project Guide

## Overview

This repository contains the Carla Patrícia Medina educational platform: a premium institutional website combined with an authenticated student learning dashboard. It uses TanStack Start, React, TypeScript, Tailwind CSS 4, Framer Motion, Netlify Identity, and Netlify Forms.

## Architecture

- `src/routes/index.tsx`: institutional landing page, course presentation, testimonials, FAQ, and contact experience.
- `src/routes/login.tsx`: headless Netlify Identity login and registration interface.
- `src/routes/dashboard.tsx`: authenticated student dashboard and LMS overview.
- `src/lib/auth.ts`: server-side Identity session lookup used by protected routes.
- `src/lib/identity-context.tsx`: browser auth state and logout actions.
- `src/components/CallbackHandler.tsx`: Identity callback token handling.
- `src/styles.css`: global design system and responsive layouts for all experiences.
- `public/contact-form.html`: static Netlify Forms registration skeleton.
- `public/robots.txt` and `public/sitemap.xml`: search engine discovery files.

## Conventions

- Keep routes focused on page composition; extract reusable logic into `src/lib` or `src/components`.
- Use the existing CSS variables for brand colors and typography.
- Preserve the editorial visual direction: deep navy, restrained purple, warm gold, generous whitespace, and serif display type.
- Use Lucide icons and Framer Motion rather than custom icon assets or JavaScript animation loops.
- Maintain Portuguese user-facing copy and WCAG-friendly labels, focus states, and semantic structure.
- Persistent forms must use Netlify Forms, and authentication must use `@netlify/identity`.
- Do not expose the dashboard without the `beforeLoad` Identity check.

## Local Development

Use `pnpm dev` for basic frontend work or `netlify dev --port 8889` when testing Netlify Identity and Forms behavior. Production validation is handled by the Netlify build pipeline.
