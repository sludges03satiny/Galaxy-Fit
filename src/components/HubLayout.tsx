import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const HUBS = [
  { path: '/',           label: 'Dashboard',   icon: '◉', end: true  },
  { path: '/skills',     label: 'Skills',      icon: '✦', end: false },
  { path: '/calendar',   label: 'Calendar',    icon: '▦', end: false },
  { path: '/benchmarks', label: 'Benchmarks',  icon: '◎', end: false },
  { path: '/move',       label: 'Move',        icon: '↗', end: false },
  { path: '/reference',  label: 'Reference',   icon: '≡', end: false },
]

// Map path → display title
const HUB_TITLES: Record<string, string> = {
  '/':            'DASHBOARD',
  '/skills':      'SKILL TREE',
  '/calendar':    'CALENDAR',
  '/benchmarks':  'BENCHMARKS',
  '/move':        'MOVE',
  '/reference':   'REFERENCE',
}

export const HubLayout: React.FC = () => {
  const location = useLocation()
  const title = HUB_TITLES[location.pathname] ?? 'GALAXY FIT'

  return (
    <div className="min-h-screen bg-bg text-text font-body relative overflow-x-hidden">

      {/* Grain noise overlay — non-interactive */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[999]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-line h-[52px] flex items-center px-4 gap-0">
        {/* Brand */}
        <span className="font-heading text-[1.1rem] tracking-[0.12em] text-lime pr-4 border-r border-line flex-shrink-0">
          GALAXY FIT
        </span>
        {/* Current hub */}
        <span className="font-mono text-mono-xs uppercase tracking-widest text-text-3 px-4 flex-1 min-w-0 truncate">
          {title}
        </span>
      </header>

      {/* Page content */}
      <main
        key={location.pathname}
        className="pb-[80px] max-w-[700px] mx-auto px-4 pt-6 animate-fade-up"
      >
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-md border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex max-w-[700px] mx-auto">
          {HUBS.map(hub => (
            <NavLink
              key={hub.path}
              to={hub.path}
              end={hub.end}
              className={({ isActive }) => [
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-1',
                'transition-colors duration-150',
                'border-r border-line last:border-r-0',
                isActive
                  ? 'text-lime'
                  : 'text-text-3 hover:text-text-2',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`text-base leading-none transition-all duration-150 ${
                      isActive ? 'text-lime drop-shadow-[0_0_6px_rgba(200,240,80,0.6)]' : ''
                    }`}
                  >
                    {hub.icon}
                  </span>
                  <span
                    className="font-mono uppercase tracking-widest leading-none"
                    style={{ fontSize: '0.52rem' }}
                  >
                    {hub.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 w-6 h-px bg-lime opacity-80" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default HubLayout
