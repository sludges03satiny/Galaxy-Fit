import React, { useState, useMemo } from 'react'
import { useStorage } from '../../hooks/useStorage'
import { Button } from '../../components/Button'
import { getHRZones } from '../../lib/hrZones'
import { useAthleteProfile } from '../../hooks/useAthleteProfile'

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | 'philosophy'
  | 'readiness'
  | 'progression'
  | 'skill-gates'
  | 'hr-zones'
  | 'time-off'
  | 'autoregulation'
  | 'glossary'

interface Tab {
  id: TabId
  label: string
  keywords: string[]
}

// ── Tab config with searchable keywords ──────────────────────────────────────

const TABS: Tab[] = [
  {
    id: 'philosophy',
    label: 'PHILOSOPHY',
    keywords: ['philosophy', 'system', 'design', 'principles', 'rolling', 'abc', 'skill before strength', 'sources', 'overcoming gravity', 'bodyweight', 'deload', 'guilt', 'promise'],
  },
  {
    id: 'readiness',
    label: 'READINESS',
    keywords: ['readiness', 'sleep', 'stress', 'green', 'yellow', 'red', 'light', 'rpe', 'hiit', 'apple watch', 'score', 'rest', 'recovery'],
  },
  {
    id: 'progression',
    label: 'PROGRESSION',
    keywords: ['progression', 'double progression', 'rep range', 'block', 'phase', 'accumulation', 'intensification', 'realization', 'deload', 'rpe', '1rm', 'load', 'weight', 'deadlift', 'bench', 'squat', 'epley', 'sets', 'reps'],
  },
  {
    id: 'skill-gates',
    label: 'SKILL GATES',
    keywords: ['skill', 'node', 'locked', 'active', 'unlocked', 'streak', 'consecutive', 'stall', 'prerequisite', 'promote', 'deload', 'front lever', 'handstand', 'muscle-up', 'criteria', 'gate'],
  },
  {
    id: 'hr-zones',
    label: 'HR ZONES',
    keywords: ['heart rate', 'bpm', 'zone', 'vo2max', 'zone 2', 'hiit', 'cardio', 'aerobic', 'max hr', 'threshold', 'interval', '118', '197'],
  },
  {
    id: 'time-off',
    label: 'TIME OFF',
    keywords: ['time off', 'sick', 'missed', 'week off', 'deload', 'return', 'resume', 'catch-up', 'motivation', 'streak', 'rest', 'recovery', 'injury'],
  },
  {
    id: 'autoregulation',
    label: 'AUTOREGULATION',
    keywords: ['autoregulation', 'sleep', 'stress', 'feel great', '30 min', 'top set', 'rpe', 'hiit', 'session feel', 'readiness', 'low motivation', 'green', 'yellow', 'red'],
  },
  {
    id: 'glossary',
    label: 'GLOSSARY',
    keywords: ['glossary', 'rpe', '1rm', 'e1rm', 'epley', 'double progression', 'deload', 'accumulation', 'intensification', 'realization', 'vo2max', 'zone 2', 'hiit', 'cns', 'gst', 'skill node', 'progression level', 'streak', 'stall', 'a/b/c', 'z day', 'readiness', 'top set', 'rep range', 'load anchor'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="font-heading text-display-sm text-lime leading-none tracking-wide">{children}</h2>
)

const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="font-heading text-xl text-text leading-none tracking-wide mt-4 mb-1">{children}</h3>
)

const Body: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`font-body text-sm text-text-2 leading-relaxed ${className}`}>{children}</p>
)

const Rule: React.FC<{ label: string; value: React.ReactNode; accent?: 'lime' | 'yellow' | 'red' | 'blue' }> = ({
  label, value, accent,
}) => {
  const accentClass =
    accent === 'lime' ? 'text-lime' :
    accent === 'yellow' ? 'text-yellow-400' :
    accent === 'red' ? 'text-red-400' :
    accent === 'blue' ? 'text-blue-400' :
    'text-text-2'
  return (
    <div className="flex gap-3 items-start border-b border-line py-2.5 last:border-0">
      <span className="font-mono text-mono-xs text-text-3 w-44 flex-shrink-0 pt-px">{label}</span>
      <span className={`font-mono text-mono-xs ${accentClass} leading-relaxed`}>{value}</span>
    </div>
  )
}

const Principle: React.FC<{ n: string; title: string; body: string }> = ({ n, title, body }) => (
  <div className="flex gap-3 py-2.5 border-b border-line last:border-0">
    <span className="font-mono text-mono-xs text-text-3 w-6 flex-shrink-0 pt-px">{n}</span>
    <div>
      <span className="font-mono text-mono-xs text-lime">{title} </span>
      <span className="font-body text-sm text-text-2">{body}</span>
    </div>
  </div>
)

const SourcesFooter: React.FC = () => (
  <div className="border-t border-line mt-6 pt-4">
    <p className="font-mono text-mono-xs text-text-3 opacity-50">
      Sources: Overcoming Gravity 2nd Ed — Steven Low · Bodyweight Fitness Progressions v5.4 — r/bodyweightfitness
    </p>
  </div>
)

const BlockTable: React.FC = () => {
  const phases = [
    { weeks: '1–4', name: 'Accumulation', sets: '3–4 × 5–8', rpe: '6–7', load: '60–65% 1RM' },
    { weeks: '5', name: 'Deload', sets: '3 × 5–8', rpe: '5–6', load: '50–60% 1RM' },
    { weeks: '6–9', name: 'Intensification', sets: '4 × 4–6', rpe: '7–8', load: '75–80% 1RM' },
    { weeks: '10', name: 'Deload', sets: '3 × 5–8', rpe: '5–6', load: '50–60% 1RM' },
    { weeks: '11–12', name: 'Realization', sets: '4–5 × 3–5', rpe: '8–9', load: '82–88% 1RM' },
  ]
  return (
    <div className="overflow-x-auto mt-3 mb-1">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-line">
            {['WEEKS', 'PHASE', 'SETS × REPS', 'RPE', 'LOAD'].map(h => (
              <th key={h} className="font-mono text-mono-xs text-text-3 pb-2 pr-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phases.map(p => (
            <tr key={p.weeks} className={`border-b border-line last:border-0 ${p.name === 'Deload' ? 'opacity-50' : ''}`}>
              <td className="font-mono text-mono-xs text-text-3 py-2 pr-4">{p.weeks}</td>
              <td className={`font-mono text-mono-xs py-2 pr-4 ${p.name === 'Deload' ? 'text-text-3' : 'text-lime'}`}>{p.name}</td>
              <td className="font-mono text-mono-xs text-text-2 py-2 pr-4">{p.sets}</td>
              <td className="font-mono text-mono-xs text-text-2 py-2 pr-4">{p.rpe}</td>
              <td className="font-mono text-mono-xs text-text-2 py-2">{p.load}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab sections ──────────────────────────────────────────────────────────────

const SectionPhilosophy: React.FC = () => (
  <div className="space-y-4">
    <H2>SYSTEM PHILOSOPHY</H2>
    <Body>
      Open the app. Know exactly what to do today. That is the entire promise. Galaxy Fit is a
      long-term hybrid athlete training system built to last 2–10 years without burnout — combining
      barbell strength, calisthenics skill progression, VO₂max development, and mobility in a single
      coherent structure.
    </Body>
    <H3>THE 10 PRINCIPLES</H3>
    <div>
      <Principle n="01" title="Never guilt." body="Blank days are just blank. The rolling sequence handles everything structurally — no streak counters, no red X's on the calendar." />
      <Principle n="02" title="Always actionable." body="Open the app and one button tells you what to do. No guessing, no planning, no decision fatigue." />
      <Principle n="03" title="Structurally resilient." body="Miss a day, a week, or three weeks — the system has a documented recovery protocol for each case. Nothing breaks." />
      <Principle n="04" title="Skill gates are enforced." body="You cannot manually advance a skill node. The app evaluates session history and unlocks nodes automatically. This prevents ego-driven injury." />
      <Principle n="05" title="Warm-ups are non-negotiable." body="Every generated session opens with a warm-up block. It is never optional, never shortened by the app." />
      <Principle n="06" title="Skill before strength, always." body="Skill work appears at the start of every session while the CNS is fresh. Strength work follows. This is not negotiable." />
      <Principle n="07" title="Front lever is C-day only." body="The front lever chain is placed at the very start of C days, before all pulling strength work. It never appears on A or B days." />
      <Principle n="08" title="No HIIT two days in a row." body="High-intensity conditioning appears on B days only. C days protect CNS. A days offer optional short intervals at most." />
      <Principle n="09" title="Deloads are structural." body="Weeks 5 and 10 of every block are mandatory deloads regardless of how the athlete feels. They are not rest days — skill work continues, loads drop." />
      <Principle n="10" title="Three high-intensity sessions maximum per week." body="The A/B/C sequence is designed so you cannot accidentally exceed this. The system prevents overreach by construction." />
    </div>
    <H3>WHY ROLLING A/B/C INSTEAD OF A FIXED WEEKLY SCHEDULE</H3>
    <Body>
      Fixed schedules punish life. Miss Monday leg day and the whole week is disrupted — you either
      cram sessions or skip them entirely. A rolling sequence has no weekday assignments. Miss a
      session, pick up at the same letter next time. The sequence never resets and never breaks.
      Over months and years this compounds: you accumulate more quality training sessions than any
      fixed schedule because the system bends around your life rather than demanding your life bend
      around it.
    </Body>
    <H3>WHY SKILL BEFORE STRENGTH</H3>
    <Body>
      Calisthenics skills demand precise motor patterning under straight-arm or extreme joint
      positions. That precision degrades with fatigue. Placing skill work first — when the central
      nervous system is fully recovered — means every skill session is a genuine adaptation stimulus.
      Placing it after strength work would mean training the front lever on a fatigued back, which
      accelerates connective tissue injury risk and slows skill acquisition. The order is structural,
      not cosmetic.
    </Body>
    <SourcesFooter />
  </div>
)

const SectionReadiness: React.FC = () => (
  <div className="space-y-4">
    <H2>READINESS LIGHT</H2>
    <Body>
      Before every session you enter two values: your sleep score (0–100, sourced from Apple Watch
      or self-reported) and your stress level (1–10, self-reported). The app computes a readiness
      light from those inputs and adjusts the generated session automatically.
    </Body>
    <H3>THE THREE STATES</H3>
    <div>
      <Rule label="🟢 GREEN" value="Sleep ≥ 70 AND stress ≤ 5 — Train as programmed. Optional top set at RPE 8–9 if you feel strong." accent="lime" />
      <Rule label="🟡 YELLOW" value="Sleep 60–69 OR stress 6–7 (but not both bad) — Drop RPE by 1. Remove HIIT finisher. Keep all skill work." accent="yellow" />
      <Rule label="🔴 RED" value="Sleep < 60 OR stress ≥ 8 (either condition alone triggers red) — Skill + 1 main lift only, 3 sets, no conditioning." accent="red" />
    </div>
    <Body>
      Red is not both-bad — it is either-bad. One terrible night of sleep with low stress still
      triggers red. This is intentional: the system would rather have you do less and recover than
      push through poor readiness and accumulate systemic fatigue across a week.
    </Body>
    <H3>HOW TO ENTER VALUES</H3>
    <Body>
      Sleep score: use your Apple Watch overnight sleep score (0–100). If you don't have a watch,
      estimate — less than 5 hours maps below 60, 5–6 hours maps to 60–69, 7+ hours and rested
      maps to 70+.
    </Body>
    <Body>
      Stress level: self-reported 1–10. A normal working day with manageable demands is typically
      4–5. A high-stakes deadline, argument, or life event pushing you to 7–8 should be reported
      honestly — the system adapts, not punishes.
    </Body>
    <H3>WHY THE APP NEVER GUILT-TRIPS RED DAYS</H3>
    <Body>
      A red readiness day that you still show up for and do skill + one lift is categorically better
      than a skipped day. The system credits the session, advances the streak, and never marks it
      differently in the calendar. You showed up. That is what counts.
    </Body>
    <SourcesFooter />
  </div>
)

const SectionProgression: React.FC = () => (
  <div className="space-y-4">
    <H2>PROGRESSION MODEL</H2>
    <H3>DOUBLE PROGRESSION</H3>
    <Body>
      Every barbell lift has a rep range — for example, 4×5–8. You progress through that range
      before adding weight. This means increasing reps (first dimension) until you hit the top of
      the range across all sets at RPE ≤ 8, then adding load (second dimension) and starting the
      rep climb again.
    </Body>
    <div>
      <Rule label="↑ ADD WEIGHT" value="Hit top of range (all sets at RPE ≤ 8) → +2.5–5 kg lower body / +1.25–2.5 kg upper body" accent="lime" />
      <Rule label="= HOLD" value="Hit the rep range but RPE > 8, or hit middle sets but not all → repeat same weight" />
      <Rule label="↓ DELOAD" value="Cannot hit the bottom of the rep range → drop 10%, rebuild from there" accent="red" />
    </div>
    <Body>
      Worked example — Bench Press 4×5–8: Session 1: 4×5 at RPE 7 → hold weight. Session 4:
      4×8 at RPE 7 → add 2.5 kg. New weight: 4×5 at RPE 8 → hold. This cycle can sustain months
      of advancement before a true plateau is reached.
    </Body>
    <H3>12-WEEK BLOCK PHASES</H3>
    <BlockTable />
    <Body>
      Deloads at weeks 5 and 10 are mandatory. Not based on feel. Not skippable if you feel strong.
      Fatigue masks fitness — you frequently feel best in the two weeks before an overtraining
      incident. Structural deloads interrupt fatigue accumulation before it compounds.
    </Body>
    <H3>DEADLIFT ROTATION</H3>
    <Body>
      Odd-numbered blocks (1, 3, 5...): Deadlift on C days. RDL on A days. Even-numbered blocks
      (2, 4, 6...): Deadlift moves to A days. RDL moves to C days. This rotation prevents
      adaptation stagnation and distributes posterior chain stress differently across the year.
    </Body>
    <SourcesFooter />
  </div>
)

const SectionSkillGates: React.FC = () => (
  <div className="space-y-4">
    <H2>SKILL GATES</H2>
    <Body>
      Every skill in the tree exists in one of three states: Locked, Active, or Unlocked. Status is
      always computed from your session log — never manually set.
    </Body>
    <H3>THE THREE STATES</H3>
    <div>
      <Rule label="🔒 LOCKED" value="Prerequisites not met. Node is visible but greyed out. Cannot be trained." />
      <Rule label="⚡ ACTIVE" value="All prerequisites met. Currently being trained. Session streak is accumulating." accent="lime" />
      <Rule label="✅ UNLOCKED" value="Unlock criteria met across the required consecutive sessions. Node glows. Next node becomes eligible." accent="lime" />
    </div>
    <H3>LOCKED → ACTIVE</H3>
    <Body>
      A node becomes Active when every node in its prerequisites array is Unlocked, AND all strength
      prerequisites are confirmed either via the most recent Benchmark result or via logged session
      history showing the required reps or holds achieved.
    </Body>
    <H3>ACTIVE → UNLOCKED</H3>
    <Body>
      A node unlocks when three conditions are simultaneously true after a session is saved:
    </Body>
    <div>
      <Rule label="STREAK MET" value="The required number of consecutive sessions logged at this node without interruption." />
      <Rule label="CRITERIA MET" value="Every session in the streak meets or exceeds the hold time or rep target for the node." />
      <Rule label="RPE ≤ 8" value="At least the final session in the streak was performed at RPE 8 or below — not a single max effort." />
    </div>
    <H3>WHAT COUNTS AS A STREAK</H3>
    <Body>
      A streak counts sessions where the skill was actually trained — not calendar days. Rest days,
      Z days, and deload weeks where skill work was omitted do not break the streak. Only one thing
      breaks it: logging a session where you trained the skill at a lower progression level than the
      current node. Regression is recorded and the counter resets at the new level.
    </Body>
    <H3>DELOAD WEEKS AND STREAKS</H3>
    <Body>
      During deload weeks (Block weeks 5 and 10), skill work continues but hold targets drop by 20%.
      Deload sessions count toward your consecutive session streak but do not count toward the unlock
      criteria threshold. The app tracks these separately.
    </Body>
    <H3>STALL DETECTION</H3>
    <Body>
      If you log 6 or more sessions at an Active node without triggering the unlock gate, the app
      surfaces a stall card with a suggested protocol: drop one progression level, add one additional
      set, and focus on quality — targeting 1–2 seconds longer per hold. The app does not automatically
      demote your node. The stall counter resets when the node unlocks or when you log a session at
      the level below.
    </Body>
    <H3>WHY YOU CANNOT MANUALLY PROMOTE NODES</H3>
    <Body>
      Calisthenics skills load connective tissue differently than barbell lifts. Tendons adapt more
      slowly than muscles and are the limiting factor in skill progression safety. The unlock gate
      enforces minimum exposure time regardless of perceived strength. It is not gatekeeping — it is
      injury prevention built into the data model.
    </Body>
    <SourcesFooter />
  </div>
)

const SectionHRZones: React.FC = () => {
  const { profile } = useAthleteProfile()
  const zones = getHRZones(profile.dateOfBirth)

  return (
    <div className="space-y-4">
      <H2>HR ZONES</H2>
      <Body>
        Heart rate zones calculated from your date of birth. Max HR: {220 - Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / 31557600000)} BPM.
      </Body>
      <div className="mt-2">
        {zones.map((z) => {
          const colorMap: Record<number, string> = {
            1: 'text-blue-400',
            2: 'text-green-400',
            3: 'text-yellow-400',
            4: 'text-orange-400',
          }
          const color = colorMap[z.zone] ?? 'text-text-2'
          return (
            <div key={z.zone} className="flex gap-3 items-start border-b border-line py-3 last:border-0">
              <div className="w-16 flex-shrink-0">
                <span className={`font-mono text-mono-xs ${color}`}>ZONE {z.zone}</span>
              </div>
              <div className="w-32 flex-shrink-0">
                <span className="font-mono text-mono-xs text-text-2">{z.bpmMin}–{z.bpmMax} BPM</span>
              </div>
              <div className="flex-1">
                <span className="font-mono text-mono-xs text-text-2 block">{z.name}</span>
                <span className="font-body text-xs text-text-3 mt-0.5 block">{z.description}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SectionTimeOff: React.FC = () => (
  <div className="space-y-4">
    <H2>TIME OFF PROTOCOL</H2>
    <Body>
      The rolling A/B/C sequence never resets. When you return after time off, you resume at the
      same letter you left off. The only variable is how much load and intensity adjustment to apply.
    </Body>
    <H3>DECISION TREE</H3>
    <div>
      <Rule label="MISSED 1–3 DAYS" value="No adjustment. Continue the sequence at the same node and load. Rest days are built into the system." accent="lime" />
      <Rule label="1 WEEK OFF" value="Resume the same skill node — streak is preserved. Reduce barbell loads 10–15%. No catch-up sessions." />
      <Rule label="2–3 WEEKS OFF" value="Treat the return week as a deload week. Skill node drops one level automatically. Rebuild at Phase 1 RPE (6–7) for 2 weeks before advancing load." accent="yellow" />
      <Rule label="SICK" value="Full rest. Mobility work only if comfortable. Return only after 48 hours symptom-free. Do not compress missed sessions." accent="red" />
      <Rule label="MOTIVATION DIP" value="Commit to 10 minutes only. Warm-up + skill + one set. Full permission to stop after. In practice, you rarely stop." />
    </div>
    <H3>THE CARDINAL RULE: NO CATCH-UP</H3>
    <Body>
      The most common post-time-off mistake is doubling up sessions to compensate. Do not do this.
      The A/B/C system tracks sessions, not weeks. Two sessions in one day does not count as two
      days of adaptation — it counts as one very fatiguing day that elevates injury risk for the
      sessions following it. Resume, reduce, rebuild — in that order.
    </Body>
    <H3>POST-TIME-OFF SKILL NOTE</H3>
    <Body>
      After 1 week off, connective tissue loses proprioceptive familiarity even if muscular strength
      is largely preserved. Start skill sessions conservatively — your first session back is a
      rehearsal, not a test of maximum hold time.
    </Body>
    <SourcesFooter />
  </div>
)

const SectionAutoregulation: React.FC = () => (
  <div className="space-y-4">
    <H2>AUTOREGULATION</H2>
    <Body>
      Autoregulation is the set of rules that translate your readiness inputs into session
      modifications. Every condition has exactly one documented response. Nothing is left to
      in-the-moment willpower.
    </Body>
    <H3>FULL CONDITIONS TABLE</H3>
    <div>
      <Rule label="GREEN READINESS" value="Sleep ≥ 70 AND stress ≤ 5 — Train as programmed. Optional top set at RPE 8–9." accent="lime" />
      <Rule label="YELLOW READINESS" value="Sleep 60–69 OR stress 6–7 — Drop RPE by 1 across all sets. Remove HIIT finisher. Keep all skill work at normal volume." accent="yellow" />
      <Rule label="RED READINESS" value="Sleep < 60 OR stress ≥ 8 — Skill work + 1 main lift, 3 sets only. No accessories, no conditioning." accent="red" />
      <Rule label="SICK" value="Full rest. Mobility only if comfortable. Return after 48 hr symptom-free." />
      <Rule label="1 WEEK OFF" value="Resume sequence. Reduce all loads 10–15%. No catch-up sessions." />
      <Rule label="2–3 WEEKS OFF" value="Treat as deload week. Rebuild Phase 1 RPE for 2 weeks. Skill drops one level." />
      <Rule label="ONLY 30 MIN" value="Skill 5 min → main lift 3×5 → done. Always counts as a session." accent="lime" />
      <Rule label="LOW MOTIVATION" value="Commit to 10 minutes only. Warm-up + skill + 1 set. Full permission to stop after." />
      <Rule label="FEEL GREAT, WANT MORE" value="Add exactly one top set at RPE 8–9. Do not add extra sessions or extra exercises." accent="lime" />
    </div>
    <H3>SESSION FEEL AND FUTURE SUGGESTIONS</H3>
    <Body>
      After each session you log a session feel: flat (😐), solid (🙂), or strong (💪). In v1 this
      is recorded in the session log for your own reference. In v2, session feel will feed into the
      suggestion model — two consecutive 😐 sessions at a given load may hold progression regardless
      of rep targets, and a 💪 session on the final day of a rep range may accelerate the weight
      suggestion.
    </Body>
    <H3>THE FEEL-GREAT RULE IN DETAIL</H3>
    <Body>
      Adding extra sessions because you feel good is the most common way intermediate athletes
      create overtraining incidents. A single top set at RPE 8–9 captures additional adaptation
      stimulus without meaningfully increasing recovery demand. Adding an entire extra session
      compresses recovery and shifts the next session's readiness — often turning the next green
      day yellow. The app enforces this by design: one top set per session maximum, zero extra
      sessions.
    </Body>
    <SourcesFooter />
  </div>
)

const SectionGlossary: React.FC = () => {
  const terms: [string, string][] = [
    ['A/B/C DAYS', 'The three rotating training day types. A = Lower Body (squat, RDL, split squat). B = Upper Push (bench, OHP, dip). C = Upper Pull (pull-up, row, deadlift). They rotate in sequence with no fixed weekday assignment.'],
    ['Z DAY', 'Free activity day — bike, hike, swim, sport, yoga, or anything else. Logged in the Move hub. Never interrupts the A/B/C sequence. Continue on the same letter next session.'],
    ['BLOCK', 'A 12-week training cycle. Phases in order: Accumulation (weeks 1–4) → Deload (week 5) → Intensification (weeks 6–9) → Deload (week 10) → Realization (weeks 11–12).'],
    ['ACCUMULATION', 'Phase 1 of a block (weeks 1–4). Moderate loads, 3–4 × 5–8 at RPE 6–7. Builds volume base and re-establishes movement patterns.'],
    ['INTENSIFICATION', 'Phase 3 of a block (weeks 6–9). Higher loads, 4 × 4–6 at RPE 7–8. Drives maximal strength adaptation.'],
    ['REALIZATION', 'Phase 5 of a block (weeks 11–12). Peak loads, 4–5 × 3–5 at RPE 8–9. Expresses the strength built in prior phases.'],
    ['DELOAD', 'A mandatory reduced-intensity training week. Occurs at weeks 5 and 10 of every block. Loads drop to 50–60% 1RM, RPE 5–6. Skill work continues at 80% hold targets. Cannot be skipped regardless of how the athlete feels.'],
    ['DOUBLE PROGRESSION', 'The primary load advancement model. Increase reps within a range (e.g. 5–8) across sessions first; when you hit the top of the range at RPE ≤ 8, add weight and begin the climb again.'],
    ['RPE', 'Rate of Perceived Exertion. A 1–10 scale of effort. RPE 8 = hard, 2 more reps in reserve. RPE 10 = absolute maximum. Most working sets in this program target RPE 6–8.'],
    ['1RM', 'One Rep Max — the maximum weight you can lift for a single full repetition with good form.'],
    ['E1RM', 'Estimated One Rep Max — a 1RM calculated from a multi-rep set using the Epley formula: e1RM = weight × (1 + reps ÷ 30).'],
    ['EPLEY FORMULA', 'Method for estimating 1RM from a multi-rep set: e1RM = weight × (1 + reps ÷ 30). Used during benchmark testing on the 3-rep test sets for squat and deadlift.'],
    ['REP RANGE', 'The lower and upper rep targets for a lift within a given phase. Example: 4×5–8 means 4 sets aiming for 5–8 reps per set.'],
    ['TOP SET', 'A single additional set at RPE 8–9 added when readiness is green and the athlete feels strong. Only one top set allowed per session. Never on red readiness.'],
    ['LOAD ANCHOR', 'The primary barbell lift in each session that drives double progression. The load anchor determines whether the session progressed or not. Skill-specific accessories are never load anchors.'],
    ['CNS', 'Central Nervous System. Skills are placed at the start of sessions when CNS is fresh because precise motor patterning degrades with fatigue.'],
    ['GST', 'Gymnastics Strength Training. The subset of bodyweight training focused on skill-specific accessory work targeting the active nodes in the skill tree. Tracked by RPE, not load.'],
    ['SKILL NODE', 'A single skill or progression step in the skill tree. Each node has prerequisites, strength requirements, unlock criteria, and a status (locked / active / unlocked).'],
    ['PROGRESSION LEVEL', 'A 1–5 scale within the skill tree indicating difficulty. 1 = Beginner, 3 = Intermediate, 5 = Elite. Used to determine skill priority order when multiple active skills compete for session placement.'],
    ['STREAK', 'A count of consecutive sessions where a skill was trained at the current node level, without interruption by a lower-level training session. Rest days and Z days do not break a streak.'],
    ['STALL', 'A condition triggered when 6+ sessions are logged at an Active skill node without the unlock gate firing. The app surfaces a stall protocol card recommending regression and added volume.'],
    ['READINESS LIGHT', 'A green / yellow / red signal computed from sleep score and stress level before each session. Determines session modifications automatically.'],
    ['SKILL-SPECIFIC ACCESSORIES', 'Bodyweight or ring-based movements from the active skill node\'s prerequisite chain, injected into the accessory slot of the generated session. Tracked by RPE only. Examples: chest-to-bar pull-ups for muscle-up, planche leans for planche.'],
    ['VO₂MAX', 'Maximum oxygen uptake — the gold-standard measure of aerobic capacity. Estimated via Apple Watch. Updated on benchmark days. The HIIT finisher on B days is the primary VO₂max training stimulus.'],
    ['ZONE 2', 'The aerobic base training zone. For this athlete: 118–148 BPM. Zone 2 sessions develop mitochondrial density and fat oxidation. Primarily accumulated via Z days (bike, hike, long walks above 118 BPM).'],
    ['HIIT', 'High-Intensity Interval Training. Structured intervals in Zone 4 (158–177 BPM). Appears as the Day B finisher (8–12 min). Never two days in a row. Formats: 4×4 Norwegian, 30-30s, 6×1 min, Tabata.'],
    ['DAG', 'Directed Acyclic Graph. The mathematical structure of the skill tree — a network of nodes with one-way prerequisite relationships and no circular dependencies. Validated at app startup.'],
  ]

  return (
    <div className="space-y-1">
      <H2>GLOSSARY</H2>
      <Body className="mt-1 mb-3">Every term used in the app, defined precisely.</Body>
      {terms.map(([term, def]) => (
        <div key={term} className="border-b border-line py-3 last:border-0">
          <span className="font-mono text-mono-xs text-lime block mb-0.5">{term}</span>
          <p className="font-body text-sm text-text-2 leading-relaxed">{def}</p>
        </div>
      ))}
      <SourcesFooter />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export const Reference: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('philosophy')
  const [query, setQuery] = useState('')
  const { handleExport, handleImport, handleClear, importError, importSuccess } = useStorage()

  // Real-time search: find tabs whose keywords match any word in query
  const matchingTabIds = useMemo<Set<TabId>>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return new Set()
    const words = q.split(/\s+/)
    const matched = new Set<TabId>()
    for (const tab of TABS) {
      for (const word of words) {
        if (tab.keywords.some(k => k.includes(word))) {
          matched.add(tab.id)
          break
        }
      }
    }
    return matched
  }, [query])

  const isSearching = query.trim().length > 0

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (val.trim()) {
      const q = val.trim().toLowerCase()
      const words = q.split(/\s+/)
      for (const tab of TABS) {
        for (const word of words) {
          if (tab.keywords.some(k => k.includes(word))) {
            setActiveTab(tab.id)
            return
          }
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-heading text-display-md text-text leading-none">REFERENCE</h1>
        <p className="font-mono text-mono-xs text-text-3 mt-1">
          System documentation. Every metric in the app has a ? that surfaces the relevant section.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-mono-xs text-text-3 pointer-events-none select-none">
          /
        </span>
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Search — sleep, deload, skill, zone 2..."
          className="w-full bg-bg-2 border border-line rounded pl-7 pr-8 py-2.5 font-mono text-mono-xs text-text-2 placeholder:text-text-3 focus:outline-none focus:border-lime transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-mono-xs text-text-3 hover:text-text-2 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tab bar — horizontally scrollable, no wrapping */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const isHighlighted = isSearching && matchingTabIds.has(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded border font-mono uppercase tracking-widest text-mono-xs transition-colors',
                isActive
                  ? 'border-lime bg-accent-dim text-lime'
                  : isHighlighted
                  ? 'border-lime/40 text-lime/70 hover:border-lime hover:text-lime'
                  : 'border-line text-text-3 hover:text-text-2',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content panel — highlighted border when this tab matches search */}
      <div
        className={[
          'bg-bg-2 border rounded p-4 space-y-2 animate-fade-up transition-all',
          isSearching && matchingTabIds.has(activeTab)
            ? 'border-l-2 border-l-lime border-line'
            : 'border-line',
        ].join(' ')}
      >
        {activeTab === 'philosophy' && <SectionPhilosophy />}
        {activeTab === 'readiness' && <SectionReadiness />}
        {activeTab === 'progression' && <SectionProgression />}
        {activeTab === 'skill-gates' && <SectionSkillGates />}
        {activeTab === 'hr-zones' && <SectionHRZones />}
        {activeTab === 'time-off' && <SectionTimeOff />}
        {activeTab === 'autoregulation' && <SectionAutoregulation />}
        {activeTab === 'glossary' && <SectionGlossary />}
      </div>

      {/* Data management */}
      <div className="bg-bg-2 border border-line rounded p-4 space-y-3">
        <h3 className="font-heading text-xl text-text leading-none tracking-wide">DATA</h3>
        <p className="font-body text-sm text-text-2">
          All data lives in your browser's local storage. Export regularly to back up your progress.
        </p>
        <div className="space-y-2">
          <Button variant="secondary" fullWidth onClick={handleExport}>
            ↓ Export JSON Backup
          </Button>
          <label className="block w-full cursor-pointer">
            <div className="w-full py-2.5 px-5 border border-line rounded text-center font-mono uppercase tracking-widest text-mono-xs text-text-3 hover:border-line-2 hover:text-text-2 transition-colors">
              ↑ Import JSON Backup
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
              }}
            />
          </label>
          {importError && (
            <p className="font-mono text-mono-xs text-red-400">{importError}</p>
          )}
          {importSuccess && (
            <p className="font-mono text-mono-xs text-lime">Import successful — reloading…</p>
          )}
          <Button variant="danger" fullWidth onClick={handleClear}>
            ✕ Clear All Data
          </Button>
        </div>
      </div>

      {/* Global sources footer */}
      <div className="text-center pb-4">
        <p className="font-mono text-mono-xs text-text-3 opacity-40">
          Sources: Overcoming Gravity 2nd Ed — Steven Low · Bodyweight Fitness Progressions v5.4 — r/bodyweightfitness
        </p>
      </div>
    </div>
  )
}

export default Reference
