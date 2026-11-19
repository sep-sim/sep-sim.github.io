# MidstreamSim

A 2D training simulator for midstream pipeline I&E technicians. Each work order hides one fault on a 4-20 mA
pressure loop at a pump station. The technician does pre-work, finds the fault with a multimeter, HART communicator
and manifold, repairs it, proves the point is back in service on the HMI, and gets a scored debrief.

## Run

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

## What is simulated

- RTU cabinet: 24 VDC supply, fuse, terminal block, analog input card with 250 Ω load
- Shielded field cable to a Class I Div 2 junction box
- 2-wire HART pressure transmitter PT-101 with local display and test terminals
- Isolation valve, test port, impulse line and a pipeline gauge for ground truth
- SCADA HMI with live value, quality, alarms and trend

Tools: multimeter (V DC, mA DC in series, Ω on a dead loop), HART communicator (poll, loop test, set range),
hand pump, fuse pull, visual inspection of each enclosure.

Faults: open conductors, loose terminations, blown fuse, dead supply, transmitter failed high/low, range mismatch,
closed isolation, plugged impulse line, reversed polarity.

## Scoring

| Area | Points |
|---|---|
| Pre-work and safety (checklist done before the first field action) | 25 |
| Root cause diagnosis | 30 |
| Repair and verified return to service | 25 |
| Efficiency (measurements vs target, unnecessary repairs) | 20 |

Penalties for measuring resistance on a live loop, pumping against an open isolation valve, and working a live
SCADA point without notifying the controller.
