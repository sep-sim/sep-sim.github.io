# SEPSim — Skills Expansion Program simulator

Field-realistic training for I&E and electrical technicians in midstream pipeline operations. Each work order hides a
fault; the technician does the pre-work, dresses for the hazard, isolates, verifies, tests with the instruments the crew
actually carries, repairs, restores, and gets a scored debrief with every violation called out.

## Live

https://sep-sim.github.io/ — deployed from `main` by GitHub Actions on every push.

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Vite dev server with hot reload |
| `pnpm build` | Typecheck and production build to `dist/` |
| `pnpm test` | Engine tests (vitest) |
| `pnpm lint` | oxlint |

## Modules

### Electrical: VFD-101 ground fault

Toshiba VF-AS3 on a 100 HP pump trips EF2. Scenes are drawn as places: the MCC room, the open drive cabinet, the motor
on its pad and the inside of its six-lead terminal box.

- Arc flash label on the cabinet; PPE locker graded against its incident energy
- Two energy sources (480 V bucket, 120 V control circuit), lockout, tagout, try-step, DC bus discharge
- Fluke 789 for absence-of-voltage verification by contact, live-dead-live; Amprobe TIC 300 PRO reserved for systems over 1,000 V
- Lift the motor leads at the isolation contactor, then Megger S1-568: IR, IR(t), DAR, PI at 500 V
- Unbolt the feeder lugs and the T4-T5-T6 wye bar to localize a termination, cable or winding fault
- Three work orders, 100 points on the textbook path, penalties for the real mistakes

### Instrumentation: PT-101 loop troubleshooting

A 4-20 mA pressure loop at a pump station: RTU cabinet, junction box, HART transmitter, isolation manifold, SCADA HMI.
Tools are a Fluke 789 ProcessMeter and an AMS Trex. Eight work orders: opens, loose terminations, blown fuse,
transmitter failure, range mismatch, closed isolation, plugged impulse line, reversed polarity.

## Scoring

Each module has its own rubric in `score.ts`. Pre-work and hazard assessment, isolation and verification, testing and
diagnosis, repair and return to service, efficiency, minus penalties for safety violations.
