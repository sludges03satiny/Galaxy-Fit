import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { HubLayout } from './components/HubLayout'
import { Dashboard } from './hubs/dashboard/Dashboard'
import { SkillTree } from './hubs/skilltree/SkillTree'
import { Calendar } from './hubs/calendar/Calendar'
import { Benchmarks } from './hubs/benchmarks/Benchmarks'
import { Move } from './hubs/move/Move'
import { Reference } from './hubs/reference/Reference'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<HubLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="skills" element={<SkillTree />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="benchmarks" element={<Benchmarks />} />
          <Route path="move" element={<Move />} />
          <Route path="reference" element={<Reference />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
