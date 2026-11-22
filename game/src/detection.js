// The three meters the right panel shows — visibility, alarm and noise —
// plus the run's own tally: times spotted, close calls and strikes.
// One file, one task: how being seen turns into being caught.
import { ALARM, DETECT } from './config.js';
import { clamp } from './random.js';

export class Detection {
  constructor() {
    this.visibility = 0;
    this.alarm = 0;
    this.noise = 0;
    this.spotted = 0;
    this.closeCalls = 0;
    this.strikes = 0;
    this.wasAlarmed = false;
  }

  get alarmed() {
    return this.alarm >= 0.99;
  }

  get stateWord() {
    if (this.alarmed) return 'ALARM';
    if (this.visibility > 0.35) return 'SUSPICIOUS';
    return 'QUIET';
  }

  // Feed one tick of being seen; returns true on the tick the alarm trips.
  feedSeen(dt, strength, sneaking) {
    const rate = DETECT.fillLit * strength * (sneaking ? DETECT.sneakFactor : 1);
    this.visibility = clamp(this.visibility + rate * dt, 0, 1);
    this.noise = clamp(this.noise - dt * 0.4, 0, 1);
    if (this.visibility >= 1 && !this.wasAlarmed) {
      this.wasAlarmed = true;
      this.alarm = 1;
      this.spotted += 1;
      return true;
    }
    return false;
  }

  feedUnseen(dt) {
    this.visibility = clamp(this.visibility - DETECT.decay * dt, 0, 1);
    this.alarm = clamp(this.alarm - ALARM.decay * dt, 0, 1);
    this.noise = clamp(this.noise - dt * 0.5, 0, 1);
    if (this.alarm < 0.5) this.wasAlarmed = false;
  }

  bumpNoise(amount) {
    this.noise = clamp(this.noise + amount, 0, 1);
  }

  bumpAlarm(amount) {
    this.alarm = clamp(this.alarm + amount, 0, 1);
    if (this.alarm >= 0.99 && !this.wasAlarmed) {
      this.wasAlarmed = true;
      this.spotted += 1;
    }
  }

  addCloseCall() {
    this.closeCalls += 1;
  }
}
