# Galaxy Fit — Master Context Document
*Paste this at the start of any new Claude chat working on this project.*

---

## What Is Galaxy Fit?

A long-term hybrid athlete training PWA. The core promise: open the app, know exactly what to do today. Built around a structured methodology combining strength, calisthenics skill progression, VO₂max development, and mobility — designed to last 2–10 years without burnout.

---

## Athlete Profile (Primary User)

- 23-year-old male, 5'7"
- Intermediate/advanced history, detrained 1+ year
- No injuries
- Sleep: ~7/10 | Stress: ~6/10
- Current: ~15 push-ups, ~7 pull-ups, can dip, can squat bodyweight+
- Previously: pistol squats, muscle-ups
- Equipment: Full gym (egym Wellpass Germany), outdoor parks, rings, resistance bands, mountain bike
- Tracking: Apple Watch (manual data entry for v1)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| App type | PWA (installable, works in browser) |
| Storage v1 | LocalStorage + JSON export/import |
| Storage v2 | Supabase (free tier, cross-device sync) |
| Hosting | Vercel or Netlify (free tier) |
| Units | kg + cm (v1 only, imperial toggle in v2) |
| Language | English only (v1) |
| Users | Single profile (v1), multi-profile (v2) |
| Apple Watch | Manual entry (v1), native integration (future) |
| Offline | Not a priority for v1 |

---

## Design Language

- Dark background: `#0a0a08`
- Primary accent (lime green): `#c8f050`
- Secondary accent (yellow): `#f0c828`
- Red alert: `#f05050`
- Blue info: `#50c8f0`
- Typography: Bebas Neue (headings), DM Mono (data/labels), DM Sans (body)
- Aesthetic: Dark, minimal, tool-like — NOT fitness influencer. Think serious instrument.
- Skill tree visual: Constellation map. Locked nodes dim/grey. Completed nodes glow. Active nodes pulse.

---

## The 6 Hubs

### 1. Dashboard
The main hub. Opens every session.

**On open shows:**
- Athlete name + current position: Block X · Week Y · Day A/B/C
- Readiness light (green/yellow/red) based on sleep + stress
- Last session summary (X days ago)
- Sessions this block counter
- Single CTA: **START SESSION**

**Readiness light logic (CORRECT VERSION):**
```
Green:  sleep ≥ 7 AND stress ≤ 5
Yellow: sleep 6–7 OR stress 6–7 (but not both bad)
Red:    sleep < 6 OR stress ≥ 8 (either condition alone triggers red)
```

**Start Session flow:**
1. Confirm/update sleep + stress
2. Select time: 30 / 45 / 60 / 90 min
3. App generates exact session (exercises, sets, reps, skill work) based on:
   - Day type (A/B/C)
   - Time available
   - Readiness light
   - Active skill tree selections
   - Current block phase
4. Session displayed as live checklist

**Logging captures per session:**
- Weight (kg) × reps per set per lift
- Auto-suggestion: ↑ add weight / = hold / ↓ deload (based on double progression rules)
- Skill hold time (seconds) + current ladder level
- Peak BPM (manual Apple Watch entry)
- Actual duration
- Session feel: 😐 / 🙂 / 💪 (one tap)
- Optional text note

**Warm-ups:** First block of every generated session. Static per day type in v1, adaptive in v2.
- Day A: hip circles, leg swings, goblet squat hold, couch stretch
- Day B: band pull-aparts, shoulder circles, dead hang
- Day C: cat-cow, thoracic rotation, dead hang

**No guilt nudges.** The app never shames missed days or pushes HIIT reminders. The rolling sequence handles everything structurally.

---

### 2. Skill Tree
The most distinctive feature. A visual node-and-branch graph — constellation style.

**Three trees on one canvas:**
- Pulling Tree: Front Lever, Back Lever, Human Flag, Muscle-Up
- Pushing Tree: Planche, L-sit, Handstand Push-Up, Dips
- Balance Tree: Handstand, One-Arm Handstand (long-term)
- Mobility Tree: Separate section, same canvas, different color

**V1 skill nodes to include:**
Handstand, Front Lever, Back Lever, L-sit, Human Flag, Planche, Muscle-Up, Pistol Squat, Dragon Flag, Nordic Curl, Handstand Push-Up. Plus shared prerequisite nodes (hollow body, scapular pull, support hold, etc.)

**Each node contains:**
- Movement name
- Video reference link (credited — sources: Overcoming Gravity 2nd Ed, BW Fitness Progressions v5.4, Reddit r/bodyweightfitness)
- Prerequisite nodes (visual connecting lines)
- Strength prerequisites (e.g. "Requires 8 strict pull-ups")
- Unlock criteria (e.g. "4×12 sec hold · 3 consecutive logged sessions")
- Logged history for that node
- Status: 🔒 Locked / ⚡ Active / ✅ Unlocked

**Key mechanics:**
- Nodes auto-advance when logged sessions meet criteria — cannot be manually skipped
- Stall detection: 6+ sessions logged at a node without advancing → suggest stall protocol (drop one level, add a set)
- Active selection: user picks 1 skill per tree to pursue → flows into session generator
- Skill always trained BEFORE strength work in sessions
- Front lever ONLY on C days, placed at session start
- Handstand on A and B days
- L-sit on B days

**Mobility tree unlocks via benchmark measurements** (cm from floor, ROM degrees) not session counts.

**Reference sources to credit in-app:**
- Overcoming Gravity 2nd Edition (Steven Low)
- Bodyweight Fitness Progressions v5.4 (r/bodyweightfitness)
- The Calisthenics Skill Tree template

---

### 3. Calendar
History and progress visualization. Encouraging, never guilt-inducing.

**Primary view:** Monthly grid. Session type shown as colored dots. Blank days are just blank — no red X's.

**Tap any session:** Full log, peak BPM, skill work, session feel.

**Graph tabs (default zoom: 3 months):**
- Strength over time per lift (line chart)
- Skill hold time per skill
- Peak BPM trend
- Sessions per week (bar chart — labeled "activity" not "compliance")
- VO₂max estimate trend (monthly)
- Toe touch distance over time

---

### 4. Benchmarks
Runs every 4 weeks on deload week. App prompts user.

**Test battery:**
| Test | Method |
|---|---|
| Max strict pull-ups | 1 set to failure |
| Max push-ups | 1 set to failure |
| Squat estimated 1RM | 3-rep set → Epley formula |
| Deadlift estimated 1RM | 3-rep set → Epley formula |
| Handstand hold | Best of 3 attempts (seconds) |
| Front lever hold | Best of 3 at current level (seconds + level) |
| Toe touch | cm from floor (negative = past floor) |
| VO₂max estimate | Apple Watch reading |
| Resting HR | Apple Watch 7-day average |

Results feed into: load suggestions, skill calibration, Calendar graphs.

---

### 5. Move (Z Day / Free Activity)
Completely free-form. Outside the A/B/C sequence entirely — never interrupts it.

**Log any activity:**
- Type: bike / run / hike / ski / swim / yoga / sport / gym-other / other
- Duration
- Peak BPM (optional)
- Optional note

**Counting logic:**
- Any duration: always logged
- 30+ min AND Zone 2+ HR (≥118 BPM for this athlete) → counts as cardio event
- 60+ min → full outdoor session
- Yoga regardless of HR → counts as mobility session
- Dog walk / casual stroll → logged, not counted as cardio

**VO₂max section:**
- Current estimate (Apple Watch, updated on benchmark days)
- Trend graph
- Active block conditioning format display
- Interval library: 4×4 Norwegian / 30-30s / 6×1min / Tabata — each labeled with target zone and block phase

---

### 6. Reference
Searchable. Static content.

**Sections:**
- System philosophy
- Readiness light rules
- Double progression rules + examples
- Skill tree unlock rules
- HR zones (Zone 1–4 based on max HR ~197 for age 23)
- What to do after time off (decision tree)
- RPE scale
- Glossary

**Every metric in the app has a "?" tap** that surfaces the relevant reference inline.

**Mindfulness: explicitly out of scope.** Reference hub mentions it briefly and points to external tools (Waking Up, Insight Timer).

---

## Core Programming

Core is never a standalone day — it's embedded in every session in the finisher/accessory slot. The skill tree and core programming converge over time (hollow body, front lever, dragon flag ARE core work).

**Core planes covered across the week:**

| Plane | Movement | Day |
|---|---|---|
| Anterior (flexion) | Ab wheel, dragon flag progression, hanging leg raise | A and C |
| Compression | L-sit holds | B |
| Anti-extension | Hollow body holds | Embedded in skill warm-ups |
| Anti-rotation | Pallof press, ring body saw | B |
| Posterior | Back extensions, Jefferson curl | A and C |

**Rules:**
- Core work goes in the finisher slot at the end of sessions — never before skill or strength
- 2–3 sets, 3–5 minutes max
- As skill tree advances, explicit core programming reduces because skills demand it
- Dragon flag progression lives on C days (pairs with pulling/hanging)

---

## Gymnastics Strength Training (GST) — Skill-Specific Accessories

**Model: one heavy compound lift as the primary load anchor per day, accessory slot replaced with skill-specific gymnastics work targeting the active skill tree selection.**

This means the session generator needs to know the athlete's active skill selection and substitute the accessory slot with the appropriate prerequisite movement from the skill tree.

**Each skill node in the data model must include a `skill_specific_accessories` field** listing 2–3 movements that build toward it and can populate the accessory slot in generated sessions.

**Example mappings:**

| Target Skill | Skill-Specific Accessories |
|---|---|
| Muscle-Up | Chest-to-bar pull-ups, explosive pull-ups, ring transition drills |
| Front Lever | Tuck FL rows, archer pull-ups, skin the cat |
| Planche | Planche leans, tuck planche holds, pseudo planche push-ups |
| Handstand | Wall shoulder taps, pike push-ups, freestanding kick-up attempts |
| Back Lever | German hang, skin the cat, tuck BL holds |
| L-sit | Tuck L-sit holds, hanging knee raises, parallel bar support holds |
| Human Flag | Tuck flag holds, side plank progressions, lateral pull-downs |
| Dragon Flag | Tuck dragon flag neg, advanced tuck dragon flag, straight leg lowering |
| Nordic Curl | Nordic curl negatives, hamstring slides, glute-ham raises |
| Pistol Squat | Assisted pistol, cossack squat, single-leg box squat |
| HSPU | Pike push-ups, wall HSPU negatives, elevated pike push-ups |

**Day structure example (Muscle-Up as active skill, C day):**
1. Warm-up
2. Skill: Front lever tuck holds (fresh, first)
3. Primary: Weighted pull-up 4×5–8 (double progression anchor)
4. Accessory: Chest-to-bar pull-ups 3×5 (skill-specific, RPE-based)
5. Secondary: Barbell row 3×8
6. Finisher: Hanging leg raises 2×10 (core)

**Day structure example (Planche as active skill, B day):**
1. Warm-up
2. Skill: L-sit holds
3. Primary: Barbell bench press 4×6 (load anchor)
4. Accessory: Planche leans or ring push-ups 3×8 (skill-specific)
5. Secondary: Overhead press 3×6
6. Finisher: Pallof press 2×12 (core, anti-rotation)

**Key constraints:**
- Skill-specific accessories are bodyweight or ring-based — tracked by RPE, not load
- Heavy barbell lifts remain the primary progression anchor for bone density and double progression tracking
- Unilateral and ring movements generate more fatigue than bilateral equivalents — keep to accessory slot only, not primary
- Do not add skill-specific accessories before the athlete has the base strength prerequisite for the target skill

---

## The A/B/C Training System

### Day Types

| Day | Focus | Main Lifts | Skill | Conditioning |
|---|---|---|---|---|
| A | Lower Body | Squat, RDL, Split Squat | Handstand | Optional short intervals |
| B | Upper Push | Bench, OHP, Weighted Dip | L-sit, Back Lever | HIIT finisher (8–12 min) |
| C | Upper Pull | Weighted Pull-up, Row, Deadlift | Front Lever (fresh, first) | None — protect CNS |
| Z | Free Activity | — | Optional casual skill | 30+ min Zone 2+ |

### Session Tiers

| Time | Content |
|---|---|
| 30 min | Warm-up 5 min · Skill 5 min · 1 main lift 3 sets · 1 accessory 2 sets |
| 45 min | Warm-up 8 min · Skill 8 min · 2 lifts · conditioning or accessory 8 min |
| 60 min | Warm-up 10 min · Skill 10 min · 3 lifts · accessory + intervals 10 min |
| 90 min | Full session + extended cardio or outdoor activity |

### Rolling Sequence Rules
- No fixed weekday assignments
- Miss a day → pick up at the same letter next session
- Spontaneous activity (hike, yoga, sport) → log as Z, continue A/B/C next session
- The sequence never breaks, never resets

---

## Strength Progression Model

**Double Progression:**
- Each lift has a rep range (e.g. 4×5–8)
- Hit top of range (all sets) at RPE ≤ 8 → add weight next session (2.5–5kg lower, 1.25–2.5kg upper)
- Can't hit bottom of range → drop 10%, rebuild

**12-Week Block Phases:**

| Phase | Weeks | Sets × Reps | RPE | Load |
|---|---|---|---|---|
| Accumulation | 1–4 | 3–4 × 5–8 | 6–7 | 60–65% 1RM |
| Deload | 5 | 3 × 5–8 | 5–6 | 50–60% 1RM |
| Intensification | 6–9 | 4 × 4–6 | 7–8 | 75–80% 1RM |
| Deload | 10 | 3 × 5–8 | 5–6 | 50–60% 1RM |
| Realization | 11–12 | 4–5 × 3–5 | 8–9 | 82–88% 1RM |

**Deloads are mandatory at weeks 5 and 10 regardless of how the athlete feels.**

**Deadlift rotation:** Odd blocks = deadlift on C day. Even blocks = deadlift on A day, RDL moves to C.

---

## Autoregulation Rules

| Condition | Action |
|---|---|
| Sleep ≥7 AND stress ≤5 | Green: train as programmed, optional top set |
| Sleep 6–7 OR stress 6–7 | Yellow: drop RPE by 1, remove HIIT finisher, keep skill |
| Sleep <6 OR stress ≥8 | Red: skill + 1 main lift only, no conditioning |
| Sick | Full rest, mobility only, return after 48hr symptom-free |
| After 1 week off | Resume sequence, reduce loads 10–15%, no catch-up |
| After 2–3 weeks off | Treat as deload week, rebuild Phase 1 RPE for 2 weeks |
| Only 30 min | Skill 5 min → main lift 3×5 → done. Always counts. |
| Low motivation | Commit to 10 min only. Permission to stop after. |
| Feel great, want more | Add one top set at RPE 8–9. Do not add extra sessions. |

---

## VO₂Max Without Z Days

VO₂max stimulus exists inside A/B/C — Day B always includes a HIIT finisher. Z days add Zone 2 volume (aerobic base/floor), not peak intensity. Without Z days: slower base development, same ceiling stimulus. System still works.

**Conditioning block rotation:**
- Block 1: Aerobic base emphasis
- Block 2: VO₂max intervals
- Block 3: Threshold + HIIT mix
- Block 4+: Rotate all three

---

## Key Design Principles

1. **Never guilt.** Blank days are blank, not failures.
2. **Always actionable.** Open app → know what to do.
3. **Structurally resilient.** Missed days don't break anything.
4. **Skill tree gates are enforced by the app.** You cannot self-promote.
5. **Warm-ups are first, always.** Non-negotiable part of every session.
6. **Skill before strength, always.** CNS is fresh at session start.
7. **Front lever only on C days, at session start.**
8. **No HIIT two days in a row.**
9. **Deloads are structural, not optional.**
10. **3 high-intensity sessions per week maximum.**

---

## Build Order

1. ✅ Skill tree data model + node graph logic — includes `skill_specific_accessories` field per node (do this first)
2. Design system + component library
3. Dashboard + session generator (must query skill tree for active selection + accessory slot population)
4. Skill tree UI
5. Logging system
6. Calendar + graphs
7. Benchmarks hub
8. Move hub
9. Reference hub
10. PWA setup + deployment

---

## Reference Files Available

- `hybrid-training-system.html` — full methodology document
- `hybrid-tracker.html` — prototype tracker UI
- `Overcoming_Gravity_2nd_Edition_Exercise_Charts.xlsx` — skill progression source
- `Bodyweight-Fitness-Progressions-Version-5_4.pdf` — progression chart source
- `Bodyweight_Fitness_Progressions.xlsx` — progression data
- `The_Calisthenics_Skill_Tree__template_1_6_1.xlsx` — skill tree template

*Sources to credit in-app: Overcoming Gravity 2nd Ed (Steven Low), BW Fitness Progressions v5.4 (r/bodyweightfitness)*

---

*Last updated: context document v1.0 — generated from architect chat*
