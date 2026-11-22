// Every sound the game makes, synthesized with WebAudio — no audio files,
// no network. Footsteps, the pebble's clink, the pickup chime, the alarm
// sting and a low room tone. Silent until the first key or click, so the
// browser's autoplay rules never bite.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.roomTone = null;
    this.enabled = true;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.roomTone = { osc, gain };
    } catch {
      this.ctx = null;
    }
  }

  blip(freq, seconds, type, volume, slideTo) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    gain.gain.setValueAtTime(volume || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  footstep(sneaking) {
    this.blip(sneaking ? 140 : 95, 0.07, 'triangle', sneaking ? 0.05 : 0.11, 70);
  }

  pebble() {
    this.blip(1250, 0.09, 'square', 0.08, 900);
    setTimeout(() => this.blip(980, 0.08, 'square', 0.06, 700), 90);
  }

  pickup() {
    this.blip(660, 0.12, 'sine', 0.18, 990);
    setTimeout(() => this.blip(990, 0.16, 'sine', 0.14, 1320), 90);
  }

  alarm() {
    this.blip(220, 0.22, 'sawtooth', 0.16, 440);
    setTimeout(() => this.blip(330, 0.22, 'sawtooth', 0.14, 440), 160);
  }

  suspicious() {
    this.blip(520, 0.12, 'sine', 0.12, 380);
  }

  douse() {
    this.blip(300, 0.3, 'sine', 0.12, 90);
  }

  smoke() {
    this.blip(180, 0.4, 'sine', 0.1, 60);
  }

  caught() {
    this.blip(160, 0.4, 'sawtooth', 0.18, 60);
  }

  ghost() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.25, 'sine', 0.14), i * 110);
    });
  }
}
