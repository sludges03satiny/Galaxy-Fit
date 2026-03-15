import React, { useState } from 'react'
import type { AthleteProfile } from '../../types/athlete'
import { DEFAULT_ATHLETE } from '../../types/athlete'
import { Button } from '../../components/Button'
interface Props {
  onComplete: (profile: AthleteProfile) => void
}

const DAY_OPTIONS = [
  { value: 'A' as const, label: 'Day A', sublabel: 'Lower Body — Squat, RDL, Split Squat' },
  { value: 'B' as const, label: 'Day B', sublabel: 'Upper Push — Bench, OHP, Dip' },
  { value: 'C' as const, label: 'Day C', sublabel: 'Upper Pull — Pull-Up, Row, Deadlift' },
]

const EQUIPMENT_OPTIONS = [
  { key: 'hasGym',        label: 'Full Gym', icon: '🏋️' },
  { key: 'hasRings',      label: 'Rings',    icon: '⭕' },
  { key: 'hasOutdoorBars',label: 'Outdoor Bars', icon: '🌳' },
  { key: 'hasBands',      label: 'Bands',    icon: '🔗' },
  { key: 'hasBike',       label: 'Bike',     icon: '🚵' },
] as const

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [nextDay, setNextDay] = useState<'A' | 'B' | 'C'>('A')
  const [equipment, setEquipment] = useState({
    hasGym: true,
    hasRings: true,
    hasOutdoorBars: true,
    hasBands: true,
    hasBike: true,
  })

  const toggleEquipment = (key: keyof typeof equipment) => {
    setEquipment(e => ({ ...e, [key]: !e[key] }))
  }

  const handleComplete = () => {
    const profile: AthleteProfile = {
      ...DEFAULT_ATHLETE,
      name: name.trim() || 'Athlete',
      ...equipment,
      blockPosition: {
        ...DEFAULT_ATHLETE.blockPosition,
        nextDayType: nextDay,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onComplete(profile)
  }

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
        <span className="ml-auto font-mono text-mono-xs text-text-3">Setup {step}/3</span>
      </header>

      {/* Progress */}
      <div className="h-0.5 bg-bg-3 flex-shrink-0">
        <div
          className="h-full bg-lime transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
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

          {/* ── Step 2: Starting day ── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">WHERE DO YOU START?</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  Pick the day type you're starting with. The A/B/C sequence rolls from here — no fixed weekdays.
                </p>
              </div>

              <div className="space-y-2">
                {DAY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNextDay(opt.value)}
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
                      <span className="ml-auto text-lime">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(1)}>← Back</Button>
                <Button variant="primary" size="lg" fullWidth onClick={() => setStep(3)}>Next →</Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Equipment ── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="font-heading text-display-md text-text leading-none">YOUR EQUIPMENT</h1>
                <p className="font-body text-sm text-text-3 mt-2">
                  What do you have access to? This informs session generation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map(opt => {
                  const checked = equipment[opt.key]
                  return (
                    <button
                      key={opt.key}
                      onClick={() => toggleEquipment(opt.key)}
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
                <p className="font-mono text-mono-xs text-text-3">You can change these later in Reference → Data.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="lg" onClick={() => setStep(2)}>← Back</Button>
                <Button variant="primary" size="lg" fullWidth onClick={handleComplete}>
                  Start Training →
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default OnboardingModal
