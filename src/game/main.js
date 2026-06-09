// ============ PINK SIGNAL — game orchestrator ============
import './style.css';
import { World } from './world.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';
import {
  Settings, loadSettings, State, hasSave, saveGame, loadGame, newGame,
  addEvidence, getFlag,
} from './state.js';
import {
  CHARACTERS, INTRO_ORDER, OPENING_SCENE, ENDINGS, EVIDENCE_DEFS, MISSION_META,
} from './data.js';
import { MISSIONS, MissionFail } from './missions.js';

class Game {
  constructor() {
    loadSettings();
    this.audio = new AudioManager();
    this.ui = new UI(this.audio);
    this.world = new World(document.getElementById('scene-container'));
    this.mode = 'loading'; // loading | menu | intro | cutscene | gameplay | ending
    this.ctrl = null;
    this.missionIdx = -1;
    this.susVisible = false;
    this.expectUnlock = false;
    this._linesSkip = false;
    this._phoneWaiter = null;
    this._musicStarted = false;
    this._paused = false;

    this._wireUI();
    this._wireInput();
    this._wireWorld();
    this._boot();
  }

  // ---------------------------------------------------------------- boot
  async _boot() {
    // give fonts/textures a beat, then open menu
    await new Promise(r => setTimeout(r, 1400));
    this.ui.hideScreen('screen-loading');
    await this.ui.fadeFromBlack(800);
    this._toMenu();
  }

  _toMenu() {
    this.abortMission();
    this.mode = 'menu';
    this._paused = false;
    this.world.releaseLock();
    this.audio.stopAllAmbience();
    this.ui.hideAllScreens();
    this.ui.showHUD(false);
    this.ui.hideDialogue();
    this.ui.letterbox(false);
    this.ui.showSkip(false);
    this.ui.subtitle(null);
    this.ui.closePhone();
    this.ui.showFocus(false);
    this.ui.renderMenu(hasSave());
    this.ui.showScreen('screen-menu');
    if (this._musicStarted) this.audio.playMusic('menu');
  }

  // ---------------------------------------------------------------- wiring
  _wireUI() {
    const ui = this.ui;
    ui.handlers.onMenu = (id) => {
      this._ensureMusic();
      if (id === 'start') this._startNewGame();
      else if (id === 'continue') this._continueGame();
      else if (id === 'missions') {
        ui.hideScreen('screen-menu');
        ui.renderMissions(State.unlocked);
        ui.showScreen('screen-missions');
      } else if (id === 'settings') {
        ui.hideScreen('screen-menu');
        ui.renderSettings();
        this._settingsFrom = 'menu';
        ui.showScreen('screen-settings');
      } else if (id === 'credits') {
        ui.hideScreen('screen-menu');
        ui.showScreen('screen-credits');
      }
    };
    ui.handlers.onSettingsBack = () => {
      ui.hideScreen('screen-settings');
      if (this._settingsFrom === 'pause') { ui.showScreen('screen-pause'); }
      else ui.showScreen('screen-menu');
    };
    ui.handlers.onSettingChanged = () => {
      this.audio.setMusicVolume(Settings.musicVol);
      this.world.applyQuality(Settings.quality);
    };
    ui.handlers.onCreditsBack = () => {
      ui.hideScreen('screen-credits');
      if (this.mode === 'menu') ui.showScreen('screen-menu');
      else this._toMenu();
    };
    ui.handlers.onMissionsBack = () => {
      ui.hideScreen('screen-missions');
      ui.showScreen('screen-menu');
    };
    ui.handlers.onMissionSelect = (i) => {
      ui.hideScreen('screen-missions');
      this.startMission(i);
    };
    ui.handlers.onSkip = () => {
      this._linesSkip = true;
      this.audio.cancelSpeech();
      ui.forceLine();
    };
    ui.handlers.onFocus = () => {
      ui.showFocus(false);
      this.world.requestLock();
    };
    ui.handlers.onPauseAction = (act) => {
      if (act === 'resume') this._closePause(true);
      else if (act === 'restart') { this._closePause(false); this.startMission(this.missionIdx); }
      else if (act === 'settings') {
        ui.hideScreen('screen-pause');
        this._settingsFrom = 'pause';
        ui.renderSettings();
        ui.showScreen('screen-settings');
      } else if (act === 'quit') this._toMenu();
    };
  }

  _wireInput() {
    window.addEventListener('keydown', (e) => {
      this.world.keys[e.code] = true;
      if (e.code === 'Tab') { e.preventDefault(); this._togglePhone(); return; }
      if (e.code === 'Escape') {
        if (this.mode === 'gameplay' || this.mode === 'cutscene') {
          if (this._paused) this._closePause(true);
          else if (!this.world.locked) this._openPause();
        }
        return;
      }
      // choices via number keys
      if (this.ui.choiceResolver && e.code.startsWith('Digit')) {
        const n = +e.code.slice(5) - 1;
        this.ui.choiceResolver(n);
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        if (this.ui.dialogueResolver) { this.ui.advanceDialogue(); return; }
        if (this.mode === 'gameplay' && !this._paused && !this.ui.phoneOpen) {
          this.world.tryInteract();
        }
      }
    });
    window.addEventListener('keyup', (e) => { this.world.keys[e.code] = false; });
    // click advances dialogue when pointer-locked; otherwise canvas click refocuses
    this.world.renderer.domElement.addEventListener('click', () => {
      if (this.ui.dialogueResolver) { this.ui.advanceDialogue(); return; }
    });
    document.addEventListener('pointerdown', () => this._ensureMusic(), { once: false });
  }

  _ensureMusic() {
    this.audio.ensure();
    if (!this._musicStarted) {
      this._musicStarted = true;
      if (this.mode === 'menu') this.audio.playMusic('menu');
    }
  }

  _wireWorld() {
    const w = this.world;
    w.onSuspicion = (v) => this.ui.suspicion(v, this.susVisible);
    w.onBusted = () => this._failMission('You were exposed. The Circle does not forgive twice.');
    w.onLockChange = (locked) => {
      if (!locked && this.mode === 'gameplay' && !this._paused &&
          !this.ui.phoneOpen && !this.expectUnlock && !this.ui.choiceResolver) {
        this._openPause();
      }
      this.expectUnlock = false;
    };
    w.onStep = () => { /* subtle footstep */ };
    w.onTick = () => {
      // interact prompt
      if (this.mode === 'gameplay' && !this._paused && !this.ui.phoneOpen && !this.ui.dialogueResolver) {
        const it = w.nearestInteractable();
        this.ui.interactPrompt(it && it.resolver ? it.label : null);
      } else this.ui.interactPrompt(null);
      // focus overlay
      const needFocus = this.mode === 'gameplay' && !this._paused && !w.locked &&
        !this.ui.phoneOpen && !this.ui.choiceResolver && !this.ui.dialogueResolver &&
        document.getElementById('screen-titlecard').classList.contains('hidden') &&
        document.getElementById('screen-settings').classList.contains('hidden') &&
        document.getElementById('screen-ending').classList.contains('hidden');
      this.ui.showFocus(needFocus);
    };
  }

  // ---------------------------------------------------------------- pause
  _openPause() {
    if (this._paused || this.mode === 'menu' || this.mode === 'ending') return;
    this._paused = true;
    this.world.player.moveEnabled = false;
    this.ui.renderPauseObjectives();
    this.ui.showScreen('screen-pause');
  }
  _closePause(relock) {
    this._paused = false;
    this.ui.hideScreen('screen-pause');
    if (this.mode === 'gameplay') {
      this.world.player.moveEnabled = true;
      if (relock) this.world.requestLock();
    }
  }

  // ---------------------------------------------------------------- phone
  _togglePhone() {
    if (this.mode !== 'gameplay' && this.mode !== 'cutscene') return;
    if (this._paused) return;
    const ui = this.ui;
    if (ui.phoneOpen) {
      ui.closePhone();
      if (this.mode === 'gameplay') {
        this.world.player.moveEnabled = true;
        this.world.requestLock();
      }
    } else {
      this.expectUnlock = true;
      this.world.releaseLock();
      this.world.player.moveEnabled = false;
      if (this._phoneWaiter) ui.activePhoneTab = this._phoneWaiter.tab || ui.activePhoneTab;
      ui.openPhone();
      if (this._phoneWaiter) {
        const r = this._phoneWaiter.resolve;
        this._phoneWaiter = null;
        r();
      }
    }
  }

  waitPhone(signal, tab) {
    return new Promise((resolve, reject) => {
      this._phoneWaiter = { resolve, tab };
      this.ui.phoneNotif(true);
      if (signal) signal.addEventListener('abort', () => {
        this._phoneWaiter = null;
        reject(new DOMException('aborted', 'AbortError'));
      }, { once: true });
    });
  }

  // ---------------------------------------------------------------- helpers for missions
  obj(text) {
    this.ui.setObjective(text);
  }

  checkAbort() {
    if (this.ctrl && this.ctrl.signal.aborted) throw new DOMException('aborted', 'AbortError');
  }

  async lines(arr) {
    const ui = this.ui;
    ui.showSkip(true);
    for (const [who, text, opts] of arr) {
      this.checkAbort();
      if (this._linesSkip) break;
      await ui.showLine(who, text, opts || {});
    }
    this._linesSkip = false;
    ui.hideDialogue();
    ui.showSkip(false);
    this.checkAbort();
  }

  async choices(arr) {
    this.checkAbort();
    this.expectUnlock = true;
    this.world.releaseLock();
    this.world.player.moveEnabled = false;
    const i = await this.ui.showChoices(arr);
    this.checkAbort();
    if (this.mode === 'gameplay') {
      this.world.player.moveEnabled = true;
      this.world.requestLock();
    }
    return i;
  }

  collect(id) {
    if (addEvidence(id)) {
      const d = EVIDENCE_DEFS[id];
      this.ui.notify('EVIDENCE SECURED', d ? d.name : id, true);
      this.ui.evidenceCount(State.evidence.length);
    }
  }

  countdown(sec, signal) {
    let remaining = sec;
    let stopped = false;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
    this.ui.timer(fmt(remaining));
    let resExp;
    const expired = new Promise(r => { resExp = r; });
    const iv = setInterval(() => {
      if (stopped) return;
      remaining--;
      this.ui.timer(fmt(remaining));
      if (remaining <= 10) this.audio.sfx('click');
      if (remaining <= 0) { stop(); resExp(); }
    }, 1000);
    const stop = () => { stopped = true; clearInterval(iv); this.ui.timer(null); };
    if (signal) signal.addEventListener('abort', stop, { once: true });
    return { expired, stop };
  }

  suspicionHUD(on) {
    this.susVisible = on;
    this.ui.suspicion(this.world.suspicion, on);
    if (!on) this.ui.alertVignette(false);
  }

  addCharNPC(charId, x, z, rot = 0, { name } = {}) {
    const c = CHARACTERS[charId];
    const npc = this.world.addNPC('npc_' + charId, c.look || {}, x, z, rot, {
      name: name === undefined ? c.short : name,
      sway: true, facePlayer: true,
    });
    this.world.addInteractable('npc_' + charId, npc.group, ` Talk to ${c.short || c.name}`, { radius: 2.6 });
    return npc;
  }

  // ---------------------------------------------------------------- game flows
  async _startNewGame() {
    newGame();
    this.ui.hideAllScreens();
    this.audio.stopMusic();
    this.mode = 'intro';
    await this.ui.fadeToBlack(700);
    await this.ui.fadeFromBlack(400);
    // character introductions — Netflix style
    this.audio.playMusic('sad');
    if (!Settings.skipCutscenes) {
      await this.ui.charIntro(INTRO_ORDER);
    }
    State.seenIntro = true;
    saveGame();
    await this._playOpening();
    this.startMission(0);
  }

  _continueGame() {
    loadGame();
    const idx = Math.min(State.missionIndex, 9);
    this.startMission(idx);
  }

  // -------- opening cinematic in the apartment --------
  async _playOpening() {
    const { world, ui, audio } = this;
    this.mode = 'cutscene';
    ui.hideAllScreens();
    await ui.fadeToBlack(600);
    world.loadLocation('apartment');
    world.teleport(0.4, 0.8, 0);
    // Mirza near the window
    const mirza = this.addCharNPC('mirza', 1.1, -4.1, Math.PI * 0.9, { name: null });
    mirza.facePlayer = false;
    world.setCinematicLook(true, 0, 0);
    world.player.moveEnabled = false;
    ui.letterbox(true);
    ui.showHUD(false);
    audio.playMusic('tension');
    audio.rain(true);
    await ui.fadeFromBlack(1600);

    if (Settings.skipCutscenes) this._linesSkip = true;
    ui.showSkip(true);
    for (const line of OPENING_SCENE) {
      if (this._linesSkip) break;
      // staged actions
      if (line.action === 'lookBag') world.lookTowards(-1.4, 0.7, -2.4);
      if (line.action === 'mirzaTurn') { mirza.facePlayer = true; world.lookTowards(1.1, 1.5, -4.1); }
      if (line.action === 'sirens') {
        audio.siren(true);
        world.policeFlash(0, 2, -7.5, 8);
      }
      if (line.action === 'knock') audio.sfx('knock');
      if (line.action === 'heartbeat') audio.heartbeat(true);
      if (line.who !== 'narrator' && !line.action) {
        if (line.who === 'mirza') world.lookTowards(1.1, 1.5, -4.1);
      }
      await ui.showLine(line.who, line.text);
    }
    this._linesSkip = false;
    ui.hideDialogue();
    ui.showSkip(false);
    // wrap up effects
    await ui.fadeToBlack(1200);
    audio.heartbeat(false);
    audio.siren(false);
    audio.rain(false);
    ui.letterbox(false);
    world.setCinematicLook(false);
  }

  // -------- mission lifecycle --------
  abortMission() {
    if (this.ctrl) { this.ctrl.abort(); this.ctrl = null; }
    this.audio.cancelSpeech();
    this.ui.hideDialogue();
    this.ui.timer(null);
  }

  async startMission(i) {
    this.abortMission();
    const ctrl = new AbortController();
    this.ctrl = ctrl;
    this.missionIdx = i;
    State.missionIndex = i;
    State.unlocked = Math.max(State.unlocked, i);
    saveGame();

    const ui = this.ui, world = this.world, audio = this.audio;
    const meta = MISSION_META[i];
    const mission = MISSIONS[i];

    this.mode = 'cutscene';
    this._paused = false;
    ui.hideAllScreens();
    ui.showHUD(false);
    ui.resetObjectives();
    ui.log = [];
    audio.stopAllAmbience();
    await ui.fadeToBlack(700);

    const act = await ui.titleCard(`Mission ${i + 1}`, meta.title, meta.location);
    if (act === 'skip') this._linesSkip = true;

    // build the level while black
    world.loadLocation(mission.loc);
    const ctx = { game: this, world, ui, audio, signal: ctrl.signal };
    mission.setup(ctx);
    if (mission.music) audio.playMusic(mission.music);
    else audio.stopMusic();

    this.mode = 'gameplay';
    world.player.moveEnabled = true;
    world.player.lookEnabled = true;
    ui.showHUD(true);
    ui.evidenceCount(State.evidence.length);
    this.suspicionHUD(false);
    await ui.fadeFromBlack(1300);

    try {
      const ending = await mission.run(ctx);
      if (ctrl.signal.aborted) return;
      // mission complete
      State.missionIndex = i + 1;
      State.unlocked = Math.max(State.unlocked, Math.min(i + 1, 9));
      saveGame();
      if (i === 9) {
        await this._showEnding(ending || 'dark');
      } else {
        ui.notify('MISSION COMPLETE', meta.title, true);
        await world.wait(1.6, ctrl.signal).catch(() => {});
        this.startMission(i + 1);
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      if (e instanceof MissionFail) {
        this._restartAfterFail(e.message);
        return;
      }
      console.error(e);
      ui.notify('ERROR', 'Something went wrong — restarting mission.');
      this._restartAfterFail('An unexpected turn. Try again.');
    }
  }

  _failMission(msg) {
    if (this.mode !== 'gameplay') return;
    this._restartAfterFail(msg);
  }

  async _restartAfterFail(msg) {
    const idx = this.missionIdx;
    this.abortMission();
    this.audio.sfx('fail');
    this.audio.stopAllAmbience();
    this.ui.notify('COMPROMISED', msg);
    this.ui.alertVignette(true);
    await this.ui.fadeToBlack(1500);
    this.ui.alertVignette(false);
    this.startMission(idx);
  }

  async _showEnding(key) {
    const ending = ENDINGS[key];
    State.endingSeen = key;
    State.missionIndex = 10;
    saveGame();
    this.mode = 'ending';
    this.world.releaseLock();
    this.ui.showHUD(false);
    this.audio.stopAllAmbience();
    await this.ui.fadeToBlack(1800);
    this.audio.playMusic(key === 'good' ? 'sad' : key === 'power' ? 'tension' : 'sad');
    const endPromise = this.ui.showEnding(ending);
    await this.ui.fadeFromBlack(1500);
    // speak the final quote
    this.audio.speak(key === 'escape' ? 'unknown' : 'zara', ending.quote);
    const act = await endPromise;
    if (act === 'credits') {
      this.ui.showScreen('screen-credits');
      this.mode = 'ending';
    } else {
      this._toMenu();
    }
  }
}

// expose helpers to missions through ctx.game
Game.prototype.waitPhoneOpen = Game.prototype.waitPhone;

window.addEventListener('DOMContentLoaded', () => {
  window.__pinkSignal = new Game();
});
