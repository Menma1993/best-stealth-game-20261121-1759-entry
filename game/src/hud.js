// The chrome around the world: the top strip (job, objective, visibility,
// loot, timer, strikes), the right panel (detection meters, patrol roster,
// field-notes legend, minimap, controls), the callout annotations that
// teach the judge, the event banners, and the end screen with its GHOST
// stamp, route replay, stats and medals.
import { WORLD, PANEL, COLORS, TILE } from './config.js';
import { clamp, dist } from './random.js';

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = '#0a0f1c';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0.01) {
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(4, w * clamp(frac, 0, 1)), h, 3);
    ctx.fill();
  }
  // Dark shadow under the label so it reads over a filled bar too.
  ctx.fillStyle = 'rgba(5,8,15,0.85)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 5, y + h / 2 + 1);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(label, x + 4, y + h / 2);
}

function panelBox(ctx, x, y, w, h, title) {
  ctx.fillStyle = COLORS.panelBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelLine;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, x + 12, y + 10);
}

export class HUD {
  drawTop(ctx, game) {
    const job = game.job;
    ctx.fillStyle = '#0d1322';
    ctx.fillRect(0, 0, WORLD.w, WORLD.y);
    ctx.fillStyle = COLORS.panelLine;
    ctx.fillRect(0, WORLD.y - 1, WORLD.w, 1);
    ctx.textBaseline = 'middle';
    // Job name + objective.
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`JOB ${job.id} — ${job.name.toUpperCase()}`, 16, 22);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px sans-serif';
    ctx.fillText(job.objective, 16, 46);
    // Visibility word.
    const vis = game.visibilityWord();
    const visColor = vis === 'HIDDEN' ? COLORS.green : vis === 'SHADOW' ? COLORS.gold : vis === 'SEEN' ? COLORS.red : COLORS.text;
    ctx.textAlign = 'right';
    ctx.fillStyle = visColor;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(vis, WORLD.w - 16, 22);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px sans-serif';
    ctx.fillText(`◆ ${game.world.valuablesTaken()}/${game.world.valuablesTotal()}  ·  pebbles ${game.gadgets.pebbles}  ·  ${game.timerText()}`, WORLD.w - 16, 46);
    // Strikes as dots.
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < game.detection.strikes ? COLORS.red : '#2a3648';
      ctx.beginPath();
      ctx.arc(WORLD.w - 24 - i * 18, 66, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSide(ctx, game) {
    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(PANEL.x, 0, PANEL.w, PANEL.h);
    ctx.fillStyle = COLORS.panelLine;
    ctx.fillRect(PANEL.x, 0, 1, PANEL.h);
    let y = 0;
    // Title.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('GLOAM', PANEL.x + 16, y + 12);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px sans-serif';
    ctx.fillText('a lamplight heist', PANEL.x + 16, y + 42);
    y = 66;
    // Detection panel.
    panelBox(ctx, PANEL.x + 12, y, PANEL.w - 24, 132, 'DETECTION');
    const det = game.detection;
    const word = det.stateWord;
    const wordColor = word === 'ALARM' ? COLORS.red : word === 'SUSPICIOUS' ? COLORS.gold : COLORS.green;
    ctx.fillStyle = wordColor;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(word === 'SUSPICIOUS' ? 'SUSPICIOUS ?' : word === 'ALARM' ? 'ALARM !' : 'QUIET', PANEL.x + 24, y + 32);
    bar(ctx, PANEL.x + 24, y + 66, PANEL.w - 72, 14, det.alarm, COLORS.red, 'ALARM');
    bar(ctx, PANEL.x + 24, y + 86, PANEL.w - 72, 14, det.visibility, COLORS.gold, 'VISIBILITY');
    bar(ctx, PANEL.x + 24, y + 106, PANEL.w - 72, 14, det.noise, '#7fa8d8', 'NOISE');
    y += 144;
    // Patrol roster.
    const rosterH = 24 + game.guards.length * 20;
    panelBox(ctx, PANEL.x + 12, y, PANEL.w - 24, rosterH, 'PATROL — WARDENS ON THIS FLOOR');
    ctx.font = '12px sans-serif';
    game.guards.forEach((guard, i) => {
      const d = Math.round(dist(game.player.x, game.player.y, guard.x, guard.y) / TILE);
      const status = guard.state === 'PATROL' ? 'PATROL' : guard.state;
      const color = guard.state === 'ALARM' ? COLORS.red : guard.state === 'PATROL' ? COLORS.textDim : COLORS.gold;
      const rowY = y + 30 + i * 20;
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`${guard.name}`, PANEL.x + 24, rowY);
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.fillText(`${status} · ${d} tiles`, PANEL.x + PANEL.w - 24, rowY);
      ctx.textAlign = 'left';
    });
    y += rosterH + 12;
    // Field notes legend.
    const notes = [
      ['●', COLORS.guard, 'warden + vision cone'],
      ['◐', '#3a4a63', 'blind spot — behind the cone'],
      ['✦', COLORS.gold, 'lamplight — seen from far'],
      ['♣', COLORS.grass, 'tall grass — hidden'],
      ['▦', 'rgba(210,170,110,0.8)', 'creaky boards — loud'],
      ['○', '#c9c2b2', 'pebble — throw to distract'],
      ['▣', COLORS.exit, 'exit hatch — open after loot'],
    ];
    panelBox(ctx, PANEL.x + 12, y, PANEL.w - 24, 24 + notes.length * 17, 'FIELD NOTES');
    ctx.font = '12px sans-serif';
    notes.forEach(([glyph, color, text], i) => {
      const rowY = y + 30 + i * 17;
      ctx.fillStyle = color;
      ctx.fillText(glyph, PANEL.x + 24, rowY);
      ctx.fillStyle = COLORS.text;
      ctx.fillText(text, PANEL.x + 46, rowY);
    });
    y += 24 + notes.length * 17 + 12;
    // Minimap.
    const mapH = 148;
    panelBox(ctx, PANEL.x + 12, y, PANEL.w - 24, mapH, 'FLOOR PLAN');
    this.drawMinimap(ctx, game, PANEL.x + 24, y + 30, PANEL.w - 48, mapH - 42);
    y += mapH + 12;
    // Controls.
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px sans-serif';
    ctx.fillText('WASD move · SHIFT sneak · CLICK throw pebble', PANEL.x + 16, y + 4);
    ctx.fillText('F smoke · G douse lamp · R restart job', PANEL.x + 16, y + 22);
  }

  drawMinimap(ctx, game, x, y, w, h) {
    const world = game.world;
    const sx = w / world.cols;
    const sy = h / world.rows;
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(x, y, w, h);
    for (let row = 0; row < world.rows; row += 1) {
      for (let col = 0; col < world.cols; col += 1) {
        if (world.isWall(col, row)) {
          ctx.fillStyle = '#2c3a58';
          ctx.fillRect(x + col * sx, y + row * sy, sx, sy);
        }
      }
    }
    // Route replay, when there is one.
    if (game.route.length > 1) {
      ctx.strokeStyle = 'rgba(84,220,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      game.route.forEach((p, i) => {
        const mx = x + ((p.x - WORLD.x) / (world.cols * TILE)) * w;
        const my = y + ((p.y - WORLD.y) / (world.rows * TILE)) * h;
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const dot = (px, py, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + ((px - WORLD.x) / (world.cols * TILE)) * w, y + ((py - WORLD.y) / (world.rows * TILE)) * h, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const item of world.loot) if (!item.taken) dot(item.x, item.y, COLORS.loot, 3);
    if (world.relic && !world.relic.taken) dot(world.relic.x, world.relic.y, COLORS.relic, 3);
    if (world.exit) dot(world.exit.x, world.exit.y, world.exit.open ? COLORS.exit : COLORS.exitLocked, 4);
    for (const guard of game.guards) dot(guard.x, guard.y, COLORS.guard, 3.5);
    dot(game.player.x, game.player.y, '#ffffff', 4);
  }

  // A callout: a thin leader line from a feature to a small labelled box.
  drawCallout(ctx, c) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232,228,216,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.tx, c.ty);
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,228,216,0.9)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    const w = ctx.measureText(c.text).width + 16;
    const h = 22;
    let bx = c.tx;
    let by = c.ty - h / 2;
    bx = clamp(bx, 8, 880 - w - 8);
    by = clamp(by, WORLD.y + 8, 720 - h - 8);
    ctx.fillStyle = 'rgba(10,15,28,0.92)';
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.text, bx + 8, by + h / 2 + 0.5);
    ctx.restore();
  }

  drawCallouts(ctx, game) {
    for (const c of game.callouts) this.drawCallout(ctx, c);
  }

  // Big centre banner for an event: SPOTTED, CAUGHT, CLEAN GETAWAY.
  drawBanner(ctx, title, sub, color) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(5,8,15,0.55)';
    ctx.fillRect(0, 300, 880, 110);
    ctx.fillStyle = color;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(title, 440, 330);
    if (sub) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '15px sans-serif';
      ctx.fillText(sub, 440, 368);
    }
    ctx.restore();
  }

  drawFieldNotesCard(ctx, game) {
    // The in-playfield legend card, bottom-left, like the leaders do it.
    const x = 14;
    const y = 720 - 132;
    const w = 268;
    const h = 118;
    ctx.save();
    ctx.fillStyle = 'rgba(10,15,28,0.88)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelLine;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FIELD NOTES', x + 12, y + 9);
    const rows = [
      ['●', COLORS.guard, 'warden + cone — stay out of it'],
      ['✦', COLORS.gold, 'lamplight — seen from far'],
      ['♣', COLORS.grass, 'tall grass — hidden'],
      ['▦', 'rgba(210,170,110,0.8)', 'creaky boards — loud'],
      ['○', '#c9c2b2', 'pebble — click to distract'],
    ];
    ctx.font = '11px sans-serif';
    rows.forEach(([glyph, color, text], i) => {
      const ry = y + 28 + i * 17;
      ctx.fillStyle = color;
      ctx.fillText(glyph, x + 12, ry);
      ctx.fillStyle = COLORS.text;
      ctx.fillText(text, x + 32, ry);
    });
    ctx.restore();
  }

  // The end screen: stamp, route replay, stats, medals, buttons.
  drawEndScreen(ctx, game) {
    const s = game.endStats;
    ctx.save();
    ctx.fillStyle = 'rgba(5,8,15,0.82)';
    ctx.fillRect(0, 0, 880, 720);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(s.ghost ? 'CLEAN GETAWAY' : 'JOB DONE', 440, 92);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '15px sans-serif';
    ctx.fillText(`${game.job.name} — ${game.job.lootName} secured`, 440, 126);
    if (s.ghost) {
      // The GHOST stamp.
      ctx.save();
      ctx.translate(440, 190);
      ctx.rotate(-0.06);
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 5;
      ctx.strokeRect(-150, -32, 300, 64);
      ctx.fillStyle = COLORS.green;
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('GHOST', 0, 2);
      ctx.restore();
      ctx.fillStyle = COLORS.green;
      ctx.font = '13px sans-serif';
      ctx.fillText('never spotted — not once', 440, 238);
    }
    // Route replay map.
    ctx.fillStyle = COLORS.panelBg;
    ctx.beginPath();
    ctx.roundRect(180, 258, 520, 150, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.panelLine;
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ROUTE REPLAY — your path through the floor', 196, 268);
    this.drawMinimap(ctx, game, 196, 288, 488, 108);
    // Stats row.
    const stats = [
      ['TIME', s.timeText],
      ['SPOTTED', String(s.spotted)],
      ['CLOSE CALLS', String(s.closeCalls)],
      ['PEBBLES', String(s.pebbles)],
      ['VALUABLES', `${s.valuables}/${game.world.valuablesTotal()}`],
    ];
    ctx.font = 'bold 13px sans-serif';
    stats.forEach(([label, value], i) => {
      const cx = 150 + i * 145;
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '11px sans-serif';
      ctx.fillText(label, cx, 428);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(value, cx, 452);
    });
    // Medals.
    ctx.textAlign = 'center';
    const medals = [
      { name: 'Never spotted', won: s.medals.ghost },
      { name: 'Every valuable', won: s.medals.allLoot },
      { name: `Under ${game.job.parSeconds}s`, won: s.medals.underPar },
    ];
    medals.forEach((m, i) => {
      const cx = 290 + i * 150;
      ctx.fillStyle = m.won ? COLORS.gold : '#2a3648';
      ctx.beginPath();
      ctx.arc(cx, 512, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = m.won ? '#0b0f1c' : '#5a6b7a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(m.won ? '★' : '☆', cx, 513);
      ctx.fillStyle = m.won ? COLORS.text : COLORS.textDim;
      ctx.font = '12px sans-serif';
      ctx.fillText(m.name, cx, 546);
    });
    // Buttons.
    const buttons = ['NEXT JOB', 'REPLAY', 'JOB BOARD'];
    buttons.forEach((label, i) => {
      const bx = 230 + i * 150;
      ctx.fillStyle = i === 0 ? COLORS.gold : '#1b2436';
      ctx.beginPath();
      ctx.roundRect(bx, 576, 130, 40, 8);
      ctx.fill();
      ctx.fillStyle = i === 0 ? '#0b0f1c' : COLORS.text;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(label, bx + 65, 597);
    });
    ctx.restore();
  }

  drawTitle(ctx, game) {
    ctx.fillStyle = '#0d1322';
    ctx.fillRect(0, 0, 880, 720);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 92px sans-serif';
    ctx.fillText('GLOAM', 440, 210);
    ctx.fillStyle = COLORS.text;
    ctx.font = '22px sans-serif';
    ctx.fillText('a lamplight heist', 440, 268);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '15px sans-serif';
    ctx.fillText('Steal what glitters. Stay out of the light. Vanish unseen.', 440, 320);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('CLICK A JOB TO BEGIN', 440, 400);
    const jobs = game.jobs;
    jobs.forEach((job, i) => {
      const y = 440 + i * 56;
      const locked = i > game.unlocked;
      ctx.fillStyle = locked ? '#141b2c' : '#1b2436';
      ctx.beginPath();
      ctx.roundRect(220, y, 440, 44, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.panelLine;
      ctx.stroke();
      ctx.fillStyle = locked ? COLORS.textDim : COLORS.text;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${job.name}`, 238, y + 15);
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '12px sans-serif';
      ctx.fillText(locked ? 'finish the previous job to unlock' : job.objective, 238, y + 32);
      if (game.medals[job.id]) {
        ctx.fillStyle = COLORS.gold;
        ctx.textAlign = 'right';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('★'.repeat(game.medals[job.id]), 644, y + 22);
      }
      ctx.textAlign = 'center';
    });
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD move · SHIFT sneak · CLICK throw pebble · F smoke · G douse lamp', 440, 680);
  }

  drawCaught(ctx, game) {
    ctx.fillStyle = 'rgba(5,8,15,0.6)';
    ctx.fillRect(0, 0, 880, 720);
    this.drawBanner(ctx, 'CAUGHT!', `Strike ${game.detection.strikes} of 3 — the wardens drag you back to the door.`, COLORS.red);
  }

  drawFailed(ctx, game) {
    ctx.fillStyle = 'rgba(5,8,15,0.85)';
    ctx.fillRect(0, 0, 880, 720);
    this.drawBanner(ctx, 'JOB FAILED', 'Three strikes — the house keeps its glitter tonight.', COLORS.red);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = '15px sans-serif';
    ctx.fillText('Press R to try this job again, or click JOB BOARD.', 440, 400);
  }
}
