# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience: high school students in Brazil preparing for the ENEM and vestibulares (university entrance exams), enrolling to improve their Redação (essay) and Gramática (Portuguese language) skills under Carla Patrícia Medina's personal methodology. A secondary "concursos" (public-service exam) track exists but is not the dominant audience.

Two staff roles operate the platform (`src/lib/roles.ts`): `professor` (restricted access — correcting essays, reminders, tips) and `admin` (full access, manages every content section via parallel `*-admin` routes). New sign-ups can land in an "aguardando aprovação" (awaiting approval) state before gaining student access.

## Product Purpose

A premium institutional site that converts visitors into enrolled students, paired with an authenticated student LMS dashboard that tracks lessons, essay corrections, materials, goals, and progress toward exam-day readiness. Success is measured in essay-score gains and university admissions.

## Positioning

22+ years of hands-on teaching experience combined with personalized, human essay correction (not templated feedback) and a fully integrated LMS (progress tracking, live classes, mentoring, essay themes, watermarked materials) inside one cohesive branded experience — a claim a generic redação course or a bare Netlify Identity/Forms integration could not truthfully make together.

## Operating Context

- Institutional marketing site: presentation, methodology, courses, results, testimonials, FAQ, contact (Netlify Forms with honeypot).
- Authenticated student dashboard/LMS (`src/routes/dashboard.tsx` and peers): aulas (classes), aulas ao vivo (live classes), redações (essay submission/correction), temas de redação (essay prompts), materiais (watermarked downloadable materials), mentorias (mentoring), progresso (progress/competencies tracking), calendário, lembretes (reminders), and notifications for new/released content.
- Staff/admin operating surface: parallel `*-admin` routes for managing every content section, essay correction workflow, and live-class administration.
- Auth via `@netlify/identity`; role and identity extraction is defensive against inconsistent Identity payload shapes (`src/lib/roles.ts`).
- Legal/compliance pages exist for LGPD, privacidade, and termos — Brazilian data-protection compliance is a standing constraint, not optional boilerplate.
- All user-facing copy is Brazilian Portuguese.

## Capabilities and Constraints

- Stack: React 19 + TypeScript, TanStack Start/Router, Vite, Tailwind CSS 4, Framer Motion, Lucide icons, Netlify Identity + Netlify Forms, Netlify Blobs.
- Materials are watermarked before distribution (`src/lib/watermark.ts`) — protecting downloadable content from redistribution is a functional requirement, not cosmetic.
- Content sections follow an "em-breve" (coming soon) placeholder pattern before a section ships.
- Dashboard routes must stay behind the Identity `beforeLoad` check (per `AGENTS.md`); do not expose student data unauthenticated.
- No specific accessibility requirement beyond general WCAG best practice (confirmed with the user).

## Brand Commitments

- Name: Carla Patrícia Medina.
- Established visual identity in `src/styles.css`: navy (`#0f2d52` / `#091e39`), purple (`#6d28d9` / `#5420ac` / `#7c3aed`), gold (`#c8a24d`), serif display headings, restrained editorial layout with generous whitespace (per `AGENTS.md`).
- The purple brand tone is actively protected: recent work realigned the student-area purple to exactly match the homepage purple — treat existing brand colors as a locked identity, not a starting point to reinterpret.
- Voice: warm, human, experienced ("22 anos de experiência", personalized correction) rather than corporate/generic edtech.

## Evidence on Hand

Confirmed real (not placeholder) by the user:
- 5.000+ redações corrigidas (essays corrected).
- 300+ alunos aprovados (students admitted).
- University admissions at FMC, FMP, UFF, UENF, UVV, UFRJ.
- 4,9/5 average student satisfaction rating.
- 22+ years of teaching experience.

These numbers and names are durable product truth — preserve them exactly; do not dilute, round differently, or invent additional proof points (new testimonials, new universities, new stats) beyond what the codebase or the user confirms.

## Product Principles

1. Personalized, human correction over generic/templated feedback is the core differentiator — never let a design or copy change make the experience feel automated or templated.
2. The track record (specific universities, essay-score gains, correction volume) anchors trust; these numbers are sacred and must read as credible, not decorative.
3. One continuous, visually consistent experience spans acquisition (institutional site) and retention (LMS dashboard) — the brand does not fork between marketing and product.
4. ENEM/vestibular high-schoolers are the primary audience; optimize tone, content, and workflow priority for them first, even though a concursos track exists.
5. Staff tooling (admin/professor) is Operate mode — scanability and consistency outrank expression — while the institutional site is Persuade mode and the student dashboard is Operate mode with warmth.

## Accessibility & Inclusion

General WCAG best practice; no product-specific requirement beyond that was identified.
