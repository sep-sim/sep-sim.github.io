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

### Electrical: 4160 V VFD #2 ground fault on P-310

A Toshiba JK-series medium voltage controller (power isolation switch, VFD, bypass, output isolation contactor) on a
4000 HP, 4160 V pump motor, with an Allen-Bradley CENTERLINE 2100 480 V MCC feeding the drive auxiliaries and 120 V
control from a panelboard. The Multilin trips on 50G ground fault. Scenes are drawn as places: the electrical room, the
M12 motor connection compartment, the motor on its pad and the inside of its six-lead terminal box.

- Arc flash label on the controller; the technician dresses a worker figure and confirms the kit against it before any lockout step
- Four energy sources (4160 V incoming, 4160 V bypass, 480 V aux bucket, 120 V control), lockout, tagout, try-step, cell discharge
- Amprobe TIC 300 PRO on HIGH range for the 4160 V conductors, proved on a live feeder window; Fluke 789 by contact for 480 V and 120 V
- Lift the motor leads in the connection compartment, then Megger S1-568: IR, IR(t), DAR, PI at 2.5 kV
- Unbolt the feeder lugs and the T4-T5-T6 wye bar to localize a termination, cable or winding fault
- Three work orders, 100 points on the textbook path, penalties for the real mistakes

### Instrumentation: PT-101 loop troubleshooting

A 4-20 mA pressure loop at a pump station: RTU cabinet, junction box, HART transmitter, isolation manifold, SCADA HMI.
Tools are a Fluke 789 ProcessMeter and an AMS Trex. Eight work orders: opens, loose terminations, blown fuse,
transmitter failure, range mismatch, closed isolation, plugged impulse line, reversed polarity.

## Scoring

Each module has its own rubric in `score.ts`. Pre-work and hazard assessment, isolation and verification, testing and
diagnosis, repair and return to service, efficiency, minus penalties for safety violations.
