// ============ PINK SIGNAL — procedural audio: music, ambience, sfx, voice ============
import { Settings } from './state.js';
import { CHARACTERS } from './data.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.ambBus = null;
    this.mood = null;
    this.seq = null;       // sequencer interval
    this.musicNodes = [];
    this.rainNode = null;
    this.crowdNode = null;
    this.heartbeatTimer = null;
    this.sirenNodes = null;
    this.voices = [];
    this.currentUtterance = null;
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices(); };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = Settings.musicVol;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);
    this.ambBus = this.ctx.createGain();
    this.ambBus.gain.value = Settings.musicVol;
    this.ambBus.connect(this.master);
    this._noiseBuffer = this._makeNoise();
  }

  setMusicVolume(v) {
    if (this.musicBus) this.musicBus.gain.value = v;
    if (this.ambBus) this.ambBus.gain.value = v;
  }

  _makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------------- MUSIC ----------------
  playMusic(mood) {
    this.ensure();
    if (this.mood === mood) return;
    this.stopMusic();
    this.mood = mood;
    const ctx = this.ctx;
    const out = this.ctx.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
    out.connect(this.musicBus);
    this._musicOut = out;

    // dark drone foundation (all moods)
    const droneFreqs = mood === 'party' ? [55, 110] : [41.2, 82.4]; // A1/A2 vs E1/E2
    droneFreqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.16 : 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.03;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.02;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      o.connect(g); g.connect(out);
      o.start(); lfo.start();
      this.musicNodes.push(o, lfo);
    });

    // tense high shimmer
    if (mood !== 'party') {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = mood === 'sad' ? 329.6 : 246.9;
      const o2 = ctx.createOscillator();
      o2.type = 'sine'; o2.frequency.value = o.frequency.value * 1.005; // beating
      const g = ctx.createGain(); g.gain.value = 0.012;
      o.connect(g); o2.connect(g); g.connect(out);
      o.start(); o2.start();
      this.musicNodes.push(o, o2);
    }

    // sequenced layer
    const minor = [0, 3, 5, 7, 10]; // minor pentatonic-ish
    const base = mood === 'sad' ? 220 : 110;
    let step = 0;
    const bpm = mood === 'party' ? 104 : mood === 'tension' ? 60 : 46;
    const stepDur = 60 / bpm / 2;
    this.seq = setInterval(() => {
      if (!this.ctx || this.mood !== mood) return;
      const t = ctx.currentTime + 0.08;
      step++;
      if (mood === 'party') {
        // kick
        if (step % 2 === 0) this._kick(t);
        if (step % 4 === 2) this._hat(t);
        if (step % 8 === 0) {
          const n = base * Math.pow(2, minor[Math.floor(Math.random() * 3)] / 12);
          this._bassPluck(t, n, out);
        }
      } else {
        if (step % 8 === 0) {
          const n = base * Math.pow(2, minor[Math.floor(Math.random() * minor.length)] / 12) / 2;
          this._pad(t, n, out, mood === 'sad' ? 5 : 3.2);
        }
        if (mood === 'tension' && step % 16 === 7) {
          this._stab(t, 466.16, out); // dissonant Bb stab
        }
      }
    }, stepDur * 1000);
  }

  _kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(this._musicOut);
    o.start(t); o.stop(t + 0.25);
  }
  _hat(t) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this._noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(this._musicOut);
    s.start(t); s.stop(t + 0.06);
  }
  _bassPluck(t, freq, out) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.55);
  }
  _pad(t, freq, out, dur) {
    const ctx = this.ctx;
    [freq, freq * 1.498, freq * 1.189].forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = fr;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035 / (i + 1), t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }
  _stab(t, freq, out) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); o.stop(t + 2.5);
  }

  stopMusic() {
    if (this.seq) { clearInterval(this.seq); this.seq = null; }
    if (this._musicOut) {
      const out = this._musicOut;
      try {
        out.gain.cancelScheduledValues(this.ctx.currentTime);
        out.gain.setValueAtTime(out.gain.value, this.ctx.currentTime);
        out.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.2);
      } catch (e) { /* node already gone */ }
      const nodes = this.musicNodes;
      setTimeout(() => {
        nodes.forEach(n => { try { n.stop(); } catch (e) { /* */ } });
        try { out.disconnect(); } catch (e) { /* */ }
      }, 1400);
    }
    this.musicNodes = [];
    this._musicOut = null;
    this.mood = null;
  }

  // ---------------- AMBIENCE ----------------
  rain(on, intensity = 1) {
    this.ensure();
    if (on && !this.rainNode) {
      const s = this.ctx.createBufferSource();
      s.buffer = this._noiseBuffer; s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.35;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.05 * intensity, this.ctx.currentTime + 2);
      s.connect(f); f.connect(g); g.connect(this.ambBus);
      s.start();
      this.rainNode = { s, g };
    } else if (!on && this.rainNode) {
      const { s, g } = this.rainNode;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.2);
      setTimeout(() => { try { s.stop(); } catch (e) { /* */ } }, 1400);
      this.rainNode = null;
    }
  }

  crowd(on) {
    this.ensure();
    if (on && !this.crowdNode) {
      const s = this.ctx.createBufferSource();
      s.buffer = this._noiseBuffer; s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 1.4;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 2);
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.4;
      const lg = this.ctx.createGain(); lg.gain.value = 0.012;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      s.connect(f); f.connect(g); g.connect(this.ambBus);
      s.start();
      this.crowdNode = { s, g, lfo };
    } else if (!on && this.crowdNode) {
      const { s, g, lfo } = this.crowdNode;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
      setTimeout(() => { try { s.stop(); lfo.stop(); } catch (e) { /* */ } }, 1200);
      this.crowdNode = null;
    }
  }

  heartbeat(on) {
    this.ensure();
    if (on && !this.heartbeatTimer) {
      const beat = () => {
        const t = this.ctx.currentTime;
        [0, 0.28].forEach((off, i) => {
          const o = this.ctx.createOscillator();
          o.frequency.value = i === 0 ? 58 : 46;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.linearRampToValueAtTime(i === 0 ? 0.35 : 0.22, t + off + 0.025);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.22);
          o.connect(g); g.connect(this.sfxBus);
          o.start(t + off); o.stop(t + off + 0.3);
        });
      };
      beat();
      this.heartbeatTimer = setInterval(beat, 950);
    } else if (!on && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  siren(on) {
    this.ensure();
    if (on && !this.sirenNodes) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      const lfo = this.ctx.createOscillator();
      lfo.type = 'square'; lfo.frequency.value = 0.65;
      const lg = this.ctx.createGain(); lg.gain.value = 110;
      o.frequency.value = 660;
      lfo.connect(lg); lg.connect(o.frequency);
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.022, this.ctx.currentTime + 1.5);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1800;
      o.connect(f); f.connect(g); g.connect(this.ambBus);
      o.start(); lfo.start();
      this.sirenNodes = { o, lfo, g };
    } else if (!on && this.sirenNodes) {
      const { o, lfo, g } = this.sirenNodes;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
      setTimeout(() => { try { o.stop(); lfo.stop(); } catch (e) { /* */ } }, 1700);
      this.sirenNodes = null;
    }
  }

  // ---------------- SFX ----------------
  sfx(name) {
    this.ensure();
    const ctx = this.ctx, t = ctx.currentTime;
    const env = (o, peak, dur, dest = this.sfxBus) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
    };
    switch (name) {
      case 'click': {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1400;
        env(o, 0.08, 0.07); break;
      }
      case 'hover': {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 900;
        env(o, 0.03, 0.05); break;
      }
      case 'objective': {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(740, t); o.frequency.setValueAtTime(988, t + 0.1);
        env(o, 0.09, 0.35); break;
      }
      case 'pickup': {
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1040, t + 0.12);
        env(o, 0.12, 0.3); break;
      }
      case 'phone': {
        [0, 0.18].forEach(off => {
          const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 190;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.linearRampToValueAtTime(0.05, t + off + 0.01);
          g.gain.linearRampToValueAtTime(0.0001, t + off + 0.12);
          o.connect(g); g.connect(this.sfxBus);
          o.start(t + off); o.stop(t + off + 0.15);
        });
        break;
      }
      case 'camera': {
        const s = ctx.createBufferSource(); s.buffer = this._noiseBuffer;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        s.connect(f); f.connect(g); g.connect(this.sfxBus);
        s.start(t); s.stop(t + 0.1); break;
      }
      case 'knock': {
        [0, 0.22, 0.44].forEach(off => {
          const o = ctx.createOscillator(); o.frequency.value = 95;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.linearRampToValueAtTime(0.4, t + off + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.14);
          o.connect(g); g.connect(this.sfxBus);
          o.start(t + off); o.stop(t + off + 0.18);
        });
        break;
      }
      case 'door': {
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(70, t + 0.3);
        env(o, 0.14, 0.4); break;
      }
      case 'elevator': {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(880, t + 0.22);
        env(o, 0.07, 0.6); break;
      }
      case 'alarm': {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 880;
        const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 5;
        const lg = ctx.createGain(); lg.gain.value = 200;
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 1);
        env(o, 0.04, 1); break;
      }
      case 'type': {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2200 + Math.random() * 600;
        env(o, 0.012, 0.025); break;
      }
      case 'upload': {
        for (let i = 0; i < 6; i++) {
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.value = 600 + i * 140;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + i * 0.12);
          g.gain.linearRampToValueAtTime(0.05, t + i * 0.12 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.1);
          o.connect(g); g.connect(this.sfxBus);
          o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.12);
        }
        break;
      }
      case 'fail': {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.8);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(f); f.connect(g); g.connect(this.sfxBus);
        o.start(t); o.stop(t + 1); break;
      }
    }
  }

  // ---------------- VOICE ----------------
  _pickVoice(gender) {
    const vs = this.voices.filter(v => v.lang.startsWith('en'));
    if (!vs.length) return null;
    const female = vs.filter(v => /female|zira|aria|jenny|sonia|neerja|heera|libby|maisie/i.test(v.name));
    const male = vs.filter(v => /male|david|guy|ryan|mark|prabhat|ravi|thomas|william/i.test(v.name));
    if (gender === 'f' && female.length) return female[0];
    if (gender === 'm' && male.length) return male[0];
    return vs[0];
  }

  speak(charId, text) {
    return new Promise(resolve => {
      if (!Settings.voice || !('speechSynthesis' in window)) { resolve(false); return; }
      this.cancelSpeech();
      const c = CHARACTERS[charId] || CHARACTERS.narrator;
      const clean = text.replace(/["“”]/g, '');
      const u = new SpeechSynthesisUtterance(clean);
      const v = this._pickVoice(c.voice ? c.voice.gender : 'm');
      if (v) u.voice = v;
      u.pitch = c.voice ? c.voice.pitch : 1;
      u.rate = c.voice ? c.voice.rate : 1;
      u.volume = Settings.dialogueVol;
      let done = false;
      const finish = () => { if (!done) { done = true; this.currentUtterance = null; resolve(true); } };
      u.onend = finish;
      u.onerror = finish;
      // safety timeout in case the engine stalls
      setTimeout(finish, Math.min(20000, 1800 + clean.length * 90));
      this.currentUtterance = u;
      speechSynthesis.speak(u);
    });
  }

  cancelSpeech() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.currentUtterance = null;
  }

  stopAllAmbience() {
    this.rain(false); this.crowd(false); this.heartbeat(false); this.siren(false);
  }
}
