// ============ PINK SIGNAL — game state & persistence ============
import { PHONE_SEED, EVIDENCE_DEFS } from './data.js';

const SETTINGS_KEY = 'pinksignal_settings_v1';
const SAVE_KEY = 'pinksignal_save_v1';

export const Settings = {
  voice: true,
  subtitles: true,
  musicVol: 0.65,
  dialogueVol: 1.0,
  quality: 'high', // low | medium | high
  skipCutscenes: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(Settings, JSON.parse(raw));
  } catch (e) { /* corrupted settings are ignored */ }
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); } catch (e) { /* storage full */ }
}

function freshState() {
  return {
    missionIndex: 0,        // next mission to play, 0-based (0..9); 10 = story complete
    unlocked: 0,            // highest mission unlocked (0-based)
    seenIntro: false,
    humanity: 0,
    pressure: 0,
    mahnoorTrust: 0,
    mirzaTrust: 0,
    flags: {},
    evidence: [],
    phone: JSON.parse(JSON.stringify(PHONE_SEED)),
    endingSeen: null,
  };
}

export let State = freshState();

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
export function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(State)); } catch (e) { /* storage full */ }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      State = Object.assign(freshState(), data);
      return true;
    }
  } catch (e) { /* corrupted save */ }
  return false;
}
export function newGame() {
  State = freshState();
  saveGame();
}

export function setFlag(key, val = true) { State.flags[key] = val; }
export function getFlag(key) { return !!State.flags[key]; }

export function addEvidence(id) {
  if (State.evidence.includes(id)) return false;
  State.evidence.push(id);
  const def = EVIDENCE_DEFS[id];
  if (def) {
    State.phone.gallery.push({ from: 'EVIDENCE — ' + def.name, time: 'now', body: def.desc, evidence: true });
  }
  saveGame();
  return true;
}
export function hasEvidence(id) { return State.evidence.includes(id); }

export function phoneAdd(tab, item) {
  if (!State.phone[tab]) State.phone[tab] = [];
  State.phone[tab].push(item);
  saveGame();
}
