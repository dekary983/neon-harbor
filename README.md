# neon-harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/dekary983/neon-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/dekary983/neon-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Harbor** is an original open-world crime game set in Coral Bay, a fictional sun-soaked coastal city of neon marinas, palm-lined ocean drives and downtown towers. Roam on foot or steal any car, run a five-mission story for fixer Marco Vale, pick up taxi fares, hunt hidden packages, and shake the Coral Bay PD's wanted stars — or get busted trying. Pure static files: no build step, no network, just open `game/index.html` in a browser.

## Run it

```sh
node serve.ts   # then open http://localhost:8080 — or serve game/ with any static file server
```

## The game

You are **Rook**, newly arrived in Coral Bay — a 4000×3000 top-down city with a road grid, city blocks full of neon-signed buildings, palm trees, a marina with docks and boats, a sandy beach and the ocean along the east edge. A full day cycle runs while you play: golden afternoon light, a burnt-orange sunset, then night, when the neon signs glow and the streets go dark blue.

You can walk and sprint everywhere, punch pedestrians (they drop cash — and witnesses call it in), steal any parked or moving car (its driver jumps out and runs), and drive with real acceleration, steering, handbrake, damage and smoke. Around you the city lives: 24+ traffic cars follow the lane network and brake for each other, and 40+ pedestrians stroll the sidewalks and flee from trouble.

Crime is witnessed. Car theft, punching, collisions and running someone down raise your **wanted stars (0–5)**. Coral Bay PD responds with chase cars that try to box you in and officers on foot. Break line of sight and your heat decays star by star. Get pinned at low speed with an officer close and the **BUSTED** meter fills — you wake up at the police station, fined. Lose all your health and you're **WASTED** — you wake up at Coral Bay Hospital, $200 lighter.

## Story — working for Marco Vale

Fixer **Marco Vale** waits at the marina (the glowing **M** marker, also on your minimap). Walk up to him to start each job. Five missions, in order:

| # | Mission | What you do | Payout |
|---|---------|-------------|--------|
| 1 | **First Wheels** | Steal the marked coral-red sports car on Ocean Drive and deliver it to Marco's garage | $400 |
| 2 | **Package Run** | Pick up a package at the marina and deliver it across town against a 95-second timer | $650 |
| 3 | **Hot Property** | Take the hot car — you instantly get 3 stars — lose the heat to ≤1 star, then deliver it | $900 |
| 4 | **Collections** | Visit 3 debtors around the city and persuade each one up close (stand near them, press **F**) | $750 + $100 per debtor |
| 5 | **Harbor Run** | Hit 5 checkpoints across Coral Bay against the clock, ending at the garage | $2,000 |

Finishing Harbor Run shows the story-complete banner — free roam continues afterwards.

**Side activities, always available:**

- **Taxi fares** — steal or find the yellow cab; passenger markers (**P**) appear while you drive it. Pick up, drive to the drop-off (**D**), get paid by distance.
- **Hidden packages** — 20 glowing briefcases are hidden across Coral Bay. Each pays **+$250**; the HUD counter tracks them.

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrow keys | Move on foot · throttle / brake-reverse and steer in a car |
| Shift | Sprint on foot |
| E | Enter / exit a car (stand beside it) |
| F or left-click | Punch · persuade a debtor during Collections |
| Space | Handbrake in a car |
| Esc or P | Pause |
| M | Mute / unmute the synth audio |
| Enter / click | Advance dialog, confirm menus |

## HUD and menus

Cash, health bar, package counter and speed (in a car) are always visible, with wanted stars top-right and a BUSTED meter when the police close in. The **minimap** (bottom-left) shows the road grid, the ocean, police blips in blue, your white arrow, and the yellow mission marker. An objective banner at the top always tells you what to do next, Marco's dialog appears in a box at the bottom, and there are full screens for the title (with a drawn Coral Bay skyline, Start / Continue and the controls), pause, BUSTED, WASTED, mission complete and story complete.

**Saving:** progress auto-saves to `localStorage` (cash, story progress, packages found, position). The title screen offers **Continue (C)** when a save exists, or **N** for a new game.

## How it was built

Plain ES modules on a 2D canvas — no libraries, no build step, no network requests, no assets. Every sound is synthesised with WebAudio (engine hum, sirens, punches, cash, a mission-complete jingle and a bassline loop), and all art is drawn in code. One file, one job:

- `game/src/config.js` — tuning constants and the Coral Bay palette
- `game/src/rng.js` — seeded RNG (the city and screenshots are deterministic)
- `game/src/city.js` — city generation: roads, blocks, neon buildings, palms, marina, beach, lane network
- `game/src/audio.js` — the WebAudio synth
- `game/src/input.js` — keyboard and mouse state
- `game/src/vehicles.js` — car physics, traffic AI, parked cars, damage, stealing
- `game/src/people.js` — on-foot movement, punch combat, pedestrian AI
- `game/src/police.js` — wanted stars, heat decay, chase cars, officers, BUSTED meter
- `game/src/missions.js` — Marco's 5-mission chain, taxi fares, hidden packages
- `game/src/hud.js` — HUD, minimap, dialog, title and end screens
- `game/src/save.js` — localStorage save / continue
- `game/src/shots.js` — deterministic staged scenes behind `?shot=cover|chase|mission|night` for the screenshots
- `game/src/game.js` — boot, fixed-timestep loop, camera with speed lookahead, day cycle, rendering, state machine

Screenshots are real captures of the running game at 1280×720 via those staged scenes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=zq1pfqns&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
