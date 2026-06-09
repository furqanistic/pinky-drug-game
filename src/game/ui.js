// ============ PINK SIGNAL — DOM UI layer ============
import { Settings, saveSettings, State } from './state.js';
import { CHARACTERS, EVIDENCE_DEFS, MISSION_META, CREDITS } from './data.js';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class UI {
  constructor(audio) {
    this.audio = audio;
    this.root = document.getElementById('ui-root');
    this.handlers = {};        // set by Game
    this.dialogueResolver = null;
    this.dialogueSkipTyping = null;
    this.choiceResolver = null;
    this.typingTimer = null;
    this.log = [];             // dialogue transcript for current mission
    this._build();
  }

  // ---------------------------------------------------------------- build
  _build() {
    const r = this.root;
    r.innerHTML = '';

    // fade overlay
    this.fadeEl = el('div', '', '');
    this.fadeEl.id = 'fade-overlay';
    // vignette
    r.appendChild(el('div')).id = 'vignette';
    this.alertVin = r.appendChild(el('div'));
    this.alertVin.id = 'alert-vignette';

    // letterbox
    this.lbTop = el('div', 'letterbox'); this.lbTop.id = 'letterbox-top';
    this.lbBot = el('div', 'letterbox'); this.lbBot.id = 'letterbox-bottom';
    r.appendChild(this.lbTop); r.appendChild(this.lbBot);

    // ------- HUD -------
    this.hud = el('div', 'hidden'); this.hud.id = 'hud';
    this.hud.innerHTML = `
      <div id="hud-objective" class="hidden">
        <div class="obj-label">Objective</div>
        <div class="obj-text"></div>
      </div>
      <div id="hud-suspicion" class="hidden">
        <div class="sus-label"><span class="eye">◉ Suspicion</span><span class="sus-pct">0%</span></div>
        <div class="sus-track"><div class="sus-fill"></div></div>
      </div>
      <div id="hud-evidence" class="hidden">Evidence <b>0</b></div>
      <div id="crosshair"></div>
      <div id="hud-hint"><b>W A S D</b> move &nbsp; <b>Shift</b> run &nbsp; <b>E</b> interact &nbsp; <b>Tab</b> phone &nbsp; <b>Esc</b> pause</div>
      <div id="timer-display" class="hidden"></div>
      <div id="notify-stack"></div>
    `;
    r.appendChild(this.hud);
    this.objBox = this.hud.querySelector('#hud-objective');
    this.objText = this.hud.querySelector('.obj-text');
    this.susBox = this.hud.querySelector('#hud-suspicion');
    this.susFill = this.hud.querySelector('.sus-fill');
    this.susPct = this.hud.querySelector('.sus-pct');
    this.evBox = this.hud.querySelector('#hud-evidence');
    this.timerEl = this.hud.querySelector('#timer-display');
    this.notifyStack = this.hud.querySelector('#notify-stack');

    // interact prompt
    this.prompt = el('div', 'hidden'); this.prompt.id = 'interact-prompt';
    r.appendChild(this.prompt);

    // phone notification chip
    this.phoneDot = el('div', 'hidden', `<span class="pd"></span> New activity — press Tab`);
    this.phoneDot.id = 'phone-notif-dot';
    r.appendChild(this.phoneDot);

    // ------- dialogue -------
    this.dlg = el('div', 'hidden'); this.dlg.id = 'dialogue-box';
    this.dlg.innerHTML = `
      <div id="dlg-portrait"></div>
      <div id="dlg-main">
        <div id="dlg-name"></div>
        <div id="dlg-text"></div>
        <div id="dlg-continue">E / Click — continue</div>
      </div>`;
    r.appendChild(this.dlg);
    this.dlgPortrait = this.dlg.querySelector('#dlg-portrait');
    this.dlgName = this.dlg.querySelector('#dlg-name');
    this.dlgText = this.dlg.querySelector('#dlg-text');
    this.dlg.addEventListener('click', () => this.advanceDialogue());

    this.choicesBox = el('div', 'hidden'); this.choicesBox.id = 'choices-box';
    r.appendChild(this.choicesBox);

    this.subtitleBar = el('div', 'hidden'); this.subtitleBar.id = 'subtitle-bar';
    r.appendChild(this.subtitleBar);

    this.skipBtn = el('button', 'hidden', 'Skip ▸'); this.skipBtn.id = 'skip-btn';
    r.appendChild(this.skipBtn);
    this.skipBtn.addEventListener('click', () => {
      this.audio.sfx('click');
      if (this.handlers.onSkip) this.handlers.onSkip();
    });

    // focus overlay
    this.focusOv = el('div', 'hidden', `
      <div class="f-inner">
        <div class="f-title">Click to Focus</div>
        <div class="f-sub">Mouse captured for first-person view</div>
      </div>`);
    this.focusOv.id = 'focus-overlay';
    r.appendChild(this.focusOv);
    this.focusOv.addEventListener('click', () => { if (this.handlers.onFocus) this.handlers.onFocus(); });

    // ------- phone -------
    this.phone = el('div'); this.phone.id = 'phone';
    this.phone.innerHTML = `
      <div id="phone-status"><span>PS-NET</span><span class="ph-clock">11:47 PM</span><span>▮▮▮</span></div>
      <div id="phone-header"><div class="ph-title">PINK SIGNAL</div></div>
      <div id="phone-tabs"></div>
      <div id="phone-content"></div>
      <div id="phone-close-hint">Tab — close</div>`;
    r.appendChild(this.phone);
    this.phoneTabs = this.phone.querySelector('#phone-tabs');
    this.phoneContent = this.phone.querySelector('#phone-content');
    this.phoneTabNames = [
      ['messages', 'Messages'], ['calls', 'Calls'], ['gallery', 'Evidence'],
      ['notes', 'Notes'], ['threats', 'Threats'], ['news', 'News'],
    ];
    this.activePhoneTab = 'messages';
    this.phoneTabNames.forEach(([id, label]) => {
      const b = el('button', '', label);
      b.addEventListener('click', () => { this.audio.sfx('click'); this.activePhoneTab = id; this.renderPhone(); });
      this.phoneTabs.appendChild(b);
    });

    // call overlay
    this.callOv = el('div', 'hidden'); this.callOv.id = 'call-overlay';
    r.appendChild(this.callOv);

    // ------- screens -------
    this._buildLoading();
    this._buildMenu();
    this._buildSettings();
    this._buildCredits();
    this._buildMissions();
    this._buildCharIntro();
    this._buildTitleCard();
    this._buildEnding();
    this._buildPause();

    r.appendChild(this.fadeEl);
  }

  _buildLoading() {
    const s = el('div', 'screen'); s.id = 'screen-loading';
    s.innerHTML = `<div class="sig"></div><div class="t">PINK SIGNAL</div>`;
    this.root.appendChild(s);
  }

  _buildMenu() {
    const s = el('div', 'screen hidden'); s.id = 'screen-menu';
    s.style.setProperty('--menu-bg', `url('${import.meta.env.BASE_URL}keyart_menu.png')`);
    s.innerHTML = `
      <div class="title-block">
        <div class="pre-title">A Fictional Crime Thriller</div>
        <h1>PINK<br/><span class="pink">SIGNAL</span></h1>
        <div class="tagline">“In this city, truth does not lose. It gets edited.”</div>
      </div>
      <nav></nav>
      <div class="disclaimer">PINK SIGNAL is a work of fiction. All characters, organizations, locations and events are fictional.
      Any resemblance to real persons, living or dead, or to real events, is unintentional. This story contains themes of crime,
      corruption and coercion presented in an abstract, cinematic form.</div>`;
    this.root.appendChild(s);
    this.menuNav = s.querySelector('nav');
  }

  renderMenu(hasSave) {
    this.menuNav.innerHTML = '';
    const items = [
      ['start', 'Start Game'],
      ['continue', 'Continue'],
      ['missions', 'Missions'],
      ['settings', 'Settings'],
      ['credits', 'Credits'],
    ];
    items.forEach(([id, label]) => {
      const b = el('button', 'ps-btn', label);
      if (id === 'continue' && !hasSave) b.disabled = true;
      b.addEventListener('mouseenter', () => this.audio.sfx('hover'));
      b.addEventListener('click', () => {
        this.audio.sfx('click');
        if (this.handlers.onMenu) this.handlers.onMenu(id);
      });
      this.menuNav.appendChild(b);
    });
  }

  _buildSettings() {
    const s = el('div', 'screen hidden'); s.id = 'screen-settings';
    s.innerHTML = `<div class="panel">
      <h2>SET<span class="pink">TINGS</span></h2>
      <div class="settings-rows"></div>
      <div class="back-row"><button class="ps-btn small" data-act="back">◂ Back</button></div>
    </div>`;
    this.root.appendChild(s);
    this.settingsRows = s.querySelector('.settings-rows');
    s.querySelector('[data-act=back]').addEventListener('click', () => {
      this.audio.sfx('click'); saveSettings();
      if (this.handlers.onSettingsBack) this.handlers.onSettingsBack();
    });
  }

  renderSettings() {
    const rows = this.settingsRows;
    rows.innerHTML = '';
    const toggle = (label, get, set, options = [['On', true], ['Off', false]]) => {
      const row = el('div', 'setting-row');
      row.appendChild(el('label', '', label));
      const t = el('div', 'toggle');
      options.forEach(([txt, val]) => {
        const b = el('button', get() === val ? 'on' : '', txt);
        b.addEventListener('click', () => {
          this.audio.sfx('click'); set(val); saveSettings(); this.renderSettings();
          if (this.handlers.onSettingChanged) this.handlers.onSettingChanged();
        });
        t.appendChild(b);
      });
      row.appendChild(t);
      rows.appendChild(row);
    };
    const slider = (label, get, set) => {
      const row = el('div', 'setting-row');
      row.appendChild(el('label', '', label));
      const i = document.createElement('input');
      i.type = 'range'; i.min = 0; i.max = 100; i.value = Math.round(get() * 100);
      i.addEventListener('input', () => {
        set(i.value / 100); saveSettings();
        if (this.handlers.onSettingChanged) this.handlers.onSettingChanged();
      });
      row.appendChild(i);
      rows.appendChild(row);
    };
    toggle('Voice Audio', () => Settings.voice, v => { Settings.voice = v; });
    toggle('Subtitles', () => Settings.subtitles, v => { Settings.subtitles = v; });
    slider('Music Volume', () => Settings.musicVol, v => { Settings.musicVol = v; });
    slider('Dialogue Volume', () => Settings.dialogueVol, v => { Settings.dialogueVol = v; });
    toggle('Graphics Quality', () => Settings.quality, v => { Settings.quality = v; },
      [['Low', 'low'], ['Medium', 'medium'], ['High', 'high']]);
    toggle('Skip Cutscenes', () => Settings.skipCutscenes, v => { Settings.skipCutscenes = v; });
  }

  _buildCredits() {
    const s = el('div', 'screen hidden'); s.id = 'screen-credits';
    let blocks = CREDITS.map(c => `
      <div class="credit-block">
        <div class="credit-role">${c.role}</div>
        <div class="credit-name ${c.name === 'PINK SIGNAL' ? 'pink' : ''}">${c.name}</div>
      </div>`).join('');
    s.innerHTML = `<div class="panel">${blocks}
      <div class="back-row" style="justify-content:center"><button class="ps-btn small" data-act="back">◂ Back</button></div></div>`;
    this.root.appendChild(s);
    s.querySelector('[data-act=back]').addEventListener('click', () => {
      this.audio.sfx('click');
      if (this.handlers.onCreditsBack) this.handlers.onCreditsBack();
    });
  }

  _buildMissions() {
    const s = el('div', 'screen hidden'); s.id = 'screen-missions';
    s.innerHTML = `<div class="panel">
      <h2>MIS<span class="pink">SIONS</span></h2>
      <div class="mission-list"></div>
      <div class="back-row"><button class="ps-btn small" data-act="back">◂ Back</button></div>
    </div>`;
    this.root.appendChild(s);
    this.missionList = s.querySelector('.mission-list');
    s.querySelector('[data-act=back]').addEventListener('click', () => {
      this.audio.sfx('click');
      if (this.handlers.onMissionsBack) this.handlers.onMissionsBack();
    });
  }

  renderMissions(unlocked) {
    this.missionList.innerHTML = '';
    MISSION_META.forEach((m, i) => {
      const locked = i > unlocked;
      const item = el('div', 'mission-item' + (locked ? ' locked' : ''), `
        <div class="num">${String(m.id).padStart(2, '0')}</div>
        <div><div class="mtitle">${m.title}</div><div class="mloc">${m.location}</div></div>
        ${locked ? '<div class="lock">LOCKED</div>' : ''}`);
      if (!locked) {
        item.addEventListener('click', () => {
          this.audio.sfx('click');
          if (this.handlers.onMissionSelect) this.handlers.onMissionSelect(i);
        });
      }
      this.missionList.appendChild(item);
    });
  }

  _buildCharIntro() {
    const s = el('div', 'screen hidden'); s.id = 'screen-charintro';
    s.innerHTML = `
      <div id="ci-img"></div>
      <div id="ci-grad"></div>
      <div id="ci-progress"></div>
      <div id="ci-text"></div>
      <div id="ci-controls">
        <button class="ps-btn small" data-act="next">Next ▸</button>
        <button class="ps-btn small" data-act="skipall">Skip Intro ▸▸</button>
      </div>`;
    this.root.appendChild(s);
    this.ciImg = s.querySelector('#ci-img');
    this.ciText = s.querySelector('#ci-text');
    this.ciProgress = s.querySelector('#ci-progress');
    s.querySelector('[data-act=next]').addEventListener('click', () => {
      this.audio.sfx('click');
      if (this._ciNext) this._ciNext();
    });
    s.querySelector('[data-act=skipall]').addEventListener('click', () => {
      this.audio.sfx('click');
      if (this._ciSkip) this._ciSkip();
    });
  }

  async charIntro(order) {
    this.showScreen('screen-charintro');
    this.ciProgress.innerHTML = order.map(() => `<div class="dot"></div>`).join('');
    const dots = [...this.ciProgress.children];
    let skipAll = false;
    this._ciSkip = () => { skipAll = true; if (this._ciNext) this._ciNext(); };
    for (let i = 0; i < order.length; i++) {
      if (skipAll) break;
      const c = CHARACTERS[order[i]];
      dots.forEach((d, j) => d.classList.toggle('active', j <= i));
      this.ciImg.style.backgroundImage = `url('${c.portrait}')`;
      this.ciImg.style.animation = 'none';
      void this.ciImg.offsetWidth; // restart ken burns
      this.ciImg.style.animation = '';
      this.ciText.innerHTML = `
        <div class="ci-index">Character ${i + 1} / ${order.length}</div>
        <h2>${c.name}</h2>
        <div class="ci-role">${c.role}</div>
        <div class="ci-desc">${c.desc}</div>
        <div class="ci-vo">“${c.vo}”</div>`;
      this.ciText.style.animation = 'none';
      void this.ciText.offsetWidth;
      this.ciText.style.animation = '';
      let advanced = false;
      const advance = new Promise(res => { this._ciNext = () => { if (!advanced) { advanced = true; res(); } }; });
      this.audio.speak('narrator', c.vo).then((spoke) => {
        // brief pause then auto-advance (longer if there was no voice-over)
        setTimeout(() => { if (this._ciNext) this._ciNext(); }, spoke ? 2200 : 9000);
      });
      await advance;
      this.audio.cancelSpeech();
    }
    this._ciNext = null; this._ciSkip = null;
    this.hideScreen('screen-charintro');
  }

  _buildTitleCard() {
    const s = el('div', 'screen hidden'); s.id = 'screen-titlecard';
    this.root.appendChild(s);
    this.titleCardEl = s;
  }

  titleCard(missionLabel, title, location, { showSkip = true } = {}) {
    return new Promise(resolve => {
      const s = this.titleCardEl;
      s.innerHTML = `
        <div class="tc-mission">${missionLabel}</div>
        <h2>${title}</h2>
        <div class="tc-loc">${location || ''}</div>
        <div class="tc-buttons">
          <button class="ps-btn" data-act="continue">Continue</button>
          ${showSkip ? '<button class="ps-btn" data-act="skip">Skip Cutscene</button>' : ''}
        </div>`;
      this.showScreen('screen-titlecard');
      s.querySelectorAll('button').forEach(b => {
        b.addEventListener('mouseenter', () => this.audio.sfx('hover'));
        b.addEventListener('click', () => {
          this.audio.sfx('click');
          this.hideScreen('screen-titlecard');
          resolve(b.dataset.act);
        });
      });
    });
  }

  _buildEnding() {
    const s = el('div', 'screen hidden'); s.id = 'screen-ending';
    s.innerHTML = `
      <div id="end-bg"></div><div id="end-grad"></div>
      <div id="end-content"></div>`;
    this.root.appendChild(s);
    this.endContent = s.querySelector('#end-content');
    this.endBg = s.querySelector('#end-bg');
  }

  showEnding(ending) {
    return new Promise(resolve => {
      this.endBg.style.backgroundImage = `url('${import.meta.env.BASE_URL}keyart_menu.png')`;
      this.endContent.innerHTML = `
        <div class="end-kind">${ending.kind}</div>
        <h2>${ending.title}</h2>
        <div class="end-body">${ending.body}</div>
        <div class="end-quote">${ending.quote}</div>
        <div class="end-attr">${ending.attr}</div>
        <div id="end-buttons">
          <button class="ps-btn" data-act="credits">Credits</button>
          <button class="ps-btn" data-act="menu">Main Menu</button>
        </div>`;
      this.showScreen('screen-ending');
      this.endContent.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          this.audio.sfx('click');
          this.hideScreen('screen-ending');
          resolve(b.dataset.act);
        });
      });
    });
  }

  _buildPause() {
    const s = el('div', 'screen hidden'); s.id = 'screen-pause';
    s.innerHTML = `<div class="panel">
      <h2>PAU<span class="pink">SED</span></h2>
      <div id="pause-body"></div>
      <div class="pause-nav">
        <button class="ps-btn small" data-act="resume">Resume</button>
        <button class="ps-btn small" data-act="objectives">Mission Objectives</button>
        <button class="ps-btn small" data-act="evidence">Evidence Board</button>
        <button class="ps-btn small" data-act="dialog">Replay Dialogue</button>
        <button class="ps-btn small" data-act="restart">Restart Mission</button>
        <button class="ps-btn small" data-act="settings">Settings</button>
        <button class="ps-btn small danger" data-act="quit">Quit to Menu</button>
      </div>
    </div>`;
    this.root.appendChild(s);
    this.pauseBody = s.querySelector('#pause-body');
    s.querySelectorAll('.pause-nav button').forEach(b => {
      b.addEventListener('click', () => {
        this.audio.sfx('click');
        const act = b.dataset.act;
        if (act === 'objectives') { this.renderPauseObjectives(); return; }
        if (act === 'evidence') { this.renderEvidenceBoard(); return; }
        if (act === 'dialog') { this.renderDialogueLog(); return; }
        if (this.handlers.onPauseAction) this.handlers.onPauseAction(act);
      });
    });
  }

  renderPauseObjectives() {
    const list = this._objHistory || [];
    this.pauseBody.innerHTML = `<div id="pause-objectives">${
      list.length
        ? list.map((o, i) => `<div class="pobj ${i < list.length - 1 ? 'done' : 'current'}">${i < list.length - 1 ? '✓' : '➤'} ${o}</div>`).join('')
        : '<div class="pobj">No objectives yet.</div>'
    }</div>`;
  }

  renderEvidenceBoard() {
    const cards = State.evidence.map(id => {
      const d = EVIDENCE_DEFS[id];
      return d ? `<div class="ev-card"><div class="ev-name">${d.name}</div><div class="ev-desc">${d.desc}</div></div>` : '';
    }).join('');
    this.pauseBody.innerHTML = `<div id="evidence-board">${cards || '<div class="ph-empty">No evidence collected yet.</div>'}</div>`;
  }

  renderDialogueLog() {
    const lines = this.log.map((l, i) =>
      `<div class="log-line"><b>${l.name}</b>${l.text}<button data-i="${i}">▶ replay</button></div>`).join('');
    this.pauseBody.innerHTML = `<div id="dlg-log">${lines || '<div class="ph-empty">No dialogue yet this mission.</div>'}</div>`;
    this.pauseBody.querySelectorAll('button[data-i]').forEach(b => {
      b.addEventListener('click', () => {
        const l = this.log[+b.dataset.i];
        this.audio.speak(l.charId, l.text);
      });
    });
  }

  // ---------------------------------------------------------------- screens
  showScreen(id) { document.getElementById(id).classList.remove('hidden'); }
  hideScreen(id) { document.getElementById(id).classList.add('hidden'); }
  hideAllScreens() {
    this.root.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  }

  // ---------------------------------------------------------------- fades
  fadeToBlack(ms = 1000) {
    return new Promise(res => {
      this.fadeEl.style.transition = `opacity ${ms}ms ease`;
      this.fadeEl.classList.remove('clear');
      setTimeout(res, ms + 30);
    });
  }
  fadeFromBlack(ms = 1000) {
    return new Promise(res => {
      this.fadeEl.style.transition = `opacity ${ms}ms ease`;
      this.fadeEl.classList.add('clear');
      setTimeout(res, ms + 30);
    });
  }

  letterbox(on) {
    this.lbTop.classList.toggle('on', on);
    this.lbBot.classList.toggle('on', on);
  }

  alertVignette(on) { this.alertVin.classList.toggle('on', on); }

  // ---------------------------------------------------------------- HUD
  showHUD(on) { this.hud.classList.toggle('hidden', !on); }

  setObjective(text) {
    if (!text) { this.objBox.classList.add('hidden'); return; }
    if (!this._objHistory) this._objHistory = [];
    this._objHistory.push(text);
    this.objBox.classList.remove('hidden');
    this.objText.textContent = text;
    this.objBox.style.animation = 'none';
    void this.objBox.offsetWidth;
    this.objBox.style.animation = '';
    this.audio.sfx('objective');
  }
  resetObjectives() { this._objHistory = []; this.objBox.classList.add('hidden'); }

  suspicion(v, visible = true) {
    this.susBox.classList.toggle('hidden', !visible);
    if (!visible) return;
    const pct = Math.round(Math.max(0, Math.min(100, v)));
    this.susFill.style.width = pct + '%';
    this.susPct.textContent = pct + '%';
    this.susBox.classList.toggle('alert', pct > 65);
    this.alertVignette(pct > 65);
  }

  evidenceCount(n) {
    this.evBox.classList.remove('hidden');
    this.evBox.innerHTML = `Evidence <b>${n}</b>`;
  }

  timer(text) {
    this.timerEl.classList.toggle('hidden', !text);
    if (text) this.timerEl.textContent = text;
  }

  interactPrompt(label) {
    if (!label) { this.prompt.classList.add('hidden'); return; }
    this.prompt.innerHTML = `<b>E</b>${label}`;
    this.prompt.classList.remove('hidden');
  }

  notify(title, body, gold = false) {
    const n = el('div', 'notify' + (gold ? ' gold' : ''),
      `<div class="n-title">${title}</div>${body}`);
    this.notifyStack.appendChild(n);
    this.audio.sfx(gold ? 'pickup' : 'phone');
    setTimeout(() => {
      n.classList.add('out');
      setTimeout(() => n.remove(), 450);
    }, 4200);
  }

  phoneNotif(on) { this.phoneDot.classList.toggle('hidden', !on); }

  // ---------------------------------------------------------------- dialogue
  /**
   * Shows one dialogue line with typewriter + voice. Resolves when player advances.
   */
  showLine(charId, text, { gold = false } = {}) {
    const c = CHARACTERS[charId] || {};
    const name = c.name || charId;
    this.log.push({ charId, name: c.short || name, text });
    this.dlg.classList.remove('hidden');
    this.dlgName.textContent = name;
    this.dlgName.className = gold ? 'gold' : '';
    this.dlgName.id = 'dlg-name';
    if (c.portrait && !c.hidePortrait) {
      this.dlgPortrait.style.display = '';
      this.dlgPortrait.style.backgroundImage = `url('${c.portrait}')`;
    } else {
      this.dlgPortrait.style.display = 'none';
    }
    // typewriter
    if (this.typingTimer) clearInterval(this.typingTimer);
    const target = this.dlgText;
    target.innerHTML = '<span class="tw"></span><span class="cursor"></span>';
    const tw = target.querySelector('.tw');
    let i = 0;
    let typingDone = false;
    const finishTyping = () => {
      if (typingDone) return;
      typingDone = true;
      clearInterval(this.typingTimer);
      tw.textContent = text;
      const cur = target.querySelector('.cursor');
      if (cur) cur.remove();
    };
    this.typingTimer = setInterval(() => {
      i++;
      tw.textContent = text.slice(0, i);
      if (i % 3 === 0) this.audio.sfx('type');
      if (i >= text.length) finishTyping();
    }, 24);

    const voiceDone = this.audio.speak(charId, text);

    return new Promise(resolve => {
      this.dialogueSkipTyping = finishTyping;
      this.lineForce = () => {
        finishTyping();
        this.dialogueResolver = null;
        this.dialogueSkipTyping = null;
        this.lineForce = null;
        this.audio.cancelSpeech();
        resolve();
      };
      this.dialogueResolver = () => {
        if (!typingDone) { finishTyping(); return; }   // first press completes text
        this.dialogueResolver = null;
        this.dialogueSkipTyping = null;
        this.lineForce = null;
        this.audio.cancelSpeech();
        resolve();
      };
      // auto-advance shortly after the voice line completes (only if voice actually played).
      // A sequence token guards against a stale timer from a previous line
      // clobbering the resolver of the current one.
      this._lineSeq = (this._lineSeq || 0) + 1;
      const seq = this._lineSeq;
      voiceDone.then((spoke) => {
        if (!spoke || seq !== this._lineSeq) return;
        setTimeout(() => {
          if (seq !== this._lineSeq) return;
          if (this.dialogueResolver) {
            finishTyping();
            this.dialogueResolver = null;
            this.dialogueSkipTyping = null;
            this.lineForce = null;
            resolve();
          }
        }, 1400);
      });
    });
  }

  advanceDialogue() {
    if (this.dialogueResolver) this.dialogueResolver();
  }

  forceLine() {
    if (this.lineForce) this.lineForce();
  }

  hideDialogue() {
    this.dlg.classList.add('hidden');
    if (this.typingTimer) clearInterval(this.typingTimer);
    this.dialogueResolver = null;
    this.lineForce = null;
  }

  /**
   * Shows choices; resolves with the chosen index. Numbers 1-N also work (handled by Game).
   */
  showChoices(options) {
    return new Promise(resolve => {
      this.choicesBox.innerHTML = '';
      this.choicesBox.classList.remove('hidden');
      options.forEach((opt, i) => {
        const b = el('button', 'choice-btn',
          `<span class="ch-num">${i + 1}</span><span>${opt}</span>`);
        b.style.animationDelay = `${i * 70}ms`;
        b.addEventListener('mouseenter', () => this.audio.sfx('hover'));
        b.addEventListener('click', () => {
          this.audio.sfx('click');
          this.choicesBox.classList.add('hidden');
          this.choiceResolver = null;
          resolve(i);
        });
        this.choicesBox.appendChild(b);
      });
      this.choiceResolver = (i) => {
        if (i >= 0 && i < options.length) {
          this.audio.sfx('click');
          this.choicesBox.classList.add('hidden');
          this.choiceResolver = null;
          resolve(i);
        }
      };
    });
  }

  subtitle(name, text) {
    if (!text) { this.subtitleBar.classList.add('hidden'); return; }
    if (!Settings.subtitles) { this.subtitleBar.classList.add('hidden'); return; }
    this.subtitleBar.classList.remove('hidden');
    this.subtitleBar.innerHTML = name ? `<span class="sub-name">${name}:</span>${text}` : text;
  }

  showSkip(on) { this.skipBtn.classList.toggle('hidden', !on); }
  showFocus(on) { this.focusOv.classList.toggle('hidden', !on); }

  // ---------------------------------------------------------------- call overlay
  incomingCall(charId) {
    return new Promise(resolve => {
      const c = CHARACTERS[charId];
      this.callOv.innerHTML = `
        ${c.portrait ? `<div class="call-img" style="background-image:url('${c.portrait}')"></div>` : ''}
        <div class="call-label">Incoming Call</div>
        <div class="call-name">${c.name}</div>
        <button class="ps-btn small" data-act="answer">Answer</button>`;
      this.callOv.classList.remove('hidden');
      const ring = setInterval(() => this.audio.sfx('phone'), 1100);
      this.audio.sfx('phone');
      this.callOv.querySelector('button').addEventListener('click', () => {
        clearInterval(ring);
        this.audio.sfx('click');
        this.callOv.classList.add('hidden');
        resolve();
      });
    });
  }

  // ---------------------------------------------------------------- phone
  openPhone() {
    this.phone.classList.add('open');
    this.phoneNotif(false);
    const d = new Date();
    this.phone.querySelector('.ph-clock').textContent =
      `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
    this.renderPhone();
  }
  closePhone() { this.phone.classList.remove('open'); }
  get phoneOpen() { return this.phone.classList.contains('open'); }

  renderPhone() {
    [...this.phoneTabs.children].forEach((b, i) =>
      b.classList.toggle('active', this.phoneTabNames[i][0] === this.activePhoneTab));
    const items = State.phone[this.activePhoneTab] || [];
    if (!items.length) {
      this.phoneContent.innerHTML = `<div class="ph-empty">— nothing here —</div>`;
      return;
    }
    this.phoneContent.innerHTML = items.map((m, i) => `
      <div class="ph-item ${m.threat ? 'threat' : ''} ${m.evidence ? 'evidence' : ''}">
        <div class="ph-from"><span>${m.from}</span><span class="ph-time">${m.time || ''}</span></div>
        <div class="ph-body">${m.body}</div>
        ${m.voiceChar ? `<button class="ph-play" data-i="${i}">▶ Play voice note</button>` : ''}
      </div>`).join('');
    this.phoneContent.querySelectorAll('.ph-play').forEach(b => {
      b.addEventListener('click', () => {
        const m = items[+b.dataset.i];
        this.audio.speak(m.voiceChar, m.voiceText || m.body);
      });
    });
    this.phoneContent.scrollTop = this.phoneContent.scrollHeight;
  }
}
