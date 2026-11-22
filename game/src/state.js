// The run itself: one Game holds the job, the player, the wardens, the
// meters, the gadgets, the route the thief took and the screens around it
// (title / job board, play, caught, complete, failed). The loop in main.js
// only calls step() and render; everything a tick means lives here.
import { TILE, WORLD, JOBS, GADGETS, NOISE, STRIKES_MAX, SMOKE_SECONDS } from './config.js';
import { World, tileCenter } from './world.js';
import { Guard, Camera, GUARD_STATE } from './guards.js';
import { Vision } from './vision.js';
import { Detection } from './detection.js';
import { clamp, dist } from './random.js';

export const SCREEN = {
  TITLE: 'title',
  PLAY: 'play',
  CAUGHT: 'caught',
  COMPLETE: 'complete',
  FAILED: 'failed',
};

const SMOKE_LIFE = 3.0;

export class Game {
  constructor() {
    this.jobs = JOBS;
    this.medals = this.loadMedals();
    this.unlocked = this.loadUnlocked();
    this.screen = SCREEN.TITLE;
    this.job = JOBS[0];
    this.render = null;
    this.hud = null;
    this.audio = null;
    this.callouts = [];
    this.banner = null;
    this.bannerUntil = 0;
    this.endStats = null;
    this.caughtUntil = 0;
    this.startJob(1, true);
    this.screen = SCREEN.TITLE;
  }

  loadMedals() {
    try {
      return JSON.parse(window.localStorage.getItem('gloam-medals') || '{}');
    } catch {
      return {};
    }
  }

  loadUnlocked() {
    try {
      return Number(window.localStorage.getItem('gloam-unlocked') || 0);
    } catch {
      return 0;
    }
  }

  saveProgress() {
    try {
      window.localStorage.setItem('gloam-medals', JSON.stringify(this.medals));
      window.localStorage.setItem('gloam-unlocked', String(this.unlocked));
    } catch {
      // Private mode or headless: progress just lives for this session.
    }
  }

  startJob(id, quiet) {
    this.job = JOBS[id - 1];
    this.world = new World(this.job);
    this.guards = this.job.guards.map((def) => new Guard(def, this.world));
    this.cameras = (this.job.cameras || []).map((def) => new Camera(def, this.world));
    this.detection = new Detection();
    this.vision = new Vision(this.world);
    this.player = {
      x: this.world.playerStart.x,
      y: this.world.playerStart.y,
      facing: 0,
      sneaking: false,
      radius: 13,
    };
    this.gadgets = { pebbles: GADGETS.pebbles, smoke: GADGETS.smoke, douse: GADGETS.douse };
    this.pebbles = [];
    this.smokes = [];
    this.footsteps = [];
    this.route = [{ x: this.player.x, y: this.player.y }];
    this.routeTimer = 0;
    this.elapsed = 0;
    this.stepTimer = 0;
    this.pebblesUsed = 0;
    this.callouts = [];
    this.banner = null;
    this.endStats = null;
    this.screen = SCREEN.PLAY;
    this.staging = false;
    if (!quiet) this.introCallouts();
  }

  introCallouts() {
    // One teaching callout per job, at the nearest lamp to the start.
    const lamp = this.world.lamps[0];
    if (lamp) {
      this.addCallout({
        x: lamp.x,
        y: lamp.y,
        tx: lamp.x + 30,
        ty: lamp.y - 84,
        text: 'LAMPLIGHT: seen from across the room',
        until: this.elapsed + 9,
      });
    }
    const grass = [...this.world.grass][0];
    if (grass !== undefined) {
      const col = grass % this.world.cols;
      const row = Math.floor(grass / this.world.cols);
      const at = tileCenter(col, row);
      this.addCallout({
        x: at.x,
        y: at.y,
        tx: at.x - 40,
        ty: at.y + 70,
        text: 'TALL GRASS: hidden here',
        until: this.elapsed + 9,
      });
    }
  }

  addCallout(c) {
    this.callouts.push(c);
  }

  showBanner(title, sub, color) {
    this.banner = { title, sub: sub || '', color: color || '#e8e4d8' };
    this.bannerUntil = this.elapsed + 2.4;
  }

  timerText() {
    const s = Math.floor(this.elapsed);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  visibilityWord() {
    const p = this.player;
    if (this.world.isHidden(p.x, p.y)) return 'HIDDEN';
    if (this.detection.visibility > 0.35) return 'SEEN';
    if (this.world.lightAt(p.x, p.y) > 0.25) return 'LIT';
    return 'SHADOW';
  }

  smokeBlocks(x1, y1, x2, y2) {
    for (const s of this.smokes) {
      if (this.elapsed - s.born > SMOKE_LIFE) continue;
      const r = 26 + ((this.elapsed - s.born) / SMOKE_LIFE) * 46;
      // Segment-circle test.
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : ((s.x - x1) * dx + (s.y - y1) * dy) / len2;
      t = clamp(t, 0, 1);
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;
      if (dist(cx, cy, s.x, s.y) < r) return true;
    }
    return false;
  }

  throwPebble(target) {
    if (this.gadgets.pebbles <= 0 || this.screen !== SCREEN.PLAY) return;
    this.gadgets.pebbles -= 1;
    this.pebblesUsed += 1;
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 560;
    this.pebbles.push({
      x: this.player.x,
      y: this.player.y,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      tx: target.x,
      ty: target.y,
      born: this.elapsed,
      landed: false,
    });
    if (this.audio) this.audio.pebble();
  }

  useSmoke() {
    if (this.gadgets.smoke <= 0 || this.screen !== SCREEN.PLAY) return;
    this.gadgets.smoke -= 1;
    this.smokes.push({ x: this.player.x, y: this.player.y, born: this.elapsed });
    if (this.audio) this.audio.smoke();
  }

  douseLamp() {
    if (this.gadgets.douse <= 0 || this.screen !== SCREEN.PLAY) return;
    let best = null;
    let bestD = 1.6 * TILE;
    for (const lamp of this.world.lamps) {
      if (lamp.doused) continue;
      const d = dist(this.player.x, this.player.y, lamp.x, lamp.y);
      if (d < bestD) {
        bestD = d;
        best = lamp;
      }
    }
    if (!best) return;
    best.doused = true;
    this.gadgets.douse -= 1;
    if (this.audio) this.audio.douse();
    this.addCallout({
      x: best.x,
      y: best.y,
      tx: best.x + 20,
      ty: best.y - 70,
      text: 'LAMP OUT: shadow to hide in',
      until: this.elapsed + 5,
    });
  }

  hearNoise(point, radiusTiles, meterBump) {
    let heard = false;
    for (const guard of this.guards) {
      if (guard.hear(point, radiusTiles)) heard = true;
    }
    if (heard) this.detection.bumpNoise(meterBump || 0.2);
    return heard;
  }

  step(dt, move, sneaking, actions) {
    if (this.screen === SCREEN.CAUGHT) {
      this.elapsed += dt;
      if (this.elapsed >= this.caughtUntil) this.respawn();
      return;
    }
    if (this.screen !== SCREEN.PLAY) return;
    this.elapsed += dt;
    const p = this.player;
    p.sneaking = sneaking;
    // Move.
    if (move.x !== 0 || move.y !== 0) {
      const speed = (sneaking ? 1.8 : 3.1) * TILE;
      p.facing = Math.atan2(move.y, move.x);
      this.world.moveCircle(p, move.x * speed * dt, move.y * speed * dt);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = sneaking ? 0.5 : 0.34;
        this.footsteps.push({ x: p.x, y: p.y, born: this.elapsed });
        if (this.audio) this.audio.footstep(sneaking);
        const tile = this.world.isCreaky(Math.floor((p.x - WORLD.x) / TILE), Math.floor((p.y - WORLD.y) / TILE));
        if (!sneaking) this.hearNoise({ x: p.x, y: p.y }, NOISE.walk, 0.12);
        if (tile) this.hearNoise({ x: p.x, y: p.y }, NOISE.creaky, 0.25);
      }
    }
    // Gadget actions.
    if (actions) {
      if (actions.click) this.throwPebble(actions.click);
      if (actions.smoke) this.useSmoke();
      if (actions.douse) this.douseLamp();
    }
    // Pebbles fly, then clink.
    for (const peb of this.pebbles) {
      if (peb.landed) continue;
      peb.x += peb.vx * dt;
      peb.y += peb.vy * dt;
      const arrived = dist(peb.x, peb.y, peb.tx, peb.ty) < 14 || this.elapsed - peb.born > 0.7;
      if (arrived) {
        peb.landed = true;
        peb.x = peb.tx;
        peb.y = peb.ty;
        this.hearNoise({ x: peb.x, y: peb.y }, NOISE.pebble, 0.3);
        this.addCallout({
          x: peb.x,
          y: peb.y,
          tx: peb.x - 30,
          ty: peb.y - 64,
          text: '? HEARD THE PEBBLE: off to look',
          until: this.elapsed + 3.5,
        });
      }
    }
    this.pebbles = this.pebbles.filter((peb) => this.elapsed - peb.born < 6);
    this.footsteps = this.footsteps.filter((f) => this.elapsed - f.born < 0.9);
    // Loot + relic pickup.
    for (const item of this.world.loot) {
      if (!item.taken && dist(p.x, p.y, item.x, item.y) < 28) {
        item.taken = true;
        if (this.audio) this.audio.pickup();
        if (this.world.allValuablesTaken() && !this.world.exit.open) {
          this.world.exit.open = true;
          this.showBanner('ALL LOOT SECURED', 'The exit hatch is open — go!', '#3ddc78');
        }
      }
    }
    const relic = this.world.relic;
    if (relic && !relic.taken && dist(p.x, p.y, relic.x, relic.y) < 28) {
      relic.taken = true;
      if (this.audio) this.audio.pickup();
    }
    // Exit.
    if (this.world.exit.open && dist(p.x, p.y, this.world.exit.x, this.world.exit.y) < 30) {
      this.completeJob();
      return;
    }
    // Senses: every watcher, then the meters.
    const light = this.world.lightAt(p.x, p.y);
    const hidden = this.world.isHidden(p.x, p.y);
    const prevAlarmStates = this.guards.map((g) => g.state);
    let bestStrength = 0;
    let anySeen = false;
    for (const guard of this.guards) {
      let res = guard.canSeePoint(p.x, p.y, light, hidden);
      if (res.seen && this.smokeBlocks(guard.x, guard.y, p.x, p.y)) res = { seen: false, strength: 0 };
      guard.update(
        dt,
        res.seen ? { canSee: true, seeStrength: res.strength, playerX: p.x, playerY: p.y } : null,
        null,
      );
      if (res.seen) {
        anySeen = true;
        bestStrength = Math.max(bestStrength, res.strength);
      }
    }
    for (const cam of this.cameras) {
      cam.update(dt);
      let res = cam.canSeePoint(p.x, p.y, light, hidden);
      if (res.seen && this.smokeBlocks(cam.x, cam.y, p.x, p.y)) res = { seen: false, strength: 0 };
      if (res.seen) {
        anySeen = true;
        bestStrength = Math.max(bestStrength, res.strength);
        // A camera pings the nearest warden to the player's spot.
        let nearest = null;
        let nearestD = Infinity;
        for (const guard of this.guards) {
          const d = dist(guard.x, guard.y, p.x, p.y);
          if (d < nearestD) {
            nearestD = d;
            nearest = guard;
          }
        }
        if (nearest && nearest.state === GUARD_STATE.PATROL) {
          nearest.investigateAt = { x: p.x, y: p.y };
          nearest.state = GUARD_STATE.INVESTIGATE;
        }
      }
    }
    if (!this.staging) {
      if (anySeen) {
        const tripped = this.detection.feedSeen(dt, bestStrength, sneaking);
        if (tripped) this.onSpotted();
      } else {
        this.detection.feedUnseen(dt);
      }
    }
    if (this.staging) {
      // Staged shots: wardens keep patrolling and investigating, but the
      // thief can neither be spotted nor caught — the frame is a set piece.
      this.routeTimer -= dt;
      if (this.routeTimer <= 0) {
        this.routeTimer = 0.4;
        this.route.push({ x: p.x, y: p.y });
      }
      this.callouts = this.callouts.filter((c) => this.elapsed < (c.until || Infinity));
      if (this.banner && this.bannerUntil !== Infinity && this.elapsed > this.bannerUntil) this.banner = null;
      return;
    }
    // A guard that just went to ALARM trips the alarm too.
    this.guards.forEach((guard, i) => {
      if (prevAlarmStates[i] !== GUARD_STATE.ALARM && guard.state === GUARD_STATE.ALARM) {
        this.detection.bumpAlarm(1);
        this.onSpotted(guard);
      }
    });
    // Near miss: a cone's edge almost caught the thief, then let go.
    const pct = this.vision.track(this.detection.visibility, this.detection.alarmed);
    if (pct !== null) {
      this.detection.addCloseCall();
      this.detection.bumpAlarm(0.16);
      this.addCallout({
        x: p.x,
        y: p.y,
        tx: p.x - 60,
        ty: p.y - 74,
        text: `NEAR MISS · ${pct}%`,
        until: this.elapsed + 3,
      });
    }
    // Caught: an alarmed warden close enough to grab the thief.
    for (const guard of this.guards) {
      if (guard.state === GUARD_STATE.ALARM && dist(guard.x, guard.y, p.x, p.y) < 28) {
        this.onCaught();
        return;
      }
    }
    // Route recording, for the replay map.
    this.routeTimer -= dt;
    if (this.routeTimer <= 0) {
      this.routeTimer = 0.4;
      this.route.push({ x: p.x, y: p.y });
    }
    // Expire callouts + banner.
    this.callouts = this.callouts.filter((c) => this.elapsed < (c.until || Infinity));
    if (this.banner && this.elapsed > this.bannerUntil) this.banner = null;
  }

  onSpotted(guard) {
    const name = guard ? guard.name : 'A WARDEN';
    this.showBanner(`SPOTTED BY WARDEN ${name}`, '"Thief! There!" — break line of sight to cool off.', '#e03e36');
    if (this.audio) this.audio.alarm();
  }

  onCaught() {
    this.detection.strikes += 1;
    if (this.audio) this.audio.caught();
    if (this.detection.strikes >= STRIKES_MAX) {
      this.screen = SCREEN.FAILED;
      return;
    }
    this.screen = SCREEN.CAUGHT;
    this.caughtUntil = this.elapsed + 1.6;
  }

  respawn() {
    const start = this.world.playerStart;
    this.player.x = start.x;
    this.player.y = start.y;
    this.player.facing = 0;
    this.guards = this.job.guards.map((def) => new Guard(def, this.world));
    this.detection.visibility = 0;
    this.detection.alarm = 0;
    this.detection.wasAlarmed = false;
    this.pebbles = [];
    this.smokes = [];
    this.screen = SCREEN.PLAY;
  }

  completeJob() {
    const det = this.detection;
    const ghost = det.spotted === 0;
    const allLoot = this.world.valuablesTaken() === this.world.valuablesTotal() && (!this.world.relic || this.world.relic.taken);
    const underPar = this.elapsed <= this.job.parSeconds;
    const medals = (ghost ? 1 : 0) + (allLoot ? 1 : 0) + (underPar ? 1 : 0);
    this.medals[this.job.id] = Math.max(this.medals[this.job.id] || 0, medals);
    if (this.job.id < JOBS.length) this.unlocked = Math.max(this.unlocked, this.job.id);
    this.saveProgress();
    this.endStats = {
      ghost,
      timeText: this.timerText(),
      spotted: det.spotted,
      closeCalls: det.closeCalls,
      pebbles: this.pebblesUsed,
      valuables: this.world.valuablesTaken(),
      medals: { ghost, allLoot, underPar },
    };
    this.screen = SCREEN.COMPLETE;
    if (this.audio) {
      if (ghost) this.audio.ghost();
      else this.audio.pickup();
    }
  }

  click(x, y) {
    if (this.screen === SCREEN.TITLE) {
      for (let i = 0; i < this.jobs.length; i += 1) {
        const rowY = 440 + i * 56;
        if (x >= 220 && x <= 660 && y >= rowY && y <= rowY + 44 && i <= this.unlocked) {
          this.startJob(i + 1);
          return true;
        }
      }
      return false;
    }
    if (this.screen === SCREEN.COMPLETE) {
      if (y >= 576 && y <= 616) {
        if (x >= 230 && x <= 360) {
          // NEXT JOB.
          const next = Math.min(this.job.id + 1, JOBS.length);
          this.startJob(next);
          return true;
        }
        if (x >= 380 && x <= 510) {
          this.startJob(this.job.id);
          return true;
        }
        if (x >= 530 && x <= 660) {
          this.screen = SCREEN.TITLE;
          return true;
        }
      }
      return false;
    }
    if (this.screen === SCREEN.FAILED) {
      this.screen = SCREEN.TITLE;
      return true;
    }
    return false;
  }
}
