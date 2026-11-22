// The wardens: patrol waypoints, get suspicious at a glimpse or a noise,
// walk over to look, raise the alarm on a clear sighting, chase, and —
// when the trail goes cold — give up and walk back to their route. A guard
// never knows where the player is, only where it last saw or heard them.
import { TILE, WORLD, GUARD, VISION } from './config.js';
import { angleDelta, clamp, dist } from './random.js';
import { tileCenter } from './world.js';

export const GUARD_STATE = {
  PATROL: 'PATROL',
  SUSPICIOUS: 'SUSPICIOUS',
  INVESTIGATE: 'INVESTIGATE',
  ALARM: 'ALARM',
  RETURN: 'RETURN',
};

export class Guard {
  constructor(def, world) {
    this.name = def.name;
    this.world = world;
    this.waypoints = def.waypoints.map(([col, row]) => tileCenter(col, row));
    this.wpIndex = 0;
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.wait = 0.6;
    this.suspicion = 0;
    this.lastSeen = null;
    this.investigateAt = null;
    this.heardAt = null;
    this.radius = GUARD.radius;
    this.stepPhase = Math.random() * Math.PI * 2;
    this.alertFlash = 0;
  }

  // One tick. `senses` is what the guard can currently perceive:
  // { canSee, seeStrength, playerX, playerY } — or null when it cannot.
  update(dt, senses, onHeard) {
    this.alertFlash = Math.max(0, this.alertFlash - dt);
    if (senses && senses.canSee) {
      this.suspicion = clamp(this.suspicion + senses.seeStrength * dt, 0, 1);
      this.lastSeen = { x: senses.playerX, y: senses.playerY, at: performance.now() };
      if (this.suspicion >= 1) {
        if (this.state !== GUARD_STATE.ALARM) this.alertFlash = 0.6;
        this.state = GUARD_STATE.ALARM;
      } else if (this.suspicion > 0.35 && this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.SUSPICIOUS;
      }
    } else {
      this.suspicion = clamp(this.suspicion - 0.25 * dt, 0, 1);
      if (this.state === GUARD_STATE.SUSPICIOUS && this.suspicion <= 0.05) {
        this.state = GUARD_STATE.PATROL;
      }
    }
    if (this.heardAt) {
      const target = this.heardAt;
      this.heardAt = null;
      if (this.state === GUARD_STATE.PATROL || this.state === GUARD_STATE.RETURN) {
        this.investigateAt = target;
        this.state = GUARD_STATE.INVESTIGATE;
      } else if (this.state === GUARD_STATE.SUSPICIOUS) {
        this.investigateAt = target;
      }
      if (onHeard) onHeard(this, target);
    }

    switch (this.state) {
      case GUARD_STATE.PATROL:
        this.patrol(dt);
        break;
      case GUARD_STATE.SUSPICIOUS:
        // Stand, look toward the glimpse, then go and check it.
        this.wait -= dt;
        if (this.wait <= 0) {
          this.investigateAt = this.lastSeen ? { x: this.lastSeen.x, y: this.lastSeen.y } : this.nearestWaypoint();
          this.state = GUARD_STATE.INVESTIGATE;
        }
        break;
      case GUARD_STATE.INVESTIGATE:
        if (this.investigateAt && this.walkTo(this.investigateAt, GUARD.investigate, dt)) {
          this.wait = 1.4;
          this.state = GUARD_STATE.RETURN;
          this.investigateAt = null;
        }
        break;
      case GUARD_STATE.ALARM:
        if (this.lastSeen) {
          const reached = this.walkTo(this.lastSeen, GUARD.chase, dt);
          if (reached) {
            // Lost them at the last seen spot: look around, then cool off.
            this.wait -= dt;
            if (this.wait <= 0) {
              this.suspicion = 0.4;
              this.state = GUARD_STATE.RETURN;
              this.wait = 0;
            }
          } else {
            this.wait = 1.2;
          }
        } else {
          this.state = GUARD_STATE.RETURN;
        }
        break;
      case GUARD_STATE.RETURN: {
        const target = this.nearestWaypoint();
        if (this.wait > 0) {
          this.wait -= dt;
          this.lookAround(dt);
        } else if (this.walkTo(target, GUARD.patrol, dt)) {
          this.wpIndex = this.nearestWaypointIndex();
          this.state = GUARD_STATE.PATROL;
          this.wait = 0.5;
        }
        break;
      }
      default:
        break;
    }
    this.stepPhase += dt * 6;
  }

  patrol(dt) {
    if (this.wait > 0) {
      this.wait -= dt;
      this.lookAround(dt);
      return;
    }
    const target = this.waypoints[this.wpIndex];
    if (this.walkTo(target, GUARD.patrol, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.wait = 1.1;
    }
  }

  lookAround(dt) {
    this.facing += Math.sin(performance.now() / 900 + this.stepPhase) * dt * 0.8;
  }

  nearestWaypoint() {
    let best = this.waypoints[0];
    let bestD = Infinity;
    for (const wp of this.waypoints) {
      const d = dist(this.x, this.y, wp.x, wp.y);
      if (d < bestD) {
        bestD = d;
        best = wp;
      }
    }
    return best;
  }

  nearestWaypointIndex() {
    let best = 0;
    let bestD = Infinity;
    this.waypoints.forEach((wp, i) => {
      const d = dist(this.x, this.y, wp.x, wp.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  // Walk toward a point at speed tiles/sec; returns true when arrived.
  walkTo(target, speedTiles, dt) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = speedTiles * TILE * dt;
    if (d <= step + 1) {
      this.x = target.x;
      this.y = target.y;
      return true;
    }
    const nx = dx / d;
    const ny = dy / d;
    this.facing = Math.atan2(ny, nx);
    this.world.moveCircle(this, nx * step, ny * step);
    return false;
  }

  hear(point, radiusTiles) {
    if (dist(this.x, this.y, point.x, point.y) <= radiusTiles * TILE) {
      this.heardAt = { x: point.x, y: point.y };
      return true;
    }
    return false;
  }

  // Vision cone test against a point, given how lit / hidden it is.
  canSeePoint(px, py, light, hidden) {
    const d = dist(this.x, this.y, px, py);
    const range = hidden ? VISION.rangeGrass : light > 0.25 ? VISION.rangeLit : VISION.rangeShadow;
    if (d > range * TILE) return { seen: false, strength: 0 };
    const ang = Math.atan2(py - this.y, px - this.x);
    if (Math.abs(angleDelta(this.facing, ang)) > VISION.halfAngle) return { seen: false, strength: 0 };
    if (!this.world.hasLineOfSight(this.x, this.y, px, py)) return { seen: false, strength: 0 };
    const closeness = 1 - d / (range * TILE);
    return { seen: true, strength: 0.35 + closeness * 0.85 };
  }
}

// A fixed camera: a slow blue cone that sweeps back and forth. Being seen
// by one fills suspicion fast and pings the nearest warden to investigate.
export class Camera {
  constructor(def, world) {
    this.world = world;
    const at = tileCenter(def.x, def.y);
    this.x = at.x;
    this.y = at.y;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.phase = 0;
    this.facing = (def.sweep[0] + def.sweep[1]) / 2;
    this.radius = 10;
  }

  update(dt) {
    this.phase += dt * this.speed;
    const mid = (this.sweep[0] + this.sweep[1]) / 2;
    const amp = (this.sweep[1] - this.sweep[0]) / 2;
    this.facing = mid + Math.sin(this.phase) * amp;
  }

  canSeePoint(px, py, light, hidden) {
    const d = dist(this.x, this.y, px, py);
    const range = hidden ? VISION.rangeGrass : 5.4 * TILE;
    if (d > range) return { seen: false, strength: 0 };
    const ang = Math.atan2(py - this.y, px - this.x);
    if (Math.abs(angleDelta(this.facing, ang)) > 0.55) return { seen: false, strength: 0 };
    if (!this.world.hasLineOfSight(this.x, this.y, px, py)) return { seen: false, strength: 0 };
    return { seen: true, strength: 1.6 };
  }
}
