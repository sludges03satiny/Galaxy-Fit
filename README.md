# Galaxy Fit

A long-term hybrid athlete training PWA. Open the app. Know exactly what to do today.

Built for athletes who want a structured system that combines barbell strength, calisthenics skill progression, VO₂max development, and mobility — designed to run for 2–10 years without burnout or complexity.

---

## What It Does

Galaxy Fit replaces the decision fatigue of planning your own training. Every time you open it, it tells you what to do. You show up, follow the session, log your sets, and leave. The system handles progression, deloads, skill advancement, and readiness adjustment automatically.

**Six hubs:**

| Hub | Purpose |
|-----|---------|
| Dashboard | Readiness light + session start. One button. |
| Skill Tree | Visual constellation graph of calisthenics progressions. Nodes unlock automatically. |
| Calendar | Training history. No red X's on missed days — blank days are blank. |
| Benchmarks | 4-weekly test battery. Feeds load suggestions and skill calibration. |
| Move | Log free activity — runs, hikes, bike rides, yoga. Counts toward cardio targets. |
| Reference | Full methodology docs, HR zones, glossary. Searchable. |

---

## The Training System

### A/B/C Rolling Sequence

Three rotating day types. No fixed weekly schedule — miss a day, pick up exactly where you left off.

| Day | Focus | Main Lifts | Skill Work |
|-----|-------|-----------|------------|
| A | Lower Body | Squat, RDL, Split Squat | Handstand |
| B | Upper Push | Bench, OHP, Weighted Dip | L-sit, Back Lever |
| C | Upper Pull | Weighted Pull-up, Row, Deadlift | Front Lever |
| Z | Free Activity | — | Optional |

### Readiness Light

Before every session you enter your sleep score (Apple Watch 0–100) and stress level (1–10). The app adjusts the session automatically:

- 🟢 **Green** — Sleep ≥ 70 AND stress ≤ 5. Train as programmed.
- 🟡 **Yellow** — Sleep 60–69 OR stress 6–7. Drop RPE by 1, remove HIIT.
- 🔴 **Red** — Sleep < 60 OR stress ≥ 8. Skill + one main lift only.

### Skill Tree

Every calisthenics skill (Front Lever, Planche, Muscle-Up, Handstand, etc.) sits in a directed acyclic graph. Prerequisites must be unlocked before advanced nodes become available. The app tracks consecutive sessions and hold times — nodes advance automatically when criteria are met. You cannot self-promote.

Stall detection fires at 6+ sessions without advancing and surfaces a protocol card with a regression suggestion.

### Double Progression

Each lift has a rep range (e.g. 4×5–8). Hit the top of the range at RPE ≤ 8 → weight goes up next session. Can't hit the bottom → deload 10% and rebuild. Otherwise hold.

### 12-Week Blocks

| Phase | Weeks | Sets × Reps | RPE |
|-------|-------|-------------|-----|
| Accumulation | 1–4 | 3–4 × 5–8 | 6–7 |
| Deload | 5 | 3 × 5–8 | 5–6 |
| Intensification | 6–9 | 4 × 4–6 | 7–8 |
| Deload | 10 | 3 × 5–8 | 5–6 |
| Realization | 11–12 | 4–5 × 3–5 | 8–9 |

Deloads are structural — mandatory at weeks 5 and 10 regardless of how the athlete feels.

---

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **App type:** Progressive Web App (installable, works in browser)
- **Storage:** LocalStorage + JSON export/import
- **Hosting:** Vercel
- **Charts:** Pure SVG — no external chart libraries

---

## Design

Dark background (`#0a0a08`), lime accent (`#c8f050`), Bebas Neue headings, DM Mono data labels. Built to look like a serious training instrument, not a fitness influencer app.

The skill tree renders as a constellation map — locked nodes are dim, active nodes pulse, unlocked nodes glow.

---

## Skill Tree Sources

The progression data and skill node sequences are derived from:

- **Overcoming Gravity 2nd Edition** — Steven Low (primary authority)
- **Bodyweight Fitness Progressions v5.4** — r/bodyweightfitness
- **The Calisthenics Skill Tree template v1.6.1**

---

## Running Locally

```bash
git clone https://github.com/sludges03satiny/Galaxy-Fit
cd Galaxy-Fit
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

To build for production:

```bash
npm run build
vercel --prod
```

---

## Status

| Version | Status |
|---------|--------|
| V1 | ✅ Shipped — March 2026. All 6 hubs live. |
| V2 | 🔨 In development — skill tree redesign, multi-profile, imperial units, Apple Watch integration |

---

## Design Principles

1. Never guilt. Blank days are blank, not failures.
2. Always actionable. Open app → know what to do.
3. Structurally resilient. Missed days don't break anything.
4. Skill tree gates are enforced by the app. You cannot self-promote.
5. Warm-ups are first, always.
6. Skill before strength, always.
7. Front lever only on C days, at session start.
8. No HIIT two days in a row.
9. Deloads are structural, not optional.
10. Three high-intensity sessions per week maximum.
