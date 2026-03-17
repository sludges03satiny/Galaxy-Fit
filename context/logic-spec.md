# Galaxy Fit — Skill Tree Logic Specification

*Companion document to `skills.json` v1.0.0*

---

## 1. Data Model Conventions

### Node Status Enum
Every skill node exists in exactly one of three states at any given time:

| Status | Display | Meaning |
|--------|---------|---------|
| `locked` | 🔒 Dim / grey | Prerequisites not yet met |
| `active` | ⚡ Pulsing | Prerequisites met, actively being trained |
| `unlocked` | ✅ Glowing | Unlock criteria met and logged |

Status is derived — never manually set by the user. It is computed at load time from the session log.

---

## 2. Unlock Gate Evaluation

A node becomes eligible to transition from `locked` → `active` when **all** of the following resolve `true`:

1. **Prerequisite nodes are `unlocked`** — every node ID in the node's `prerequisites` array must have status `unlocked`.
2. **Strength prerequisites are met** — each item in `strength_prerequisites` must be recorded as passed in the benchmark log or session log (see §3).

A node transitions from `active` → `unlocked` when **all** of the following resolve `true` simultaneously, evaluated after each session is saved:

1. **`consecutive_sessions` sessions logged** at this node without interruption.
   - "Logged at this node" = the session record includes at least one set of this skill.
   - "Without interruption" = a streak. If the athlete trains a different skill at this node level in between, the streak resets. However, missing a session entirely (rest day, Z day) does **not** break the streak — only logging a session where the skill was trained at a **lower** progression level breaks it.
2. **Criteria threshold met in every session of the streak**:
   - If `hold_seconds` is defined: every logged set must meet or exceed `hold_seconds`.
   - If `reps` is defined: every logged set must meet or exceed `reps`.
   - If both are defined (rare): both must be met.
3. **RPE ≤ 8** for at least the final session in the streak (indicates the performance is not a single max effort).

### Evaluation pseudocode

```typescript
function evaluateUnlockGate(nodeId: string, sessionLog: Session[]): NodeStatus {
  const node = getNode(nodeId);

  // Check prerequisites
  for (const prereqId of node.prerequisites) {
    if (getNodeStatus(prereqId) !== 'unlocked') return 'locked';
  }

  // Check strength prerequisites
  if (!strengthPrerequisitesMet(node, sessionLog)) return 'locked';

  // Node is at least eligible to be active
  // Now check if unlock criteria are met
  const recentSessions = getSessionsForNode(nodeId, sessionLog);
  const streak = getConsecutiveStreak(recentSessions, node.unlock_criteria);

  if (
    streak.length >= node.unlock_criteria.consecutive_sessions &&
    streak.every(s => criteriaMetInSession(s, node.unlock_criteria)) &&
    streak[streak.length - 1].rpe <= 8
  ) {
    return 'unlocked';
  }

  return 'active';
}
```

### Notes on time
- Consecutive sessions refer to **sessions where the skill was trained**, not calendar days.
- A Z day or rest day between two skill sessions does not break the streak.
- A deload week where skill work is omitted (Red readiness) does not break the streak.

---

## 3. Strength Prerequisite Checks

Strength prerequisites in `skills.json` are stored as human-readable strings (e.g., `"8 strict pull-ups"`). The app resolves these against two data sources:

### Source A: Benchmark Results
The Benchmarks hub runs every 4 weeks. Benchmark tests include max pull-ups, max push-ups, and estimated 1RM. Any strength prerequisite that maps to a benchmark test is resolved from the most recent benchmark result.

**Mapping table (examples):**

| `strength_prerequisites` string | Benchmark field |
|--------------------------------|-----------------|
| `"8 strict pull-ups"` | `benchmark.max_pull_ups >= 8` |
| `"5 dips"` | `benchmark.max_dips >= 5` |
| `"10 push-ups"` | `benchmark.max_push_ups >= 10` |
| `"12 strict pull-ups"` | `benchmark.max_pull_ups >= 12` |

### Source B: Session Logs
For prerequisites that are themselves skill nodes (e.g., `"5 chest-to-bar pull-ups"`, `"30s tuck L-sit"`), the app checks session history for the prerequisite node:
- The prerequisite node must be `active` or `unlocked`
- At least one session must show the required rep/hold count achieved

### Source C: Manual Override (Admin Debug Only)
In development/debug mode only, strength prerequisites can be manually confirmed. This path is never exposed to the end user — gates are enforced structurally.

---

## 4. Stall Detection

Stall detection fires when the athlete has logged **6 or more sessions** at a skill node in `active` status without triggering the unlock gate.

### Detection logic

```typescript
function isStalled(nodeId: string, sessionLog: Session[]): boolean {
  const node = getNode(nodeId);
  if (getNodeStatus(nodeId) !== 'active') return false;

  const sessionsAtNode = getSessionsForNode(nodeId, sessionLog);
  return sessionsAtNode.length >= 6;
}
```

### Stall protocol (presented to user in-app)

When stall is detected, the app surfaces a single suggestion card:

> **Stall detected on [Node Name]** — You've trained this skill 6+ sessions without advancing.
>
> **Suggested protocol:**
> 1. Drop one progression level (e.g., tuck → easier tuck variant)
> 2. Add one additional set (e.g., 4 sets → 5 sets)
> 3. Focus on quality: hold 1–2 seconds longer per rep
>
> The app will continue tracking your sessions at this level.

The stall counter resets when:
- The node unlocks (advance to next level)
- The athlete manually logs a session at the level below (regression is recorded, counter resets at new level)

The stall does **not** automatically demote the node or change the session generator output. The athlete must act on the suggestion.

---

## 5. Active Skill Selection → Session Generation

### Selection rules
- The athlete may select **one active skill per tree** at any time:
  - Pulling Tree (Front Lever, Back Lever, Muscle-Up, Human Flag)
  - Pushing Tree (Planche, L-sit, HSPU)
  - Balance Tree (Handstand)
  - Leg/Mobility Tree (Pistol Squat, Nordic Curl, Dragon Flag)
- Only nodes with status `active` or `unlocked` appear in the selection list
- Selecting a skill automatically populates the `skill_specific_accessories` array for that node into the session generator's accessory slot

### Session generator query

When a session is generated, the generator calls:

```typescript
function getSessionSkillBlock(dayType: 'A' | 'B' | 'C', readiness: 'green' | 'yellow' | 'red'): SkillBlock {
  const activeSkills = getActiveSelections(); // one per tree, filtered by day_type

  // Filter to skills that match this day's day_types
  const daySkills = activeSkills.filter(skill =>
    skill.session_placement.day_types.includes(dayType)
  );

  // Special rule: Front Lever chain ONLY on C days, placed first
  // Handstand on A and B days
  // L-sit on B days
  // Back Lever on B days

  const skillBlock: SkillBlock = {
    primarySkill: daySkills.find(s => s.session_placement.order === 'before_strength'),
    accessories: daySkills.flatMap(s => s.skill_specific_accessories).slice(0, 3),
    placement: 'before_strength'
  };

  // Autoregulation: Red readiness reduces skill to 1 set, no accessory
  if (readiness === 'red') {
    skillBlock.sets = 1;
    skillBlock.accessories = [];
  }

  return skillBlock;
}
```

### Placement rules (hardcoded, from context doc)

| Skill | Day | Position in session |
|-------|-----|---------------------|
| Front Lever chain | C only | Session start (before all strength) |
| Handstand | A, B | Before strength |
| L-sit | B | Before strength |
| Back Lever | B | Before strength |
| Dragon Flag | C | After strength (finisher/core slot) |
| Nordic Curl | A, C | After strength |

### Accessory slot injection

The `skill_specific_accessories` array from the active node is used to populate the accessory slot in the generated session. The session generator picks the first 1–3 items depending on time tier:

| Time tier | Accessory sets |
|-----------|---------------|
| 30 min | 1 accessory, 2 sets |
| 45 min | 1–2 accessories, 2–3 sets |
| 60 min | 2–3 accessories, 3 sets each |
| 90 min | Full accessory block |

Accessories from `skill_specific_accessories` are bodyweight/ring-based and tracked by RPE (not load). They do **not** feed into the double progression tracker.

---

## 6. Graph Integrity Rules

These invariants must hold at all times and should be enforced by a validation function run at app startup and after any data migration:

1. **No circular dependencies** — The prerequisite graph is a directed acyclic graph (DAG). No node can be its own ancestor.
2. **No orphaned prerequisites** — Every node ID referenced in a `prerequisites` array must exist in the `nodes` array.
3. **Root nodes have empty prerequisites** — Foundation nodes (dead-hang, hollow-body, support-hold, cossack-squat, nordic-curl-negative) must have `prerequisites: []`.
4. **progression_level increases with depth** — A node's `progression_level` must be ≥ the maximum `progression_level` of any of its direct prerequisites. (Warning only, not hard error, as some chains cross different difficulty axes.)

```typescript
function validateSkillGraph(nodes: SkillNode[]): ValidationResult {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const errors: string[] = [];

  // Orphan check
  for (const node of nodes) {
    for (const prereqId of node.prerequisites) {
      if (!nodeMap.has(prereqId)) {
        errors.push(`Orphaned prereq: ${node.id} → ${prereqId}`);
      }
    }
  }

  // Cycle check (DFS)
  const visited = new Set<string>();
  const recStack = new Set<string>();
  function dfs(id: string): boolean {
    visited.add(id); recStack.add(id);
    for (const prereq of nodeMap.get(id)!.prerequisites) {
      if (!visited.has(prereq) && dfs(prereq)) return true;
      if (recStack.has(prereq)) {
        errors.push(`Cycle: ${id} ↔ ${prereq}`);
        return true;
      }
    }
    recStack.delete(id);
    return false;
  }
  for (const node of nodes) {
    if (!visited.has(node.id)) dfs(node.id);
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 7. Session Logging Schema (per skill entry)

Each session log entry for a skill should capture:

```typescript
interface SkillLogEntry {
  nodeId: string;           // skill node ID
  sessionId: string;        // parent session ID
  date: string;             // ISO 8601
  sets: SkillSet[];
  notes?: string;
}

interface SkillSet {
  setNumber: number;
  hold_seconds?: number;    // for timed holds
  reps?: number;            // for rep-based skills
  rpe: number;              // 1–10
  completed: boolean;       // false if set was aborted early
}
```

The unlock gate evaluator reads from `SkillLogEntry[]` ordered by date to compute streaks and criteria thresholds.

---

## 8. Special Cases

### Deload weeks
During deload weeks (Block weeks 5 and 10), skill work continues but intensity is reduced:
- Hold targets drop by 20% (e.g., 10s → 8s)
- Sessions logged during deload weeks **count toward consecutive session streaks** but do **not** count toward unlock criteria (criteria are evaluated only against non-deload sessions).

### Post-time-off re-entry
- After 1 week off: skill training resumes at the same node. Session streak is preserved (gap days don't break streaks).
- After 2–3 weeks off: skill node drops one level automatically (e.g., from `adv-tuck-front-lever` → `tuck-front-lever`). The app logs this demotion and displays a note. The streak resets.

### Simultaneous tree progression
An athlete can pursue one skill per tree simultaneously. The session generator handles this by:
1. Assigning each active skill to its designated day type(s)
2. Never placing two skill blocks on the same day if they conflict in placement order
3. If two active skills both require `before_strength` on the same day, prioritize by `progression_level` (higher level first — fresher CNS)

---

*End of logic-spec.md — v1.0.0*
