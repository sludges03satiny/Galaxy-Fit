# Galaxy Fit — V2 Master Context Document
*Paste this at the start of every new chat working on this project.*

---

## What Is Galaxy Fit?

A long-term hybrid athlete training PWA. Core promise: open the app, know exactly what to do today. Built around a structured methodology combining strength, calisthenics skill progression, VO₂max development, and mobility — designed to last 2–10 years without burnout.

**V1 is live at:** https://galaxy-fit.vercel.app
**Repository:** https://github.com/sludges03satiny/Galaxy-Fit
**Local path:** `/Users/joshua-sneddon/VS Code/Galaxy Fit/`

---

## V1 Status — What's Already Built

| Hub | Status | Notes |
|---|---|---|
| Dashboard | ✅ Complete | Readiness light, START SESSION, live session wizard, double progression |
| Skill Tree | ✅ Built, needs redesign | SVG graph renders incorrectly — see Known Issues |
| Calendar | ✅ Complete | Monthly grid, session detail cards, 4 SVG graph tabs |
| Benchmarks | ✅ Complete | Full test battery, result cards with deltas, deload week prompt |
| Move | ✅ Complete | Activity logging, counting logic, interval library |
| Reference | ✅ Complete | 8 tabs, real-time search, full prose content, glossary |

**Tech stack:** React + TypeScript + Tailwind CSS · PWA · LocalStorage + JSON export/import · Vercel

---

## Athlete Profile (Primary User)

- 23-year-old male, 5'7", intermediate/advanced history, detrained 1+ year
- Sleep: Apple Watch score 0–100 | Stress: 1–10 self-reported
- Equipment: Full gym (egym Wellpass Germany), outdoor parks, rings, resistance bands, mountain bike
- Expected user base: 4–10 people. One Android user — no Google Health, PWA-only.

---

## Design Language — FROZEN, DO NOT CHANGE

| Token | Value |
|---|---|
| Background | `#0a0a08` |
| Primary accent (lime) | `#c8f050` |
| Secondary accent (yellow) | `#f0c828` |
| Red alert | `#f05050` |
| Blue info | `#50c8f0` |
| Heading font | Bebas Neue |
| Data/label font | DM Mono |
| Body font | DM Sans |

Aesthetic: Dark, minimal, tool-like. NOT fitness influencer. Think serious instrument.

---

## Core Methodology — DO NOT CHANGE

### A/B/C Rolling Sequence
| Day | Focus | Main Lifts | Skill | Conditioning |
|---|---|---|---|---|
| A | Lower Body | Squat, RDL, Split Squat | Handstand | Optional short intervals |
| B | Upper Push | Bench, OHP, Weighted Dip | L-sit, Back Lever | HIIT finisher (8–12 min) |
| C | Upper Pull | Weighted Pull-up, Row, Deadlift | Front Lever (fresh, first) | None |
| Z | Free Activity | — | Optional casual skill | 30+ min Zone 2+ |

### Readiness Light Logic
```
Green:  sleep ≥ 70 AND stress ≤ 5  → train as programmed, optional top set
Yellow: sleep 60–69 OR stress 6–7  → drop RPE by 1, remove HIIT, keep skill
Red:    sleep < 60 OR stress ≥ 8   → skill + 1 main lift only, no conditioning
```

### Double Progression
- Rep range per lift (e.g. 4×5–8)
- Hit top of range at RPE ≤ 8 → ↑ add weight next session
- Can't hit bottom of range → ↓ deload 10%, rebuild
- Otherwise → = hold weight
- Increments: 2.5 kg lower body / 1.25 kg upper body. Imperial: 5 lb / 2.5 lb.

### 12-Week Block Phases
| Phase | Weeks | Sets × Reps | RPE | Load |
|---|---|---|---|---|
| Accumulation | 1–4 | 3–4 × 5–8 | 6–7 | 60–65% 1RM |
| Deload | 5 | 3 × 5–8 | 5–6 | 50–60% 1RM |
| Intensification | 6–9 | 4 × 4–6 | 7–8 | 75–80% 1RM |
| Deload | 10 | 3 × 5–8 | 5–6 | 50–60% 1RM |
| Realization | 11–12 | 4–5 × 3–5 | 8–9 | 82–88% 1RM |

Deloads are mandatory at weeks 5 and 10 regardless of how the athlete feels.

---

## V1 Known Issues — Fix These in V2

### Skill Tree Graph (Critical — Fix First)

Photographed on device. Five specific bugs:

1. **Layout is top-down instead of bottom-up** — Dead Hang and foundation nodes render at the TOP of the canvas. The viewport opens at the wrong end. Should be: foundation nodes at bottom, elite/terminal nodes at top (Skyrim-style).

2. **All nodes in one column** — The four trees (Pulling, Pushing, Balance, Mobility) are not separated into columns. Everything stacks vertically on the left side. The layout algorithm is not distributing nodes by tree category.

3. **Lines go into empty space** — Because all nodes are in one column, prerequisite lines fan out diagonally to the right into empty black space. The data connections are correct but the visual positions are wrong.

4. **New user has nowhere to start** — App shows "5 active, 0 unlocked" with no explanation that you need to log sessions to progress. Foundation nodes should be clearly marked as the starting point with an instruction to begin training them.

5. **No "center on active nodes" button** — Opening the graph drops you somewhere in the middle with no orientation. Need a button that snaps the viewport to the athlete's current active nodes.

### Other V1 Issues

6. **Z days not on calendar** — Z activities are logged to `gf_activities` but calendar only reads `gf_sessions`. Calendar must read both. Z days must appear as dots — they represent real training.

7. **Sleep label inconsistency** — Verify 0–100 Apple Watch scale is labeled consistently everywhere (onboarding, session start, reference).

8. **Benchmark dips step** — Was added manually post-build. Verify it's correctly integrated.

---

## V2 Feature Roadmap (Priority Order)

---

### Priority 1 — Onboarding Overhaul

Complete replacement of the current onboarding. New flow:

**Step 1 — Apple Health permission (iOS only)**
- "Allow Galaxy Fit to read Apple Health?" — Yes / No / Maybe Later
- If yes: auto-fill DOB and name from HealthKit if available
- Android users skip this screen entirely

**Step 2 — Name + Date of Birth**
- Name input
- Date of birth (date picker, not age input) → stored as ISO string e.g. `"2002-08-14"`
- DOB drives all HR calculations dynamically — never hardcode BPM values again
- Avatar emoji picker (used in multi-profile switcher)

**Step 3 — Equipment selection**
- Toggle grid: Barbell + rack, Pull-up bar, Dip bars, Gymnastics rings, Resistance bands, Dumbbells, Kettlebell, Outdoor park access, Mountain bike, Treadmill/rower
- Saved to `profile.equipment: string[]`
- Session generator filters all exercises by this list
- Can be changed anytime in Settings

**Step 4 — Goal skill selection**
- "What do you want to work toward?" — user picks 1–3 goal skills from a visual list
- Options: Front Lever, Planche, Muscle-Up, Handstand, Back Lever, L-Sit, Human Flag, Pistol Squat, HSPU, Dragon Flag, Nordic Curl
- Only the selected skill trees become active in the skill tree
- Unselected trees are hidden by default (can be added later in Settings)
- This replaces the current "all 48 nodes visible at once" approach

**Step 5 — Movement baseline test**
- "Let's see where you're starting from"
- Simple self-report questions with clear pass/fail prompts:
  - "Can you hang from a bar for 30 seconds?" → unlocks dead-hang
  - "Can you do 5 strict pull-ups?" → unlocks scapular-pull, arch-hang
  - "Can you hold a hollow body for 20 seconds?" → unlocks hollow-body
  - "Can you do 10 push-ups?" → unlocks support-hold
  - "Can you do a pistol squat assisted?" → unlocks cossack-squat
  - "Can you do a tuck L-sit for 5 seconds?" → unlocks tuck-l-sit
  - "Can you hold a wall handstand for 30s?" → unlocks wall-handstand
- Each "yes" answer immediately marks that node as `unlocked` in skill progress
- This prevents athletes with existing strength from being stuck at Dead Hang
- Only shown for foundation/prerequisite nodes — not for advanced skills

**Step 6 — Week 1 = Benchmark week**
- First week of the app is always a benchmark test week, not a training week
- After onboarding completes, the Dashboard shows: "WEEK 1 — BENCHMARK WEEK"
- The full benchmark battery runs across the first week (not all in one session)
- After benchmarks are complete, Block 1 begins with real data:
  - Actual max pull-ups → strength prerequisite check for skill tree
  - Actual squat/deadlift e1RM → starting weights for session generator
  - Actual toe touch → mobility baseline
  - VO₂max estimate → cardio baseline
- Session generator pre-fills weights from day 1 of Block 1

**Step 7 — Explainer screens**
- 4 swipeable cards shown once after all setup is complete
- Card 1: The A/B/C system — what it is, why it rolls
- Card 2: The skill tree — locked → active → unlocked, you train your way up
- Card 3: Readiness light — the app adapts, you don't have to think
- Card 4: One rule — open the app, do what it says
- Skip always visible

---

### Priority 2 — Skill Tree: Full Redesign

Complete rebuild of `SkillTree.tsx` and the layout algorithm. The data model (`skills.json`) is correct — only the rendering is broken.

**Layout algorithm (fix the core bug):**
- Assign each node a `column` based on its `category`: pulling=0, pushing=1, balance=2, mobility=3
- Assign each node a `row` based on its `progression_level` (1=bottom, 5=top)
- Nodes with `prerequisites: []` are always at row 0 (bottom)
- Within a column, nodes are spaced vertically by progression level
- Result: Dead Hang at bottom-left, Front Lever at top-left, Planche at top-center, Handstand at top-right

**Canvas and interaction:**
- SVG canvas, pannable in all directions (pointer + touch events)
- Momentum scrolling — flick to pan, decelerates naturally
- Pinch-to-zoom on mobile, scroll-wheel zoom on desktop
- Minimum zoom: fit all nodes. Maximum zoom: nodes fill screen.
- Viewport opens centered on the athlete's current active nodes on every open
- "CENTER" pill button bottom-right — snaps to active nodes
- "FIT" pill button bottom-right — zooms out to show all nodes

**Background:**
- ~150 small static white dots, random positions, opacity 0.1–0.4 (galaxy field)
- 2–3 large radial gradient blobs in deep purple/indigo (nebula effect)
- Pure CSS/SVG — no canvas, no external libraries

**Node visuals:**
- Locked: small grey circle, dim, no animation, no label unless zoomed in
- Active: lime ring, slow breathing pulse (scale 1.0→1.15, 2.5s ease-in-out infinite), label always visible
- Unlocked: solid lime fill, static glow, label visible
- Unlock animation (one-time, on status change): 6–8 small dots burst outward from node center, fade over 0.5s

**Connecting lines:**
- Both nodes unlocked: bright lime, opacity 0.4
- One node active: medium lime, opacity 0.2
- Both locked: dark grey, opacity 0.12
- SVG `<path>` with cubic bezier curve (not straight lines)
- Lines render behind nodes (lower z-index)

**Only show selected trees:**
- Only render trees the user selected during onboarding
- Unselected trees hidden (can be toggled on in Settings → Skill Trees)
- This prevents the "48 nodes, nowhere to start" problem

**Node tap → detail sheet:**
- Bottom sheet slides up
- Shows: name, description, prerequisites (with status indicators), unlock criteria, accessories, source credit
- "SET AS ACTIVE" button (if node is active status and not already selected for that tree)
- "MARK AS KNOWN" button only visible during onboarding baseline test

---

### Priority 3 — Skills.json Expansion

Audit current 48 nodes against source materials and add missing progressions.

**Sources to audit against:**
- Overcoming Gravity 2nd Edition (Steven Low) — exercise charts
- Bodyweight Fitness Progressions v5.4 (r/bodyweightfitness) — full progression chart

**Missing nodes to add (identified from source materials):**
- Ring dip progressions (ring support hold → ring dip negative → ring dip → RTO dip)
- Typewriter pull-up (between archer pull-up and one-arm pull-up)
- Ice cream maker (advanced front lever pulling skill)
- Manna progression (advanced L-sit → V-sit → manna)
- Bridge / wheel progressions (shoulder bridge → table bridge → wheel)
- Pseudo planche push-up (sits between planche lean and tuck planche — currently missing)
- Elevated pike push-up (between pike push-up and wall HSPU)
- Shrimp squat progression (beginner → intermediate → full shrimp squat)
- Ab wheel progression (knees → straight leg → one-arm)
- One-arm pull-up progression (one-arm negative → assisted OA pull-up → one-arm pull-up)

**Rules when adding nodes:**
- Run graph validator after any addition — no orphans, no cycles
- Every new node needs: id, name, category, prerequisites, strength_prerequisites, progression_level, unlock_criteria, skill_specific_accessories, session_placement, video_reference, source_credit
- progression_level must be ≥ max progression_level of any direct prerequisite

---

### Priority 4 — Imperial Units Toggle

- Settings screen (gear icon top-right of Dashboard)
- `profile.units: 'metric' | 'imperial'`
- Stored values always metric internally — convert at display time only
- `src/lib/units.ts`: `displayWeight(kg, units)`, `displayDistance(cm, units)`
- Increments: metric = 2.5 kg lower / 1.25 kg upper. Imperial = 5 lb lower / 2.5 lb upper.
- Affects everywhere a number is displayed: session wizard, progression suggestions, benchmarks, calendar graphs

---

### Priority 5 — Calendar: Z Day Fix + Graph Enhancements

**5a — Z day bug fix (do first):**
- Calendar reads `gf_activities_{profileId}` alongside `gf_sessions_{profileId}`
- Z activity dots: dim white on grid, distinct from A/B/C colored dots
- Tapping shows activity detail: type, duration, BPM, note, category badge

**5b — Graph enhancements:**
- Toe touch over time (new graph tab)
- VO₂max trend line on Cardio tab
- Strength PR markers (small star) on Strength tab
- Session feel emoji on calendar dot hover/tap

---

### Priority 6 — Multi-Profile Support (Local Only)

No backend, no auth, no server. Local only.

- `gf_profiles`: `ProfileSummary[]`
- `gf_active_profile`: active profile ID
- All data keys profile-scoped: `gf_sessions_{profileId}`, `gf_athlete_profile_{profileId}`, etc.
- Profile switcher: tap name on Dashboard → sheet with all profiles + "+ New Profile"
- Each profile runs through full onboarding independently
- Deleting a profile requires confirmation
- Migration: first v2 launch detects legacy unscoped keys → migrates to `_default` profile

```typescript
interface ProfileSummary {
  id: string
  name: string
  avatarEmoji: string
  createdAt: string
  lastActiveAt: string
}

interface AthleteProfile {
  id: string
  name: string
  avatarEmoji: string
  dateOfBirth: string           // ISO "2002-08-14"
  units: 'metric' | 'imperial'
  equipment: string[]
  goalSkills: string[]          // node IDs of selected goal skills from onboarding
  blockPosition: {
    blockNumber: number
    weekInBlock: number
    phase: 'accumulation' | 'deload' | 'intensification' | 'realization'
    isDeloadWeek: boolean
    isBenchmarkWeek: boolean    // true for week 1
  }
  nextDayType: 'A' | 'B' | 'C'
  activeSkills: Record<string, string>
  defaultTimeTier: 30 | 45 | 60 | 90
  vo2maxEstimate?: number
  heightCm: number
  weightKg: number
  customActivityTypes?: { id: string; name: string; emoji: string }[]
  appleWatchEnabled?: boolean
  updatedAt: string
}
```

---

### Priority 7 — Session Generator: Full Pre-Fill

The app tells you exactly what to do. No mental calculation required.

**Pre-fill logic per lift:**
1. Read last session's logged sets for this lift
2. Apply double progression: hit top of range at RPE ≤ 8 → add increment; couldn't hit bottom → deload 10%
3. Round to nearest valid increment
4. Pre-fill all sets with exact weight + bottom of rep range for current phase
5. Display: `"Bench Press — 4 sets × 5–8 reps @ 72.5 kg"`

**During session:**
- Each set row: pre-filled weight (editable) | pre-filled reps (editable) | RPE input
- After completing all sets: ↑/=/↓ badge shows next session recommendation

**First session (no history):** weight fields blank, athlete enters starting weight → becomes baseline

**Phase awareness:** rep range and RPE targets always reflect current block phase

---

### Priority 8 — Move Hub: Expanded Activity Types + Custom Types

**Fix Z day calendar bug (same as Priority 5a — do together)**

**Expanded built-in types (add to existing):**
rowing 🚣, stretching 🧘, climbing 🧗, skating ⛸️, boxing 🥊, football ⚽, basketball 🏀, tennis 🎾, crossfit 💥

Rules: stretching = always mobility. Rowing = standard cardio rules. Others = standard cardio rules.

**Custom activity types:**
- User creates: name + emoji picker
- Saved to `profile.customActivityTypes[]`
- Grid: built-in → custom → "+ Add Type"
- Grid scrolls vertically — never breaks at 30+ types
- Used types get a subtle dot indicator

---

### Priority 9 — Benchmarks: Adaptive Battery

**Static tests always run:**
- Max pull-ups (→ weighted 1RM once >15)
- Max push-ups (→ ring/archer once >30)
- Max dips (→ weighted 1RM once >15)
- Squat e1RM (3-rep Epley)
- Deadlift e1RM (3-rep Epley)
- Toe touch (cm)
- VO₂max estimate
- Resting HR

**Dynamic additions when skill nodes unlock:**
- Front Lever → add hold time (best of 3)
- Muscle-Up → add reps
- L-Sit → add hold time (best of 3)
- Handstand → add hold time (best of 3)
- Pistol Squat → add reps each side
- Back Lever → add hold time

**Minimum coverage every benchmark:** 1 pulling + 1 pushing + 1 core + 1 lower body + toe touch

---

### Priority 10 — Session Feel Feedback Loop

- 3× 💪 consecutive → Dashboard card: "You've been crushing it — consider a top set"
- 3× 😐 consecutive → Dashboard card: "3 tough sessions — review recovery or consider a deload"
- Feel emoji visible on Calendar dots on hover/tap

---

### Priority 11 — Apple Watch Integration (Capacitor)

Capacitor wrapper around existing React PWA. HealthKit plugin. Built + signed in Xcode. Distributed via TestFlight.

**Reads from HealthKit (read-only, local only):**
- Sleep score → pre-fills readiness light
- Resting HR → pre-fills benchmark
- VO₂max → pre-fills benchmark
- All workouts → auto-imports to Move hub as Z activities

**Always manual:** stress level, skill hold times, lift weights and reps

**Notifications:**
- Unmatched workouts → "You have X workouts to review in Move"
- Unrecognized workout type → "We found a workout we couldn't categorize"

**Pre-workout prompts (soft, never blocking):**
- B day start: "Start a HIIT workout on your Apple Watch?"
- Z day: "Remember to start a workout on Apple Watch to auto-log this"

**Privacy:** all HealthKit data stays on device, never leaves. Per-profile enable/disable. Android users never see HealthKit UI.

**Deferred to v3:** WatchKit companion, workout control from Galaxy Fit, haptic HIIT cues

---

### Priority 12 — PWA Enhancements

- Offline support (service worker)
- Opt-in deload week push notification
- Better install prompt UX

---

## LocalStorage Keys (V2, Profile-Scoped)

| Key | Contents |
|---|---|
| `gf_profiles` | `ProfileSummary[]` |
| `gf_active_profile` | active profile ID string |
| `gf_sessions_{profileId}` | `Session[]` |
| `gf_skill_progress_{profileId}` | `SkillProgress` |
| `gf_athlete_profile_{profileId}` | `AthleteProfile` |
| `gf_benchmarks_{profileId}` | `BenchmarkResult[]` |
| `gf_activities_{profileId}` | `ZActivity[]` |

**Migration:** On first v2 launch, detect legacy `gf_sessions` → migrate to `gf_sessions_default` → create default profile. Never delete legacy keys until migration confirmed.

---

## File Structure

```
src/
  components/
  data/
    skills.json          # node graph — run validator before any edit
  hooks/
    useAthleteProfile.ts
    useSessions.ts
    useSkillTree.ts
    useReadiness.ts
    useSessionWizard.ts
    useStorage.ts
    useProfiles.ts       # NEW v2
  hubs/
    dashboard/
      Dashboard.tsx
      SessionWizard.tsx
      OnboardingModal.tsx
    skilltree/SkillTree.tsx
    calendar/Calendar.tsx
    benchmarks/Benchmarks.tsx
    move/Move.tsx
    reference/Reference.tsx
  lib/
    sessionGenerator.ts
    skillTreeEvaluator.ts
    doubleProgression.ts
    storage.ts
    hrZones.ts           # NEW — dynamic HR from DOB
    units.ts             # NEW — displayWeight(), displayDistance()
    uuid.ts
  types/
    athlete.ts
    session.ts
    skill.ts
    benchmark.ts
    activity.ts
```

---

## Git Workflow

- `main` — stable, deployed to Vercel. Only merge confirmed working features.
- One branch per feature: `v2/feature-name`
- Examples: `v2/onboarding`, `v2/skill-tree-redesign`, `v2/imperial-units`, `v2/multi-profile`, `v2/calendar-z-days`, `v2/move-custom-types`, `v2/session-prefill`, `v2/benchmarks-adaptive`

Per feature:
```bash
git checkout -b v2/feature-name
# build + test locally
# screenshot review in architect chat
git checkout main && git merge v2/feature-name
vercel --prod
```

---

## V2 Development Rules

1. Never break localStorage data — every schema change needs a migration function
2. Never modify skills.json without running the graph validator
3. Never add external chart libraries — all graphs are pure SVG
4. Never add guilt mechanics — blank days are blank
5. Design system is frozen — colors, fonts, aesthetic
6. Equipment awareness — session generator always filters by `profile.equipment`
7. Units awareness — every displayed number through `displayWeight()` or `displayDistance()`
8. HR always dynamic — derive from DOB via `hrZones.ts`, never hardcode BPM
9. Always review outputs in architect chat before VS Code
10. One feature per chat — paste this document at the start of each

---

## Files to Attach Per Feature

**Every chat:** this doc + `src/types/athlete.ts` + `src/types/session.ts` + `src/lib/storage.ts`

| Feature | Also attach |
|---------|-------------|
| Skill tree redesign | `src/hubs/skilltree/SkillTree.tsx` + `src/data/skills.json` |
| Onboarding | `src/hubs/dashboard/OnboardingModal.tsx` |
| Dashboard / session | `src/lib/sessionGenerator.ts` + `src/hooks/useSessionWizard.ts` + `src/hubs/dashboard/Dashboard.tsx` |
| Move hub | `src/hubs/move/Move.tsx` + `src/types/activity.ts` |
| Calendar | `src/hubs/calendar/Calendar.tsx` |
| Benchmarks | `src/hubs/benchmarks/Benchmarks.tsx` + `src/types/benchmark.ts` |
| Multi-profile | `src/lib/storage.ts` + `src/hubs/dashboard/Dashboard.tsx` |

---

## Sources

- Overcoming Gravity 2nd Edition — Steven Low (primary authority)
- Bodyweight Fitness Progressions v5.4 — r/bodyweightfitness
- The Calisthenics Skill Tree template v1.6.1

---

*V1 shipped March 2026. V2 in development.*
