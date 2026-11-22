// GLOAM — boot and main loop.
// ?shot=cover|alarm|steal|ghost stages a deterministic frame and renders
// it (headless screenshots). Without a query, this is the playable game:
// WASD/arrows to move, Shift to sneak, click to throw a pebble, F smoke,
// G douse a lamp, R restart the job, M mute.
//
// Composition: the Renderer paints the world, the HUD paints the chrome
// around it (top strip, side panel, field-notes card, callouts, banners,
// and the title / end / caught / failed screens).
import { Game, SCREEN } from './state.js';
import { Renderer } from './render.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { stageShot, SHOT_NAMES } from './shots.js';
import { CANVAS } from './config.js';

const canvas = document.createElement('canvas');
canvas.width = CANVAS.w;
canvas.height = CANVAS.h;
canvas.style.cssText = 'display:block;margin:0 auto;max-width:100vw;max-height:100vh;background:#0d1220;';
document.body.style.margin = '0';
document.body.style.background = '#0d1220';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

const game = new Game();
const renderer = new Renderer();
const hud = new HUD();
game.render = renderer;
game.hud = hud;
window.__gloam = { game };

function drawFrame() {
  ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.fillStyle = '#0d1220';
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  if (game.screen === SCREEN.TITLE) {
    hud.drawTitle(ctx, game);
    hud.drawSide(ctx, game);
    return;
  }
  renderer.draw(ctx, game);
  hud.drawTop(ctx, game);
  hud.drawSide(ctx, game);
  if (game.screen === SCREEN.PLAY || game.screen === SCREEN.CAUGHT) {
    hud.drawFieldNotesCard(ctx, game);
    hud.drawCallouts(ctx, game);
    if (game.screen === SCREEN.PLAY && game.banner) hud.drawBanner(ctx, game.banner.title, game.banner.sub, game.banner.color);
  }
  if (game.screen === SCREEN.COMPLETE) hud.drawEndScreen(ctx, game);
  else if (game.screen === SCREEN.CAUGHT) hud.drawCaught(ctx, game);
  else if (game.screen === SCREEN.FAILED) hud.drawFailed(ctx, game);
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot && SHOT_NAMES.includes(shot)) {
  stageShot(shot, game);
  drawFrame();
  // Keep repainting the frozen frame so a headless screenshot always
  // catches a painted canvas, even if the compositor drops the first one.
  const repaint = () => {
    drawFrame();
    requestAnimationFrame(repaint);
  };
  requestAnimationFrame(repaint);
} else {
  const audio = new Audio();
  game.audio = audio;
  const input = new Input(canvas);
  const unlock = () => audio.unlock();
  window.addEventListener('mousedown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'm' || e.key === 'M') audio.enabled = !audio.enabled;
    if ((e.key === 'r' || e.key === 'R') && game.screen !== SCREEN.TITLE) game.startJob(game.job.id);
  });
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const click = input.consumeClick();
    const actions = {
      click: null,
      smoke: input.consumeKey('f'),
      douse: input.consumeKey('g'),
    };
    if (click) {
      if (game.screen === SCREEN.PLAY) actions.click = click;
      else game.click(click.x, click.y);
    }
    game.step(dt, input.moveVector(), input.sneaking, actions);
    drawFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
