// GLOAM — a lamplight heist: tuning constants and the four jobs.
// One file, one task: everything another module needs to know about the
// shape of the game, so no magic numbers leak into the game logic.
export const TILE = 40;
export const WORLD = { x: 0, y: 80, w: 880, h: 640 };
export const PANEL = { x: 880, y: 0, w: 400, h: 720 };
export const CANVAS = { w: 1280, h: 720 };

// Player speeds in tiles per second.
export const PLAYER = { walk: 3.1, sneak: 1.8, radius: 13 };
// Guard speeds in tiles per second.
export const GUARD = { patrol: 1.55, investigate: 2.15, chase: 2.85, radius: 14 };
// Vision cone: half-angle in radians, base range in tiles.
export const VISION = { halfAngle: 0.66, rangeLit: 6.6, rangeShadow: 3.6, rangeGrass: 1.6 };
// Detection: visibility fills 0..1; rates per second at point blank.
export const DETECT = { fillLit: 1.15, fillShadow: 0.55, sneakFactor: 0.55, decay: 0.5 };
// Alarm meter 0..1; noise and near misses feed it, calm drains it.
export const ALARM = { noiseBump: 0.22, nearMissBump: 0.16, decay: 0.05, huntAt: 0.6 };
// Footstep noise: walking is heard within this many tiles, sneaking within fewer.
export const NOISE = { walk: 3.4, sneak: 1.2, creaky: 5.0, pebble: 6.0 };
// Gadgets per job.
export const GADGETS = { pebbles: 3, smoke: 1, douse: 2 };
export const STRIKES_MAX = 3;
export const SMOKE_SECONDS = 3.0;

export const COLORS = {
  floorA: '#1b2436',
  floorB: '#182031',
  floorLine: '#232e45',
  wall: '#0d1220',
  wallTop: '#2c3a58',
  lamp: '#f5b942',
  lampGlow: 'rgba(245,185,66,0.55)',
  coneCalm: 'rgba(245,185,66,0.20)',
  coneEdge: 'rgba(245,185,66,0.45)',
  coneAlarm: 'rgba(224,62,54,0.30)',
  coneAlarmEdge: 'rgba(224,62,54,0.60)',
  coneCamera: 'rgba(84,164,255,0.22)',
  grass: '#2f6b3a',
  grassDark: '#245430',
  crate: '#6b4a2b',
  crateDark: '#4d3319',
  loot: '#ffd75e',
  relic: '#b78cff',
  exit: '#3ddc78',
  exitLocked: '#5a6b7a',
  player: '#e8e4d8',
  playerCloak: '#3d4a6b',
  guard: '#c94f43',
  guardCoat: '#7a2e28',
  text: '#e8e4d8',
  textDim: '#9aa7c2',
  gold: '#f5b942',
  red: '#e03e36',
  green: '#3ddc78',
  panelBg: '#101827',
  panelLine: '#24334d',
};

// Map legend:
// '#' wall, '.' floor, 'C' crate (cover, blocks sight + movement),
// 'g' tall grass (hide), 'L' lamp, 'b' creaky boards (noisy floor),
// 'V' valuable, 'R' relic (optional), 'E' exit hatch, 'P' player start.
// Two interior walls (columns 6 and 13) split every job into three rooms;
// each wall has door gaps (rows where the wall is open floor). Guard
// waypoints are room-local loops — a guard never has to walk through a
// wall to reach its next waypoint, so straight-line patrol never stalls.
export const JOBS = [
  {
    id: 1,
    name: "The Chandler's Cellar",
    objective: 'Steal the Tallow Crown, then reach the green exit.',
    lootName: 'Tallow Crown',
    relicName: 'Beeswax Seal',
    parSeconds: 75,
    guards: [
      { name: 'MIRA', waypoints: [[2, 2], [2, 12], [5, 12], [5, 2]] },
      { name: 'BRAM', waypoints: [[16, 3], [16, 12], [19, 12], [19, 3]] },
    ],
    map: [
      '######################',
      '#P....#......#.......#',
      '#..L..#..V...#...C...#',
      '#.....#..............#',
      '#.C...#......#.L.....#',
      '#....................#',
      '#..g..#......#...V...#',
      '#.....#..C...#.......#',
      '#.C...#......#...g...#',
      '#............#.......#',
      '#..L..#..g...#..R....#',
      '#....................#',
      '#..g..#..C...#...L...#',
      '#.....#......#.......#',
      '#.C...#......#....E..#',
      '######################',
    ],
  },
  {
    id: 2,
    name: "The Cartographer's Attic",
    objective: 'Steal the Star Atlas from the ferns, then slip out unseen.',
    lootName: 'Star Atlas',
    relicName: 'Brass Compass',
    parSeconds: 90,
    guards: [
      { name: 'MIRA', waypoints: [[2, 2], [2, 12], [5, 12], [5, 2]] },
      { name: 'SABLE', waypoints: [[16, 3], [16, 12], [19, 12], [19, 3]] },
      { name: 'BRAM', waypoints: [[9, 5], [9, 9], [12, 9], [12, 5]] },
    ],
    map: [
      '######################',
      '#P..g.#......#...L...#',
      '#....g#..V...#.......#',
      '#.C...#......#.C.....#',
      '#....................#',
      '#..L..#..g...#...g...#',
      '#.g...#..............#',
      '#.....#..C...#.V.....#',
      '#..C..#..g...#...C...#',
      '#.....#......#.g.....#',
      '#....................#',
      '#.g...#......#....R..#',
      '#..L..#..C...........#',
      '#.C...#.g....#..C....#',
      '#.....#......#....E..#',
      '######################',
    ],
  },
  {
    id: 3,
    name: 'The Brassworks',
    objective: 'Steal the Gilded Cog past the cameras, then reach the exit.',
    lootName: 'Gilded Cog',
    relicName: 'Copper Astrolabe',
    parSeconds: 105,
    guards: [
      { name: 'MIRA', waypoints: [[2, 2], [2, 12], [5, 12], [5, 2]] },
      { name: 'CORVIN', waypoints: [[8, 2], [8, 6], [12, 6], [12, 2]] },
      { name: 'SABLE', waypoints: [[16, 3], [16, 12], [19, 12], [19, 3]] },
    ],
    cameras: [
      { x: 10, y: 4, sweep: [-0.9, 0.9], speed: 0.5 },
      { x: 16, y: 11, sweep: [2.2, 4.0], speed: 0.45 },
    ],
    map: [
      '######################',
      '#P....#......#...L...#',
      '#.b...#..V...#.C.....#',
      '#..L..#..............#',
      '#.C...#..b...#...g...#',
      '#....................#',
      '#..g..#..C...#.V.....#',
      '#.b...#......#.......#',
      '#.....#..L...#...C...#',
      '#............#.......#',
      '#.g...#..b...#..R....#',
      '#....................#',
      '#.....#..C...#.......#',
      '#.C...#......#..g....#',
      '#..b..#..V...#....E..#',
      '######################',
    ],
  },
  {
    id: 4,
    name: 'The Winter Masquerade',
    objective: 'Steal the Frost Opal at the gala, then vanish unseen.',
    lootName: 'Frost Opal',
    relicName: 'Silver Mask',
    parSeconds: 120,
    guards: [
      { name: 'MIRA', waypoints: [[2, 2], [2, 6], [5, 6], [5, 2]] },
      { name: 'CORVIN', waypoints: [[16, 2], [16, 6], [19, 6], [19, 2]] },
      { name: 'SABLE', waypoints: [[2, 10], [2, 13], [5, 13], [5, 10]] },
      { name: 'BRAM', waypoints: [[16, 10], [16, 13], [19, 13], [19, 10]] },
    ],
    cameras: [
      { x: 9, y: 5, sweep: [-0.7, 0.7], speed: 0.55 },
      { x: 12, y: 11, sweep: [2.4, 3.9], speed: 0.5 },
    ],
    map: [
      '######################',
      '#P..L.#......#...L...#',
      '#.....#..V...#.C.....#',
      '#.C...#......#.......#',
      '#..g..#..............#',
      '#....................#',
      '#.L...#..C...#.V.....#',
      '#.....#......#.......#',
      '#..C..#..g...#...C...#',
      '#.g...#......#.g.....#',
      '#..L..#..C...#..R....#',
      '#....................#',
      '#.C...#..L...#...L...#',
      '#..g..#......#.......#',
      '#.L...#..V...#....E..#',
      '######################',
    ],
  },
];
