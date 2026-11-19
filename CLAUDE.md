# SEPSim (Skills Expansion Program)

2D browser-based training simulator for midstream pipeline I&E (instrumentation and electrical) technicians.
A technician gets a work order, troubleshoots a hidden fault on a 4-20 mA loop with realistic tools, repairs it,
and is scored on safety, diagnosis, repair and efficiency.

## Stack

- Vite 8 + React 19 + TypeScript 7 (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax` → use `import type`, no enums)
- No backend, no state library. One `useReducer` per session.
- Tests: vitest (`pnpm test`). Lint: oxlint (`pnpm lint`). Build: `pnpm build` (runs `tsc -b` first).
- Dev server: `pnpm dev` on port 5173 (`.claude/launch.json` entry `dev`).

## Layout

```
src/engine/types.ts     domain types, node ids, diagnosis/repair/checklist catalogs
src/engine/loop.ts      electrical + process model: solveLoop(), resistanceBetween(), hmiReading(), loopInService()
src/engine/session.ts   reducer: every technician action (probe, inspect, HART, valve, pump, repair, diagnose, finish)
src/engine/score.ts     scoring rubric (pre-work 25, diagnosis 30, repair+verify 25, efficiency 20, penalties)
src/engine/engine.test.ts
src/scenarios/index.ts  scenario catalog (8 work orders on loop PT-101)
src/components/         SiteDiagram (SVG), Toolbox (tabs), WorkLog, Results
src/App.tsx             menu → Sim → Results
```

## Loop model

Series chain, `SERIES_ORDER` in loop.ts: PS+ → F1 → TB-1/1 → JB-1/1 → PT-101(+) → PT-101(−) → JB-1/2 → TB-1/2 → AI+ → 250 Ω → AI− → PS−.
Segment k joins node k and k+1. Faults open specific segments; with any open the current is 0, nodes upstream of the
first open sit at supply, downstream at 0. Reversed polarity is a special case (transmitter blocks, XMTR+ reads −24 V).
Transmitter demand: HART loop test > sensor failure (21.6 / 3.6 mA) > 4 + 16·(P − LRV)/(URV − LRV), clamped 3.8–20.5.
Pressure seen by the transmitter: pump pressure if isolation closed, trapped pressure if isolation closed or impulse plugged,
otherwise live process pressure (`processPressure()`: base + sinusoid + deterministic noise on `t`).

## Adding a scenario

Add an entry to `SCENARIOS` in `src/scenarios/index.ts`. Faults are `FaultKind`s; initial state covers isolation
valve position, trapped pressure and the device's own LRV/URV (range mismatch is initial state, not a fault).
`answer.diagnosis` must be a `DiagnosisId`; `answer.repairs` lists repairs that must be applied. The loop must satisfy
`loopInService()` once solved, and the test in `engine.test.ts` that walks every scenario to 100 points needs a
solution path added to its `solutions` map.

## Conventions

- Keep the engine pure and UI-free; all randomness for readings lives in `session.ts` formatting helpers.
- Any new technician action goes through the reducer and writes a log line. Field actions call `fieldAction()` so
  pre-work can be scored.
- Realism over gamification: readings, failure modes and procedures should match what a tech would see in the field.

## Electrical module (`src/electrical/`)

Second scenario family: VFD-101 (Toshiba VF-AS3, 100 HP) ground fault on pump P-101. Separate engine, same app.

```
src/electrical/types.ts      points, scenes, PPE catalog, arc label, diagnosis/repair/checklist catalogs, ElecState
src/electrical/engine.ts     reducer + physics: busVolts() decay, voltageBetween(), ppeCheck(), insulationTest(), absorption(), PENALTY table
src/electrical/score.ts      rubric: hazard/PPE 20, LOTO+verification 35, testing+diagnosis 25, restoration 10, efficiency 10, penalties
src/electrical/scenarios.ts  3 work orders: termination fault, winding fault, cable fault
src/electrical/ui/           ElecSim (layout), MccScene / DriveScene / MotorScene (SVG "in the field" views),
                             Fluke87V (DMM), MeggerS1 (S1-568: IR, IR(t), DAR, PI with absorption model), Panels, ArcLabel modal
```

Model notes worth knowing before touching it:
- Two energy sources: MCC-3 3B (480 V) and LP-2 ckt 7 (120 V control). The output isolation contactor 1M is held in by
  control power, so megging motor leads still landed on 1M with LP-2 live puts test voltage into the drive (`meg_into_drive`).
- DC bus: 648 V while closed, decays with τ = 180 s after opening; CHARGE lamp > 50 V. V AC on the bus reads ~2 V (trap).
- Insulation model is a node graph: cable1-3 and motor1-3, joined by bolted feeder lugs and the T4-T5-T6 wye bar.
  Resistance to ground of a group = parallel of its members. Phase to phase inside one group = 0.00 MΩ (continuity).
  Opening the wye bar is what localizes a winding fault.
- Violations are recorded once each with a count; `requireHandsOn()` is the gate for any hands-on action.
- `done` flags record history for scoring after restoration (locks removed, breaker closed again).
