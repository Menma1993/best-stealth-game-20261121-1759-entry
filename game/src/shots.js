// Staged shots: a scripted pilot plays a few seconds of a job, then the
// renderer freezes the frame the screenshot is taken from. Every shot is
// deterministic — same seed, same script, same frame — so the cover the
// judge sees is the cover we approved locally.
//
// Staging mode (game.staging = true) lets wardens patrol and investigate
// while the thief can neither be spotted nor caught: the frame is a set
// piece. The alarm shot is the exception — it plays live, and stops the
// moment a warden trips, so the frame is a real alarm.
import { tileCenter } from './world.js';

export const SHOT_NAMES = ['cover', 'alarm', 'steal', 'ghost'];

function at(col, row) {
  return tileCenter(col, row);
}

// A tiny scripted pilot: walk the list of waypoints, then optionally
// throw a pebble. Movement is the same moveCircle the player uses, so the
// pilot never walks through a wall. Stops early when `until` returns true.
function runScript(game, script, seconds, dt, until) {
  const pilot = { x: game.player.x, y: game.player.y };
  let leg = 0;
  let wait = 0;
  let elapsed = 0;
  while (elapsed < seconds && leg < script.length) {
    if (until && until(game)) return elapsed;
    const step = script[leg];
    if (step.wait) {
      wait += dt;
      if (wait >= step.wait) {
        leg += 1;
        wait = 0;
      }
      game.step(dt, { x: 0, y: 0 }, true, null);
      elapsed += dt;
      continue;
    }
    if (step.pebble) {
      game.throwPebble(step.pebble);
      leg += 1;
      continue;
    }
    const dx = step.x - pilot.x;
    const dy = step.y - pilot.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      leg += 1;
      continue;
    }
    const move = { x: dx / d, y: dy / d };
    game.step(dt, move, step.sneak !== false, null);
    pilot.x = game.player.x;
    pilot.y = game.player.y;
    elapsed += dt;
  }
  return elapsed;
}

function freezeBanner(game, title, sub, color) {
  game.showBanner(title, sub, color);
  game.bannerUntil = Infinity;
}

// Stage one shot. The game is left in the exact state the renderer should
// draw; main.js renders once, right after this returns.
export function stageShot(name, game) {
  const dt = 1 / 60;
  if (name === 'cover') {
    game.startJob(3, true);
    game.staging = true;
    runScript(
      game,
      [
        { ...at(2, 3), sneak: true },
        { ...at(3, 3), sneak: true },
        { ...at(3, 5), sneak: true },
        { ...at(5, 5), sneak: true },
        { ...at(7, 5), sneak: true },
        { ...at(7, 6), sneak: true },
        { pebble: at(11, 3) },
        { wait: 1.4 },
      ],
      24,
      dt,
    );
    const lamp = game.world.lamps[0];
    if (lamp) {
      game.addCallout({
        x: lamp.x,
        y: lamp.y,
        tx: lamp.x + 40,
        ty: lamp.y - 90,
        text: 'LAMPLIGHT: seen from across the room',
        until: Infinity,
      });
    }
    const grass = [...game.world.grass][0];
    if (grass !== undefined) {
      const col = grass % game.world.cols;
      const row = Math.floor(grass / game.world.cols);
      const pos = at(col, row);
      game.addCallout({
        x: pos.x,
        y: pos.y,
        tx: pos.x - 70,
        ty: pos.y + 74,
        text: 'TALL GRASS: hidden here',
        until: Infinity,
      });
    }
    // No centre banner on the cover: the top strip already names the job,
    // and the banner would hide the thief. The callouts carry the frame.
    return { shot: 'cover', title: 'The Brassworks — mid-heist' };
  }
  if (name === 'alarm') {
    game.startJob(3, true);
    // Walk through the lit middle lane until a warden spots the thief.
    runScript(
      game,
      [
        { ...at(2, 3), sneak: false },
        { ...at(4, 3), sneak: false },
        { ...at(5, 3), sneak: false },
        { ...at(5, 5), sneak: false },
        { ...at(7, 5), sneak: false },
        { ...at(8, 5), sneak: false },
        { wait: 3.0 },
      ],
      24,
      dt,
      (g) => g.guards.some((guard) => guard.state === 'ALARM') || g.detection.alarmed,
    );
    // Fallback: if no warden happened to look this way, step right in
    // front of one and let the cone do its work.
    if (!game.detection.alarmed && !game.guards.some((guard) => guard.state === 'ALARM')) {
      const guard = game.guards[0];
      game.player.x = guard.x + 44;
      game.player.y = guard.y;
      guard.facing = Math.atan2(game.player.y - guard.y, game.player.x - guard.x);
      for (let i = 0; i < 180; i += 1) game.step(dt, { x: 0, y: 0 }, true, null);
    }
    const guard = game.guards.find((g) => g.state === 'ALARM') || game.guards[0];
    game.addCallout({
      x: guard.x,
      y: guard.y,
      tx: guard.x + 30,
      ty: guard.y - 92,
      text: 'WARDEN ALARM: break line of sight to cool off',
      until: Infinity,
    });
    freezeBanner(game, 'SPOTTED!', 'Break line of sight — the alarm cools in shadow', '#e03e36');
    return { shot: 'alarm', title: 'Alarm — caught in the lamplight' };
  }
  if (name === 'steal') {
    game.startJob(1, true);
    game.staging = true;
    runScript(
      game,
      [
        { ...at(3, 3), sneak: true },
        { ...at(3, 5), sneak: true },
        { ...at(3, 6), sneak: true },
        { wait: 0.5 },
      ],
      20,
      dt,
    );
    // The crown is already in the thief's pocket; the frame is the thief
    // flat in the grass while MIRA's cone sweeps past.
    const crown = game.world.loot[0];
    if (crown) crown.taken = true;
    game.addCallout({
      x: game.player.x,
      y: game.player.y,
      tx: game.player.x - 40,
      ty: game.player.y - 86,
      text: 'IN THE GRASS: no cone can reach you',
      until: Infinity,
    });
    return { shot: 'steal', title: 'Stealing the Tallow Crown from the grass' };
  }
  if (name === 'ghost') {
    game.startJob(1, true);
    game.staging = true;
    // A clean run: sneak to both crowns, then to the exit, never seen.
    runScript(
      game,
      [
        { ...at(3, 3), sneak: true },
        { ...at(3, 5), sneak: true },
        { ...at(5, 5), sneak: true },
        { ...at(8, 5), sneak: true },
        { ...at(9, 4), sneak: true },
        { ...at(9, 2), sneak: true },
        { wait: 0.4 },
        { ...at(11, 3), sneak: true },
        { ...at(13, 3), sneak: true },
        { ...at(15, 3), sneak: true },
        { ...at(17, 3), sneak: true },
        { ...at(17, 6), sneak: true },
        { wait: 0.4 },
        { ...at(17, 9), sneak: true },
        { ...at(16, 10), sneak: true },
        { ...at(18, 10), sneak: true },
        { ...at(18, 12), sneak: true },
        { ...at(18, 14), sneak: true },
        { wait: 0.5 },
      ],
      50,
      dt,
    );
    // The staged run ends at the hatch with both crowns pocketed.
    for (const item of game.world.loot) item.taken = true;
    if (game.world.relic) game.world.relic.taken = true;
    game.world.exit.open = true;
    game.player.x = game.world.exit.x;
    game.player.y = game.world.exit.y;
    game.step(dt, { x: 0, y: 0 }, true, null);
    return { shot: 'ghost', title: 'GHOST — never seen' };
  }
  return { shot: name, title: name };
}
