import React, { useMemo, useState } from 'react'
import { DEFAULT_ATHLETE, EQUIPMENT_OPTIONS, type AthleteProfile, type EquipmentId } from '../../types/athlete'
import { getAge, getMaxHR, getZone2Min, getZone2Max } from '../../lib/hrZones'
import { uuid } from '../../lib/uuid'
import { Button } from '../../components/Button'

interface Props {
  onComplete: (profile: AthleteProfile, baselineUnlocks: string[]) => void
}

const DAY_OPTIONS = [
  { value: 'A' as const, label: 'Day A', sublabel: 'Lower Body — Squat, RDL, Split Squat' },
  { value: 'B' as const, label: 'Day B', sublabel: 'Upper Push — Bench, OHP, Dip' },
  { value: 'C' as const, label: 'Day C', sublabel: 'Upper Pull — Pull-Up, Row, Deadlift' },
]

const EXPLAINER_CARDS = [
  {
    heading: 'THE A/B/C SYSTEM',
    body: 'Three day types, rolling sequence. No fixed schedule. Miss a day — pick up exactly where you left off. The sequence never resets, never breaks.',
  },
  {
    heading: 'THE SKILL TREE',
    body: 'Nodes unlock automatically when you hit criteria. You cannot self-promote. The app tracks your streak and tells you when you\'re ready to advance.',
  },
  {
    heading: 'READINESS LIGHT',
    body: 'Every session starts with a readiness check. Green trains full. Yellow drops intensity. Red drops to skill + one lift. The system adapts so you never have to decide.',
  },
  {
    heading: 'THE ONE RULE',
    body: 'Open the app. Do what it says. Don\'t overthink it. Everything else is handled.',
  },
]

const DEFAULT_EQUIPMENT_SELECTION: EquipmentId[] = [
  'barbell-rack',
  'pull-up-bar',
  'dip-bars-rings',
  'resistance-bands',
  'gymnastics-rings',
  'outdoor-park',
  'mountain-bike',
]

const GOAL_SKILLS = [
  { id: 'front-lever',            label: 'Front Lever',  emoji: '🏋️', tree: 'PULLING'  },
  { id: 'planche',                label: 'Planche',      emoji: '🤸', tree: 'PUSHING'  },
  { id: 'muscle-up',              label: 'Muscle-Up',    emoji: '💪', tree: 'PULLING'  },
  { id: 'freestanding-handstand', label: 'Handstand',    emoji: '🙆', tree: 'BALANCE'  },
  { id: 'back-lever',             label: 'Back Lever',   emoji: '⬆️', tree: 'PULLING'  },
  { id: 'l-sit',                  label: 'L-Sit',        emoji: '🪑', tree: 'PUSHING'  },
  { id: 'human-flag',             label: 'Human Flag',   emoji: '🚩', tree: 'PULLING'  },
  { id: 'pistol-squat',           label: 'Pistol Squat', emoji: '🦵', tree: 'MOBILITY' },
  { id: 'freestanding-hspu',      label: 'HSPU',         emoji: '🙃', tree: 'PUSHING'  },
  { id: 'dragon-flag',            label: 'Dragon Flag',  emoji: '🐉', tree: 'PUSHING'  },
  { id: 'nordic-curl',            label: 'Nordic Curl',  emoji: '🦿', tree: 'MOBILITY' },
] as const

interface BaselineQuestion {
  id:         string
  question:   string
  unlocks:    string[]    // node IDs to mark 'unlocked' when answered YES
  goalFilter: string[]    // only show question if user selected one of these goals
}

const BASELINE_QUESTIONS: BaselineQuestion[] = [
  {
    id:         'q-dead-hang',
    question:   'Can you hang from a bar for 30 seconds?',
    unlocks:    ['dead-hang'],
    goalFilter: ['front-lever', 'back-lever', 'muscle-up', 'human-flag'],
  },
  {
    id:         'q-pull-ups',
    question:   'Can you do 5 strict pull-ups?',
    unlocks:    ['scapular-pull', 'arch-hang'],
    goalFilter: ['front-lever', 'back-lever', 'muscle-up', 'human-flag'],
  },
  {
    id:         'q-hollow-body',
    question:   'Can you hold a hollow body position for 20 seconds?',
    unlocks:    ['hollow-body'],
    goalFilter: ['planche', 'l-sit', 'freestanding-handstand', 'dragon-flag', 'freestanding-hspu', 'human-flag', 'back-lever', 'muscle-up'],
  },
  {
    id:         'q-push-ups',
    question:   'Can you do 10 push-ups?',
    unlocks:    ['support-hold'],
    goalFilter: ['planche', 'l-sit', 'freestanding-handstand', 'dragon-flag', 'freestanding-hspu', 'human-flag', 'muscle-up'],
  },
  {
    id:         'q-tuck-l-sit',
    question:   'Can you hold a tuck L-sit for 5 seconds?',
    unlocks:    ['tuck-l-sit'],
    goalFilter: ['l-sit', 'planche', 'freestanding-hspu'],
  },
  {
    id:         'q-wall-handstand',
    question:   'Can you hold a wall handstand for 30 seconds?',
    unlocks:    ['wall-handstand'],
    goalFilter: ['freestanding-handstand', 'freestanding-hspu'],
  },
  {
    id:         'q-assisted-pistol',
    question:   'Can you do an assisted pistol squat (using a band or pole)?',
    unlocks:    ['cossack-squat', 'shrimp-squat'],
    goalFilter: ['pistol-squat'],
  },
  {
    id:         'q-nordic-negative',
    question:   'Can you lower slowly in a Nordic curl (eccentric only)?',
    unlocks:    ['nordic-curl-negative'],
    goalFilter: ['nordic-curl'],
  },
]

const QUESTION_UNLOCKS: Record<string, string[]> = Object.fromEntries(
  BASELINE_QUESTIONS.map(q => [q.id, q.unlocks])
)

function buildDobISO(day: string, month: string, year: string): string | null {
  const d = Number.parseInt(day, 10)
  const m = Number.parseInt(month, 10)
  const y = Number.parseInt(year, 10)

  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null
  if (y < 1970 || y > 2015) return null
  if (m < 1 || m > 12) return null
  if (d < 1 || d > 31) return null

  const utc = new Date(Date.UTC(y, m - 1, d))
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null
  }

  const isoMonth = String(m).padStart(2, '0')
  const isoDay = String(d).padStart(2, '0')
  return `${y}-${isoMonth}-${isoDay}`
}

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)

  // Step 1 — Name
  const [name, setName] = useState('')

  // Step 2 — Date of Birth
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [dobError, setDobError] = useState('')

  // Step 3 — Starting Day
  const [nextDay, setNextDay] = useState<'A' | 'B' | 'C'>('A')

  // Step 4 — Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentId[]>(() => {
    const allowed = new Set(EQUIPMENT_OPTIONS.map(opt => opt.id))
    return DEFAULT_EQUIPMENT_SELECTION.filter(id => allowed.has(id))
  })

  // Step 5 — Goal skill selection (1–3 terminal node IDs)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  // Step 6 — Movement baseline (question ID → true/false)
  const [baselineAnswers, setBaselineAnswers] = useState<Record<string, boolean>>({})

  // Step 7 — Explainer card index
  const [cardIndex, setCardIndex] = useState(0)

  const dobISO = useMemo(() => buildDobISO(dobDay, dobMonth, dobYear), [dobDay, dobMonth, dobYear])
  const dobPreview = useMemo((): string | null => {
    if (!dobISO) return null
    try {
      const age = getAge(dobISO)
      const maxHR = getMaxHR(dobISO)
      const z2min = getZone2Min(dobISO)
      const z2max = getZone2Max(dobISO)
      return `Age: ${age} · Max HR: ${maxHR} bpm · Zone 2: ${z2min}–${z2max} bpm`
    } catch {
      return null
    }
  }, [dobISO])

  function validateAndAdvanceDob() {
    if (!dobDay || !dobMonth || !dobYear) {
      setDobError('Please enter a valid date')
      return
    }
    if (!dobISO) {
      setDobError('Please enter a valid date')
      return
    }
    setDobError('')
    setStep(3)
  }

  // ── Equipment helpers ────────────────────────────────────────────────────────

  function toggleEquipment(id: EquipmentId) {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  // ── Goal skill helpers ───────────────────────────────────────────────────────

  function toggleGoal(id: string) {
    setSelectedGoals(prev => {
      if (prev.includes(id)) return prev.filter(g => g !== id)
      if (prev.length >= 3) return prev   // max 3
      return [...prev, id]
    })
  }

  // Baseline questions filtered to only those relevant to the user's selected goals
  const activeBaselineQuestions = useMemo(() =>
    BASELINE_QUESTIONS.filter(q =>
      q.goalFilter.some(g => selectedGoals.includes(g))
    ),
  [selectedGoals])

  // ── Completion ───────────────────────────────────────────────────────────────

  const handleComplete = () => {
    const dob = dobISO ?? DEFAULT_ATHLETE.dateOfBirth
    const now = new Date().toISOString()
    const profile: AthleteProfile = {
      ...DEFAULT_ATHLETE,
      id: uuid(),
      name: name.trim() || 'Athlete',
      avatarEmoji: DEFAULT_ATHLETE.avatarEmoji,
      dateOfBirth: dob,
      units: DEFAULT_ATHLETE.units,
      equipment: selectedEquipment,
      goalSkills: selectedGoals,
      blockPosition: {
        ...DEFAULT_ATHLETE.blockPosition,
        nextDayType: nextDay,
      },
      createdAt: now,
      updatedAt: now,
    }

    // Collect node IDs to pre-unlock from baseline answers
    const baselineUnlocks: string[] = []
    for (const [qId, answered] of Object.entries(baselineAnswers)) {
      if (answered) {
        baselineUnlocks.push(...(QUESTION_UNLOCKS[qId] ?? []))
      }
    }

    onComplete(profile, baselineUnlocks)
  }

  const totalSteps = 7

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[999]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="h-[52px] flex items-center px-4 border-b border-line flex-shrink-0">
        <span className="font-heading text-lg tracking-widest text-lime">GALAXY FIT</span>
        <span className="ml-auto font-mono text-mono-xs text-text-3">Setup {step}/{totalSteps}</span>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-bg-3 flex-shrink-0">
        <div
          className="h-full bg-lime transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[500px] mx-auto px-6 py-8 space-y-8">

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">WHO ARE YOU?</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  Galaxy Fit is a serious training instrument. No fluff, no reminders, no guilt. Just open it and know what to do.
                </p>
              </div>

              <div>
                <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Athlete"
                  autoFocus
                  className="w-full bg-bg-2 border border-line rounded px-4 py-3 font-body text-base text-text focus:outline-none focus:border-lime placeholder:text-text-3"
                />
              </div>

              <div className="bg-bg-2 border border-line rounded p-4 space-y-2">
                {[
                  'No fixed schedule. Sequence never resets.',
                  'Skill tree gates are enforced. No manual promotions.',
                  'Blank days are blank. Not failures.',
                  'Deloads are structural. Mandatory.',
                ].map(point => (
                  <div key={point} className="flex items-start gap-2">
                    <span className="text-lime flex-shrink-0 mt-0.5 font-mono text-xs">—</span>
                    <p className="font-body text-sm text-text-2">{point}</p>
                  </div>
                ))}
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setStep(2)}
              >
                Next →
              </Button>
            </div>
          )}

          {/* ── Step 2: Date of Birth ── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">HOW OLD ARE YOU?</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  Used to calculate your HR zones. Never shared.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  {/* Day */}
                  <div className="flex-1">
                    <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
                      DAY
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={dobDay}
                      onChange={e => { setDobDay(e.target.value); setDobError('') }}
                      placeholder="14"
                      className="w-full bg-bg-2 border border-line rounded px-4 py-3 font-body text-base text-text focus:outline-none focus:border-lime placeholder:text-text-3"
                    />
                  </div>
                  {/* Month */}
                  <div className="flex-1">
                    <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
                      MONTH
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={dobMonth}
                      onChange={e => { setDobMonth(e.target.value); setDobError('') }}
                      placeholder="8"
                      className="w-full bg-bg-2 border border-line rounded px-4 py-3 font-body text-base text-text focus:outline-none focus:border-lime placeholder:text-text-3"
                    />
                  </div>
                  {/* Year */}
                  <div className="flex-[2]">
                    <label className="font-mono uppercase tracking-widest text-mono-xs text-text-3 block mb-2">
                      YEAR
                    </label>
                    <input
                      type="number"
                      min={1970}
                      max={2015}
                      value={dobYear}
                      onChange={e => { setDobYear(e.target.value); setDobError('') }}
                      placeholder="2002"
                      className="w-full bg-bg-2 border border-line rounded px-4 py-3 font-body text-base text-text focus:outline-none focus:border-lime placeholder:text-text-3"
                    />
                  </div>
                </div>

                {/* Inline error */}
                {dobError && (
                  <p className="font-mono text-mono-xs" style={{ color: '#f05050' }}>
                    {dobError}
                  </p>
                )}

                {/* Live HR preview */}
                {dobPreview && !dobError && (
                  <p className="font-mono text-mono-xs text-text-3">
                    {dobPreview}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(1)}>← Back</Button>
                <Button variant="primary" size="lg" fullWidth onClick={validateAndAdvanceDob}>
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Starting Day ── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">WHERE DO YOU START?</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  Pick the day type you're starting with. The A/B/C sequence rolls from here — no fixed weekdays.
                </p>
              </div>

              <div className="space-y-2" role="radiogroup" aria-label="Starting day type">
                {DAY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNextDay(opt.value)}
                    role="radio"
                    aria-checked={nextDay === opt.value}
                    className={[
                      'w-full flex items-center gap-4 p-4 rounded border text-left transition-all',
                      nextDay === opt.value
                        ? 'border-lime bg-accent-dim'
                        : 'border-line bg-bg-2 hover:border-line-2',
                    ].join(' ')}
                  >
                    <span className={`font-heading text-display-md leading-none flex-shrink-0 ${
                      nextDay === opt.value ? 'text-lime' : 'text-text-3'
                    }`}>
                      {opt.value}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-text">{opt.label}</p>
                      <p className="font-mono text-mono-xs text-text-3 mt-0.5">{opt.sublabel}</p>
                    </div>
                    {nextDay === opt.value && (
                      <span aria-hidden className="ml-auto text-lime">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(2)}>← Back</Button>
                <Button variant="primary" size="lg" fullWidth onClick={() => setStep(4)}>Next →</Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Equipment ── */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">YOUR EQUIPMENT</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  What do you have access to? Session generation adapts to your setup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Equipment selection">
                {EQUIPMENT_OPTIONS.map(opt => {
                  const checked = selectedEquipment.includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleEquipment(opt.id)}
                      aria-pressed={checked}
                      className={[
                        'flex items-center gap-3 p-3 rounded border text-left transition-all',
                        checked
                          ? 'border-lime bg-accent-dim'
                          : 'border-line bg-bg-2 hover:border-line-2',
                      ].join(' ')}
                    >
                      <span className="text-xl flex-shrink-0">{opt.icon}</span>
                      <span className={`font-body text-sm ${checked ? 'text-text' : 'text-text-3'}`}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="bg-bg-2 border border-line rounded p-3">
                <p className="font-mono text-mono-xs text-text-3">You can change these later in Settings.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(3)}>← Back</Button>
                <Button variant="primary" size="lg" fullWidth onClick={() => setStep(5)}>Next →</Button>
              </div>
            </div>
          )}

          {/* ── Step 5: Goal Skills ── */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">WHAT DO YOU WANT TO ACHIEVE?</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  Pick 1–3 goals. Your skill tree shows only the paths you're working toward.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Goal skill selection">
                {GOAL_SKILLS.map(goal => {
                  const checked = selectedGoals.includes(goal.id)
                  const maxReached = selectedGoals.length >= 3 && !checked
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      aria-pressed={checked}
                      disabled={maxReached}
                      className={[
                        'flex flex-col gap-1 p-3 rounded border text-left transition-all',
                        checked
                          ? 'border-lime bg-accent-dim'
                          : maxReached
                            ? 'border-line bg-bg-2 opacity-40 cursor-not-allowed'
                            : 'border-line bg-bg-2 hover:border-line-2',
                      ].join(' ')}
                    >
                      <span className="text-xl">{goal.emoji}</span>
                      <span className={`font-body text-sm ${checked ? 'text-text' : 'text-text-2'}`}>{goal.label}</span>
                      <span className="font-mono text-mono-xs text-text-3">{goal.tree}</span>
                    </button>
                  )
                })}
              </div>

              {selectedGoals.length >= 3 && (
                <p className="font-mono text-mono-xs text-text-3 text-center">
                  Deselect a goal to choose a different one.
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(4)}>← Back</Button>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => setStep(6)}
                  disabled={selectedGoals.length === 0}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 6: Movement Baseline ── */}
          {step === 6 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">WHERE ARE YOU STARTING?</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  These answers skip you past skills you already have. Be honest.
                </p>
              </div>

              {activeBaselineQuestions.length === 0 ? (
                <div className="bg-bg-2 border border-line rounded p-4">
                  <p className="font-body text-sm text-text-2">
                    Your goals build from the ground up — you'll start at the foundations.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeBaselineQuestions.map(q => {
                    const answer = baselineAnswers[q.id]
                    return (
                      <div key={q.id} className="bg-bg-2 border border-line rounded p-4">
                        <p className="font-body text-sm text-text mb-3">{q.question}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBaselineAnswers(prev => ({ ...prev, [q.id]: true }))}
                            className={[
                              'flex-1 py-2 rounded border font-mono text-mono-xs tracking-widest transition-all',
                              answer === true
                                ? 'border-lime bg-accent-dim text-lime'
                                : 'border-line bg-bg-3 text-text-3 hover:border-line-2',
                            ].join(' ')}
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            onClick={() => setBaselineAnswers(prev => ({ ...prev, [q.id]: false }))}
                            className={[
                              'flex-1 py-2 rounded border font-mono text-mono-xs tracking-widest transition-all',
                              answer === false
                                ? 'border-red bg-bg-3 text-red'
                                : 'border-line bg-bg-3 text-text-3 hover:border-line-2',
                            ].join(' ')}
                          >
                            NO
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(5)}>← Back</Button>
                <Button variant="primary" size="lg" fullWidth onClick={() => setStep(7)}>Next →</Button>
              </div>
            </div>
          )}

          {/* ── Step 7: Explainer cards ── */}
          {step === 7 && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-start justify-between">
                <h1 className="font-heading text-display-md text-text leading-none">ONE MORE THING</h1>
                <button
                  type="button"
                  onClick={handleComplete}
                  className="font-mono text-mono-xs text-text-3 hover:text-text transition-colors mt-1"
                >
                  Skip →
                </button>
              </div>

              {/* Card */}
              <div className="bg-bg-2 border border-line rounded p-6 min-h-[160px] flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="font-heading text-display-sm text-lime leading-none">
                    {EXPLAINER_CARDS[cardIndex].heading}
                  </p>
                  <p className="font-body text-sm text-text-2 leading-relaxed">
                    {EXPLAINER_CARDS[cardIndex].body}
                  </p>
                </div>
              </div>

              {/* Card indicator dots */}
              <div className="flex items-center justify-center gap-2">
                {EXPLAINER_CARDS.map((card, i) => (
                  <button
                    key={card.heading}
                    onClick={() => setCardIndex(i)}
                    type="button"
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      backgroundColor: i === cardIndex ? '#c8f050' : '#333330',
                    }}
                    aria-label={`Card ${i + 1}: ${card.heading}`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-2">
                {cardIndex > 0 ? (
                  <Button variant="ghost" size="lg" onClick={() => setCardIndex(prev => prev - 1)}>← Back</Button>
                ) : (
                  <Button variant="ghost" size="lg" onClick={() => setStep(6)}>← Back</Button>
                )}

                {cardIndex < EXPLAINER_CARDS.length - 1 ? (
                  <Button variant="primary" size="lg" fullWidth onClick={() => setCardIndex(i => i + 1)}>
                    Next →
                  </Button>
                ) : (
                  <Button variant="primary" size="lg" fullWidth onClick={handleComplete}>
                    Let's Go →
                  </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
