# GLOAM — a lamplight heist

[![bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/competitions/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Menma1993/best-stealth-game-20261121-1759-entry/rank.svg)](https://make.fun/competitions/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Menma1993/best-stealth-game-20261121-1759-entry/reward.svg)](https://make.fun/competitions/best-stealth-game-20261121-1759)

A top-down 2D stealth heist in lamplight. You are the thief: slip through
four houses after dark, steal the loot, and reach the green exit hatch
without ever being seen.

## The rule of the game

**Lamplight is danger. Shadow is safety.**

- A warden's amber vision cone reaches far through lamplight, barely
  through shadow, and almost not at all into tall grass.
- Walk and your footsteps are heard; sneak and you are slow but silent.
  Creaky boards betray you either way.
- Throw a pebble (click) to pull a warden away from your path. A smoke
  pellet (F) hides you for a few seconds. Douse a lamp (G) and the room
  goes dark — but a dark house is a suspicious house.
- Get spotted and the alarm climbs; break line of sight and it cools.
  Three strikes and the night is over.

## The four jobs

1. **The Chandler's Cellar** — steal the Tallow Crown. Two wardens.
2. **The Cartographer's Attic** — steal the Star Atlas. Three wardens.
3. **The Brassworks** — steal the Gilded Cog past the cameras.
4. **The Winter Masquerade** — steal the Frost Opal at the gala. Four
   wardens, two cameras.

Every job has an optional relic, a par time, and three medals: **GHOST**
(never spotted), **CLEAN SWEEP** (every valuable + the relic), and
**UNDER PAR**. The end screen shows your route replayed on the map, your
stats, and your medals.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (slow, silent) |
| Click | Throw a pebble — wardens go to look |
| F | Smoke pellet |
| G | Douse the nearest lamp |
| R | Restart the job |
| M | Mute |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/index.html` and its ES modules
are plain static files. Screenshots are staged frames of the game's own
code (`?shot=cover|alarm|steal|ghost`).

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library.
