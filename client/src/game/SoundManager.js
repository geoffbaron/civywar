// ═══════════════════════════════════════════════════════════════
//  Sound Manager — Civil War battlefield audio
//  Uses real sound samples + Web Audio API processing
//  for varied, context-appropriate combat sounds.
//
//  Sources (SoundBible.com):
//    cannon.mp3  — Cannon blast (Public Domain)
//    musket.mp3  — Musket fire, CW reenactment (Public Domain)
//    drums.mp3   — CW marching drums (CC-BY 3.0, DrumM8)
//    gallop.mp3  — Galloping horse (CC-BY 3.0)
//    fanfare.mp3 — Victory trumpet fanfare (Public Domain)
// ═══════════════════════════════════════════════════════════════

const SOUNDS = {
  cannon:        { src: '/sounds/cannon.mp3',         volume: 0.5,  maxConcurrent: 2 },
  musket:        { src: '/sounds/musket.mp3',         volume: 0.25, maxConcurrent: 3 },
  musketVolley:  { src: '/sounds/musket-volley.m4a',  volume: 0.35, maxConcurrent: 3 },
  drums:         { src: '/sounds/drums.mp3',          volume: 0.12, maxConcurrent: 1 },
  gallop:        { src: '/sounds/gallop.mp3',         volume: 0.2,  maxConcurrent: 2 },
  fanfare:       { src: '/sounds/fanfare.mp3',        volume: 0.45, maxConcurrent: 1 },
};

class SoundManager {
  constructor() {
    this.buffers = {};
    this.ctx = null;
    this.ready = false;
    this.activeSources = {};
    this.loopingSources = {};
    this.masterGain = null;
    this.muted = false;
    this.lastPlayTime = {};

    // Combat state tracking — prevents repetitive sounds
    this.combatIntensity = 0; // 0-1, how intense the battle is
    this.lastCannonTime = 0;
    this.lastMusketVolleyTime = 0;
    this.lastCavalryTime = 0;
    this.volleyCounter = 0;  // builds up during sustained fire
  }

  async init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      const loads = Object.entries(SOUNDS).map(async ([key, def]) => {
        try {
          const resp = await fetch(def.src);
          const arrayBuf = await resp.arrayBuffer();
          this.buffers[key] = await this.ctx.decodeAudioData(arrayBuf);
        } catch (e) {
          console.warn(`Failed to load sound: ${key}`, e);
        }
      });
      await Promise.all(loads);
      this.ready = true;
      for (const key of Object.keys(SOUNDS)) {
        this.activeSources[key] = 0;
        this.lastPlayTime[key] = 0;
      }
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1.0;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ─── Core play with heavy randomization ───
  _play(name, { distance = 0, rate = 1.0, volume = 1.0, pan = 0, offset = 0, duration = 0 } = {}) {
    if (!this.ready || !this.buffers[name] || this.muted) return;

    const def = SOUNDS[name];
    if (!def) return;

    // Throttle
    const now = this.ctx.currentTime;
    const minInterval = {
      cannon: 0.8 + Math.random() * 1.5,   // cannons: 0.8-2.3s apart
      musket: 0.4 + Math.random() * 0.8,    // muskets: 0.4-1.2s apart
      gallop: 1.0 + Math.random() * 2.0,    // gallop: 1-3s apart
      drums: 0.5,
      fanfare: 2.0,
    }[name] || 0.3;

    if (now - (this.lastPlayTime[name] || 0) < minInterval) return;
    this.lastPlayTime[name] = now;

    if (this.activeSources[name] >= def.maxConcurrent) return;

    try {
      this.resume();
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[name];

      // Wider pitch randomization for variety
      source.playbackRate.value = rate;

      // Random start offset within the sample for variety
      const buf = this.buffers[name];
      const startOffset = offset || (Math.random() * Math.max(0, buf.duration - 1.5));
      const playDuration = duration || (0.5 + Math.random() * 1.5);

      // Distance-based volume
      const distVol = Math.max(0.05, 1.0 - distance / 800);
      const gain = this.ctx.createGain();
      gain.gain.value = def.volume * distVol * volume;

      // Stereo panning based on position
      let output = gain;
      if (pan !== 0 && this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        gain.connect(panner);
        output = panner;
      }

      // EQ filter for distance — far sounds lose high frequencies
      if (distance > 200) {
        const lpf = this.ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = Math.max(800, 4000 - distance * 4);
        output.connect(lpf);
        output = lpf;
      }

      source.connect(gain);
      output.connect(this.masterGain);

      this.activeSources[name]++;
      source.onended = () => {
        this.activeSources[name] = Math.max(0, this.activeSources[name] - 1);
      };

      source.start(now, Math.max(0, startOffset), playDuration);
    } catch (e) { /* silently ignore */ }
  }

  // ─── Looping ambient ───
  startLoop(name) {
    if (!this.ready || !this.buffers[name] || this.loopingSources[name]) return;
    const def = SOUNDS[name];
    try {
      this.resume();
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[name];
      source.loop = true;

      // Fade in
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(def.volume, this.ctx.currentTime + 2.0);

      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(0);
      this.loopingSources[name] = { source, gain };
    } catch (e) { /* ignore */ }
  }

  stopLoop(name) {
    if (!this.loopingSources[name]) return;
    try {
      const { source, gain } = this.loopingSources[name];
      // Fade out instead of abrupt stop
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
      setTimeout(() => {
        try { source.stop(); } catch (e) { /* ignore */ }
      }, 1600);
    } catch (e) { /* ignore */ }
    delete this.loopingSources[name];
  }

  // ─── Context-appropriate combat sounds ───
  playCombat(unitType, x, y, mapCenterX = 600, mapCenterY = 450) {
    const dist = Math.hypot(x - mapCenterX, y - mapCenterY);
    const pan = (x - mapCenterX) / (mapCenterX || 1); // left/right panning

    if (unitType === 'cannon') {
      // Cannons: deep boom, varied pitch, random reverb amount
      // Alternate between shorter/longer booms
      const isClose = dist < 200;
      this._play('cannon', {
        distance: dist,
        rate: 0.7 + Math.random() * 0.5,          // wide pitch range 0.7-1.2
        volume: isClose ? 1.0 : 0.6 + Math.random() * 0.3,
        pan: pan * 0.7,
        offset: Math.random() * 0.3,                // slight offset variation
        duration: 1.0 + Math.random() * 1.0,        // 1-2s
      });

    } else if (unitType === 'cavalry') {
      // Cavalry: hoofbeats with varied rhythm
      this._play('gallop', {
        distance: dist,
        rate: 0.8 + Math.random() * 0.4,           // 0.8-1.2
        volume: 0.5 + Math.random() * 0.4,
        pan: pan * 0.8,
        offset: Math.random() * 2.0,                // different part of the gallop
        duration: 1.5 + Math.random() * 2.0,        // 1.5-3.5s
      });

    } else {
      // Infantry musket: alternate between volley sample and single shots
      this.volleyCounter++;
      const volley = this.volleyCounter % 5;

      if (volley < 3) {
        // Musket volley — the main infantry sound, coordinated line fire
        this._play('musketVolley', {
          distance: dist,
          rate: 0.85 + Math.random() * 0.3,
          volume: 0.5 + Math.random() * 0.4,
          pan: pan * 0.6,
          offset: Math.random() * 1.0,
          duration: 1.0 + Math.random() * 1.5,
        });
      } else if (volley < 4) {
        // Single crack — sporadic fire between volleys
        this._play('musket', {
          distance: dist,
          rate: 0.75 + Math.random() * 0.5,
          volume: 0.3 + Math.random() * 0.3,
          pan: pan * 0.6,
          offset: Math.random() * 1.5,
          duration: 0.3 + Math.random() * 0.5,
        });
      } else {
        // Distant volley — quieter, more filtered
        this._play('musketVolley', {
          distance: dist + 200,
          rate: 0.7 + Math.random() * 0.3,
          volume: 0.2 + Math.random() * 0.2,
          pan: pan * 0.9,
          offset: Math.random() * 1.5,
          duration: 0.8 + Math.random() * 1.0,
        });
      }
    }
  }

  // ─── Melee (Close Combat) Synthesized Sounds ───
  playMelee(x, y, mapCenterX = 600, mapCenterY = 450) {
    if (!this.ready || !this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    
    // Throttle melee sounds so it's not deafening
    if (now - (this.lastPlayTime['melee'] || 0) < 0.2) return;
    this.lastPlayTime['melee'] = now;

    try {
      this.resume();
      const dist = Math.hypot(x - mapCenterX, y - mapCenterY);
      const pan = (x - mapCenterX) / (mapCenterX || 1);
      const distVol = Math.max(0.05, 1.0 - dist / 800);

      // Create a metallic "clack" / filtered noise burst
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // High frequency transient
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / this.ctx.sampleRate * 50);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.8 + Math.random() * 0.4;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 800; // metallic range
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.6 * distVol;
      gain.gain.setValueAtTime(0.6 * distVol, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);

      let output = gain;
      if (pan !== 0 && this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        gain.connect(panner);
        output = panner;
      }

      src.connect(filter);
      filter.connect(gain);
      output.connect(this.masterGain);
      src.start(now);
    } catch (e) { /* ignore */ }
  }

  // ─── Synthesized sounds for events without samples ───
  playMarchingFeet() {
    if (!this.ready || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / this.ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.15;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.08;
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 600;
      src.connect(lpf);
      lpf.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);
    } catch (e) { /* ignore */ }
  }

  playVictory() {
    this._play('fanfare', { distance: 0, rate: 1.0, volume: 1.0, duration: 0 });
  }

  // ─── Update combat intensity (call each frame) ───
  updateIntensity(engagedCount, totalCount) {
    const target = totalCount > 0 ? engagedCount / totalCount : 0;
    this.combatIntensity += (target - this.combatIntensity) * 0.05;

    // Adjust drum volume based on intensity
    if (this.loopingSources.drums) {
      const targetVol = 0.05 + this.combatIntensity * 0.15;
      this.loopingSources.drums.gain.gain.linearRampToValueAtTime(
        targetVol, this.ctx.currentTime + 0.5
      );
    }
  }
}

export const soundManager = new SoundManager();
