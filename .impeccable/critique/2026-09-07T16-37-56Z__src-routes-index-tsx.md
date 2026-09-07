---
target: secao Aprovados na home (src/routes/index.tsx)
total_score: 18
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
timestamp: 2026-09-07T16-37-56Z
slug: src-routes-index-tsx
---
Method: dual-agent (A: ac3a676040e955c94 · B: a7b66a0eae2dff814)

# Critique — "Aprovados" public section (src/routes/index.tsx)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2/4 | No loading state; section + nav item appear post-hydration, reflowing header 7→8 links |
| 2 | Match System / Real World | 3/4 | "Resultados" and "Aprovados" sit adjacent in nav with no differentiation |
| 3 | User Control and Freedom | 2/4 | Name/university/course/quote clamped with only `title` as escape — useless on touch |
| 4 | Consistency and Standards | 3/4 | Card reused correctly; `.aprovados-section` matches zero CSS rules (confirmed by both assessments) |
| 5 | Error Prevention | 2/4 | Nothing guards broken photo, 1-2 card gallery under "300+" claim, unbounded growth |
| 6 | Recognition Rather Than Recall | 3/4 | Faces+university+year is right format but disconnected from Resultados stats above |
| 7 | Flexibility and Efficiency | n/a | Persuade-mode marketing page |
| 8 | Aesthetic and Minimalist Design | 2/4 | Dead space on quote-less cards, floating rule on course-less cards, ~275px white void to next section |
| 9 | Error Recovery | 1/4 | Silent `.catch(() => {})` — fetch failure hides section with no signal |
| 10 | Help and Documentation | n/a | Not applicable to public homepage |
| **Total** | | **18/32 (56%)** | **Acceptable** |

## Design Specificity Verdict
Card = specific (graduation-wall cultural artifact, brand gold accent reused, voice-correct copy). Section wrapper = generic (centered heading + auto-fill grid, no CTA, no counter, disconnected from the "300+"/university claims one section above). Detector: 0 findings (clean).

## Priority Issues
- [P0] Subheading contrast 1.94:1 (`.section-heading > p` #aebbd0 on white) — needs 4.5:1. Fix: `.aprovados-section .section-heading > p { color: #667085; }`. → colorize
- [P1] No CTA/counter bridging "300+" claim; `.aprovados-section` has zero matching CSS rule, white-on-white against testimonials, ~275px void. → bolder
- [P1] Full base64 gallery fetched eagerly on load (confirmed via network timing), no SSR/pagination — degrades as roster grows, invisible to SEO/no-JS. → optimize
- [P1] Cards with missing quote/course show dead space / floating border (structural CSS issue). → harden
- [P2] Name is `<b>` not heading; year badge contrast 2.41–3.17:1 (fails AA); silent catch on fetch failure. → audit
- [P3] Heading widow risk, ragged last grid row, dead `.aprovado-card-skeleton` CSS. → typeset

## Persona Red Flags
- Jordan: can't differentiate "Resultados"/"Aprovados" in nav; near-invisible persuasive subheading.
- Riley: name truncation with no mobile-usable escape; empty-card dead space; floating border; dead skeleton CSS.
- Project persona (mother researching on phone): illegible year badges, no count vs "300+", no next step after belief is built.

## Minor Observations
- Pre-existing: `href="#início"` vs `id="inicio"` mismatch (unrelated broken anchor, noted in passing).
- `photoFileName` stored, never consumed.
- No `scroll-margin-top` for sticky header on anchor links.
- Chronological sort not communicated in UI.

## Questions to Consider
1. Should this merge into "Resultados" (faces flowing from stats on navy ground) instead of a separate section?
2. What happens at 60 approved students, given full-fetch/base64/render-all architecture?
3. Quote field duplicates the Testimonials carousel below — which should win?
