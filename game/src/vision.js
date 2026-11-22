// What every watcher in the room can see of the player, in one place:
// guards and cameras, light and grass, and the near miss — the moment a
// cone's edge almost catches the thief, which the game shows and scores.
import { clamp } from './random.js';

export class Vision {
  constructor(world) {
    this.world = world;
    this.peak = 0;
    this.nearMissShown = false;
  }

  // Returns { visible, strength, watcher } for the strongest watcher.
  sense(player, watchers) {
    const light = this.world.lightAt(player.x, player.y);
    const hidden = this.world.isHidden(player.x, player.y);
    let best = null;
    for (const watcher of watchers) {
      const seen = watcher.canSeePoint(player.x, player.y, light, hidden);
      if (seen.seen && (!best || seen.strength > best.strength)) {
        best = { watcher, strength: seen.strength };
      }
    }
    if (!best) return { visible: false, strength: 0, light, hidden, watcher: null };
    return { visible: true, strength: best.strength, light, hidden, watcher: best.watcher };
  }

  // Track the highest visibility reached while unseen: a peak that fades
  // without an alarm is a near miss, worth a callout and a small alarm bump.
  track(visibility, alarmed) {
    this.peak = Math.max(this.peak, visibility);
    if (alarmed) {
      this.peak = 0;
      this.nearMissShown = false;
      return null;
    }
    if (visibility < 0.3 && this.peak >= 0.45 && !this.nearMissShown) {
      this.nearMissShown = true;
      const pct = Math.round(this.peak * 100);
      this.peak = 0;
      return pct;
    }
    if (visibility < 0.05) this.peak = 0;
    return null;
  }
}
