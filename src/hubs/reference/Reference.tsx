import React, { useState } from 'react'
import { Tag } from '../../components/Tag'
import { useStorage } from '../../hooks/useStorage'
import { Button } from '../../components/Button'
import { HR_ZONES } from '../../types/athlete'

const SECTIONS = [
  'Philosophy',
  'Readiness Light',
  'Double Progression',
  'Skill Tree Rules',
  'HR Zones',
  'Time Off Protocol',
  'Autoregulation',
  'RPE Scale',
  'Data',
  'Glossary',
]

export const Reference: React.FC = () => {
  const [activeSection, setActiveSection] = useState('Philosophy')
  const { handleExport, handleImport, handleClear, importError, importSuccess } = useStorage()

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-display-md text-text leading-none">REFERENCE</h1>
      <p className="font-mono text-mono-xs text-text-3">
        System documentation. Every metric has a ? in-app that surfaces the relevant section.
      </p>

      {/* Section tabs — scrollable */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={[
              'flex-shrink-0 px-3 py-1.5 rounded border font-mono uppercase tracking-widest text-mono-xs transition-colors',
              activeSection === s
                ? 'border-lime bg-accent-dim text-lime'
                : 'border-line text-text-3 hover:text-text-2',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-bg-2 border border-line rounded p-4 space-y-4 animate-fade-up">
        {activeSection === 'Philosophy' && <SectionPhilosophy />}
        {activeSection === 'Readiness Light' && <SectionReadiness />}
        {activeSection === 'Double Progression' && <SectionDoubleProgression />}
        {activeSection === 'Skill Tree Rules' && <SectionSkillTree />}
        {activeSection === 'HR Zones' && <SectionHRZones />}
        {activeSection === 'Time Off Protocol' && <SectionTimeOff />}
        {activeSection === 'Autoregulation' && <SectionAutoregulation />}
        {activeSection === 'RPE Scale' && <SectionRPE />}
        {activeSection === 'Data' && (
          <SectionData
            onExport={handleExport}
            onImport={handleImport}
            onClear={handleClear}
            importError={importError}
            importSuccess={importSuccess}
          />
        )}
        {activeSection === 'Glossary' && <SectionGlossary />}
      </div>

      {/* Sources */}
      <div className="text-center space-y-1 pt-4">
        <p className="font-mono text-mono-xs text-text-3">Sources</p>
        <p className="font-mono text-mono-xs text-text-3 opacity-60">Overcoming Gravity 2nd Ed — Steven Low</p>
        <p className="font-mono text-mono-xs text-text-3 opacity-60">Bodyweight Fitness Progressions v5.4 — r/bodyweightfitness</p>
      </div>
    </div>
  )
}

// ── Section components ─────────────────────────────────────────────────────────

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="font-heading text-display-sm text-lime leading-none">{children}</h2>
)
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-body text-sm text-text-2 leading-relaxed">{children}</p>
)
const Row: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="flex gap-3 items-start border-b border-line py-2 last:border-0">
    <span className="font-mono text-mono-xs text-text-3 w-32 flex-shrink-0">{label}</span>
    <span className={`font-mono text-mono-xs ${accent ? 'text-lime' : 'text-text-2'}`}>{value}</span>
  </div>
)

const SectionPhilosophy: React.FC = () => (
  <div className="space-y-3">
    <H2>SYSTEM PHILOSOPHY</H2>
    <P>Open the app. Know exactly what to do today. That's it.</P>
    <P>Galaxy Fit is a long-term hybrid athlete training system designed to last 2–10 years without burnout. It combines strength, calisthenics skill progression, VO₂max development, and mobility in a rolling A/B/C sequence that never resets.</P>
    <div className="space-y-2 mt-2">
      {[
        ['Never guilt.', 'Blank days are blank, not failures.'],
        ['Always actionable.', 'Open → know what to do.'],
        ['Structurally resilient.', 'Missed days don\'t break anything.'],
        ['Skill gates enforced.', 'You cannot self-promote nodes.'],
        ['Deloads are structural.', 'Mandatory at weeks 5 and 10.'],
      ].map(([bold, rest]) => (
        <div key={bold} className="flex gap-2">
          <span className="font-mono text-mono-xs text-lime flex-shrink-0">—</span>
          <p className="font-body text-sm text-text-2">
            <span className="text-text font-medium">{bold}</span> {rest}
          </p>
        </div>
      ))}
    </div>
  </div>
)

const SectionReadiness: React.FC = () => (
  <div className="space-y-3">
    <H2>READINESS LIGHT</H2>
    <P>Computed from your sleep and stress scores before each session.</P>
    <div className="space-y-2">
      <Row label="🟢 Green" value="Sleep ≥ 7 AND stress ≤ 5 — Train as programmed. Optional top set." accent />
      <Row label="🟡 Yellow" value="Sleep 6–7 OR stress 6–7 (not both bad) — Drop RPE by 1. Skip HIIT. Keep skill." />
      <Row label="🔴 Red" value="Sleep < 6 OR stress ≥ 8 (either alone triggers red) — Skill + 1 main lift only. No conditioning." />
    </div>
    <P>Red is triggered by either condition alone — you don't need both to be bad.</P>
  </div>
)

const SectionDoubleProgression: React.FC = () => (
  <div className="space-y-3">
    <H2>DOUBLE PROGRESSION</H2>
    <P>Each lift has a rep range (e.g. 4×5–8). You progress through reps first, then weight.</P>
    <Row label="Advance" value="Hit top of range (all sets) at RPE ≤ 8 → add 2.5–5kg lower / 1.25–2.5kg upper" accent />
    <Row label="Deload" value="Can't hit bottom of range → drop 10%, rebuild" />
    <P>Example: Squat 4×5–8. Hit 4×8 at RPE 7 → add 5kg next session. Can't hit 4×5 → deload 10%.</P>
  </div>
)

const SectionSkillTree: React.FC = () => (
  <div className="space-y-3">
    <H2>SKILL TREE RULES</H2>
    <Row label="Locked → Active" value="All prerequisite nodes unlocked + strength prereqs met" />
    <Row label="Active → Unlocked" value="Consecutive sessions at node meeting hold/rep threshold + RPE ≤ 8 on final session" accent />
    <Row label="Stall" value="6+ sessions at a node without advancing → app surfaces stall protocol" />
    <Row label="Stall protocol" value="Drop one level, add one set, focus on quality" />
    <Row label="Deload sessions" value="Count toward streak but NOT toward unlock criteria" />
    <Row label="Rest days" value="Do NOT break the streak" />
    <P>Nodes cannot be manually promoted. The app enforces all gates structurally.</P>
  </div>
)

const SectionHRZones: React.FC = () => (
  <div className="space-y-3">
    <H2>HR ZONES</H2>
    <P>Based on estimated max HR ~197 BPM (age 23 formula).</P>
    {HR_ZONES.map(z => (
      <div key={z.zone} className="border-b border-line py-2 last:border-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-mono-xs text-text-2">Zone {z.zone} — {z.name}</span>
          <Tag variant="neutral">{z.bpmRange[0]}–{z.bpmRange[1]} BPM</Tag>
        </div>
        <p className="font-body text-xs text-text-3 mt-0.5">{z.description}</p>
      </div>
    ))}
    <P>Zone 2 threshold (≥118 BPM) is the minimum for an activity to count as a cardio event.</P>
  </div>
)

const SectionTimeOff: React.FC = () => (
  <div className="space-y-3">
    <H2>TIME OFF PROTOCOL</H2>
    <Row label="1 week off" value="Resume sequence. Reduce loads 10–15%. Skill streak preserved. No catch-up." accent />
    <Row label="2–3 weeks off" value="Treat as deload week. Rebuild Phase 1 RPE for 2 weeks. Skill node drops one level." />
    <Row label="Sick" value="Full rest, mobility only. Return after 48hr symptom-free." />
    <P>The rolling A/B/C sequence never resets. Pick up at the same letter you left off.</P>
  </div>
)

const SectionAutoregulation: React.FC = () => (
  <div className="space-y-3">
    <H2>AUTOREGULATION</H2>
    {[
      ['Green (sleep ≥7, stress ≤5)', 'Train as programmed. Optional top set at RPE 8–9.'],
      ['Yellow (moderate readiness)', 'Drop RPE by 1. Remove HIIT finisher. Keep skill work.'],
      ['Red (sleep <6 or stress ≥8)', 'Skill + 1 main lift only. No conditioning.'],
      ['Only 30 min', 'Skill 5 min → main lift 3×5 → done. Always counts.'],
      ['Low motivation', 'Commit to 10 min only. Permission to stop after.'],
      ['Feel great, want more', 'Add one top set at RPE 8–9. Do NOT add extra sessions.'],
    ].map(([cond, action]) => (
      <Row key={cond} label={cond} value={action} />
    ))}
  </div>
)

const SectionRPE: React.FC = () => (
  <div className="space-y-3">
    <H2>RPE SCALE</H2>
    <P>Rate of Perceived Exertion — how hard the set felt, 1–10.</P>
    {[
      ['RPE 5–6', 'Easy. Could do 4–5 more reps.'],
      ['RPE 7', 'Moderate. Could do 3 more.'],
      ['RPE 8', 'Hard. Could do 2 more. Target for most working sets.'],
      ['RPE 9', 'Very hard. 1 more rep possible. Top sets on realization phase.'],
      ['RPE 10', 'Absolute max. True 1RM. Use sparingly.'],
    ].map(([rpe, desc]) => (
      <Row key={rpe} label={rpe} value={desc} />
    ))}
  </div>
)

const SectionData: React.FC<{
  onExport: () => void;
  onImport: (f: File) => void;
  onClear: () => void;
  importError: string | null;
  importSuccess: boolean;
}> = ({ onExport, onImport, onClear, importError, importSuccess }) => (
  <div className="space-y-4">
    <H2>DATA MANAGEMENT</H2>
    <P>All data is stored locally in your browser. Export regularly to back up your progress.</P>
    <div className="space-y-3">
      <Button variant="secondary" fullWidth onClick={onExport}>
        ↓ Export JSON Backup
      </Button>
      <div>
        <label className="block w-full">
          <span className="sr-only">Import backup</span>
          <div className="w-full py-2.5 px-5 border border-line rounded text-center font-mono uppercase tracking-widest text-mono-xs text-text-3 hover:border-line-2 hover:text-text-2 transition-colors cursor-pointer">
            ↑ Import JSON Backup
            <input type="file" accept=".json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f) }} />
          </div>
        </label>
        {importError && <p className="font-mono text-mono-xs text-accent-3 mt-1">{importError}</p>}
        {importSuccess && <p className="font-mono text-mono-xs text-lime mt-1">Import successful — reloading…</p>}
      </div>
      <Button variant="danger" fullWidth onClick={onClear}>
        ✕ Clear All Data
      </Button>
    </div>
  </div>
)

const SectionGlossary: React.FC = () => (
  <div className="space-y-1">
    <H2>GLOSSARY</H2>
    {[
      ['A/B/C', 'The three training day types. A=Lower, B=Upper Push, C=Upper Pull.'],
      ['Z Day', 'Free activity day. Logged but never interrupts the A/B/C sequence.'],
      ['Block', 'A 12-week training cycle. Phases: Accumulation → Deload → Intensification → Deload → Realization.'],
      ['Double Progression', 'Increase reps first (within range), then increase load.'],
      ['RPE', 'Rate of Perceived Exertion. 1–10 scale of effort.'],
      ['1RM', 'One Rep Max — the maximum weight you can lift for one repetition.'],
      ['Epley', 'Formula for estimating 1RM from a multi-rep set: weight × (1 + reps/30).'],
      ['CNS', 'Central Nervous System. Skill work is placed first when CNS is fresh.'],
      ['GST', 'Gymnastics Strength Training. Skill-specific accessory work.'],
      ['DAG', 'Directed Acyclic Graph — the prerequisite structure of the skill tree.'],
      ['VO₂max', 'Maximum oxygen uptake — a measure of aerobic capacity.'],
      ['Zone 2', 'Aerobic base training zone. 118–148 BPM for this athlete.'],
    ].map(([term, def]) => (
      <div key={term} className="border-b border-line py-2 last:border-0">
        <span className="font-mono text-mono-xs text-lime">{term}</span>
        <p className="font-body text-xs text-text-2 mt-0.5">{def}</p>
      </div>
    ))}
  </div>
)

export default Reference
