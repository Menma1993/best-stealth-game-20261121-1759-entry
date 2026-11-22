// The level itself: parse a job's ASCII map into walls, crates, grass,
// lamps, loot, the exit and the player start, and answer the questions the
// rest of the game keeps asking — is this tile solid, does this line of
// sight cross a wall, is this point lit, is this point hidden.
import { TILE, WORLD } from './config.js';

export const KIND = {
  WALL: 'wall',
  CRATE: 'crate',
  GRASS: 'grass',
  LAMP: 'lamp',
  CREAKY: 'creaky',
  LOOT: 'loot',
  RELIC: 'relic',
  EXIT: 'exit',
};

export function tileCenter(col, row) {
  return { x: WORLD.x + (col + 0.5) * TILE, y: WORLD.y + (row + 0.5) * TILE };
}

export function toTile(x, y) {
  return {
    col: Math.floor((x - WORLD.x) / TILE),
    row: Math.floor((y - WORLD.y) / TILE),
  };
}

export class World {
  constructor(job) {
    this.job = job;
    this.cols = job.map[0].length;
    this.rows = job.map.length;
    this.walls = new Set();
    this.crates = new Set();
    this.grass = new Set();
    this.creaky = new Set();
    this.lamps = [];
    this.loot = [];
    this.relic = null;
    this.exit = null;
    this.playerStart = null;
    this.guardSpawns = [];
    this.cameraSpawns = [];
    this.key = (col, row) => row * this.cols + col;
    this.parse(job.map);
    // Precompute a few speckles so the floor never looks flat.
    this.speckles = [];
    let seed = 1234567 + job.id * 7919;
    for (let i = 0; i < 260; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const col = seed % this.cols;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const row = seed % this.rows;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      this.speckles.push({ col, row, dx: (seed % 30) + 5, dy: (seed % 30) + 5, s: 2 + (seed % 3) });
    }
  }

  parse(map) {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const ch = map[row][col];
        const at = tileCenter(col, row);
        if (ch === '#') this.walls.add(this.key(col, row));
        else if (ch === 'C') this.crates.add(this.key(col, row));
        else if (ch === 'g') this.grass.add(this.key(col, row));
        else if (ch === 'b') this.creaky.add(this.key(col, row));
        else if (ch === 'L') this.lamps.push({ ...at, col, row, doused: false, flicker: (col * 7 + row * 13) % 10 });
        else if (ch === 'V') this.loot.push({ ...at, col, row, taken: false, kind: KIND.LOOT });
        else if (ch === 'R') this.relic = { ...at, col, row, taken: false, kind: KIND.RELIC };
        else if (ch === 'E') this.exit = { ...at, col, row, open: false };
        else if (ch === 'P') this.playerStart = { ...at, col, row };
        else if (ch >= '1' && ch <= '5') this.guardSpawns.push({ ...at, col, row, index: ch.charCodeAt(0) - 49 });
        else if (ch === 'K') this.cameraSpawns.push({ ...at, col, row });
      }
    }
  }

  inBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  isWall(col, row) {
    return !this.inBounds(col, row) || this.walls.has(this.key(col, row));
  }

  isCrate(col, row) {
    return this.crates.has(this.key(col, row));
  }

  // Solid for movement: walls and crates.
  isSolid(col, row) {
    return this.isWall(col, row) || this.isCrate(col, row);
  }

  // Solid for sight: walls and crates block a vision cone.
  blocksSight(col, row) {
    return this.isSolid(col, row);
  }

  isGrass(col, row) {
    return this.grass.has(this.key(col, row));
  }

  isCreaky(col, row) {
    return this.creaky.has(this.key(col, row));
  }

  // Bresenham over tiles: true when nothing blocks sight between two points.
  hasLineOfSight(ax, ay, bx, by) {
    const a = toTile(ax, ay);
    const b = toTile(bx, by);
    let x0 = a.col;
    let y0 = a.row;
    const x1 = b.col;
    const y1 = b.row;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      if (!(x0 === a.col && y0 === a.row) && !(x0 === b.col && y0 === b.row) && this.blocksSight(x0, y0)) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // How lit is a point, 0 (dark) to 1 (under a lamp)? Doused lamps give nothing.
  lightAt(x, y) {
    let best = 0;
    for (const lamp of this.lamps) {
      if (lamp.doused) continue;
      const d = Math.hypot(x - lamp.x, y - lamp.y);
      const r = 3.4 * TILE;
      if (d < r) {
        const fall = 1 - d / r;
        if (!this.hasLineOfSight(lamp.x, lamp.y, x, y)) continue;
        best = Math.max(best, fall * fall);
      }
    }
    return best;
  }

  isHidden(x, y) {
    const t = toTile(x, y);
    return this.isGrass(t.col, t.row);
  }

  // Circle vs solid tiles: slide along walls instead of sticking.
  moveCircle(body, dx, dy) {
    const r = body.radius;
    const nx = body.x + dx;
    if (!this.circleHitsSolid(nx, body.y, r)) body.x = nx;
    const ny = body.y + dy;
    if (!this.circleHitsSolid(body.x, ny, r)) body.y = ny;
    body.x = Math.min(WORLD.x + WORLD.w - r, Math.max(WORLD.x + r, body.x));
    body.y = Math.min(WORLD.y + WORLD.h - r, Math.max(WORLD.y + r, body.y));
  }

  circleHitsSolid(x, y, r) {
    const c0 = Math.floor((x - r - WORLD.x) / TILE);
    const c1 = Math.floor((x + r - WORLD.x) / TILE);
    const r0 = Math.floor((y - r - WORLD.y) / TILE);
    const r1 = Math.floor((y + r - WORLD.y) / TILE);
    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        if (!this.isSolid(col, row)) continue;
        const bx = WORLD.x + col * TILE;
        const by = WORLD.y + row * TILE;
        const cx = Math.min(bx + TILE, Math.max(bx, x));
        const cy = Math.min(by + TILE, Math.max(by, y));
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
      }
    }
    return false;
  }

  lootRemaining() {
    return this.loot.filter((item) => !item.taken).length + (this.relic && !this.relic.taken ? 0 : 0);
  }

  valuablesTotal() {
    return this.loot.length;
  }

  valuablesTaken() {
    return this.loot.filter((item) => item.taken).length;
  }

  allValuablesTaken() {
    return this.loot.every((item) => item.taken);
  }
}
