// ============ PINK SIGNAL — Three.js world engine ============
import * as THREE from 'three';
import { Settings } from './state.js';

const EYE = 1.62;
const PLAYER_R = 0.38;

// ---------------------------------------------------------------- helpers
function makeLabelTexture(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 512, 128);
  x.font = '600 52px Inter, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,0.9)'; x.shadowBlur = 12;
  x.fillStyle = color;
  x.fillText(text, 256, 64);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 2;
  return t;
}

function makeCityTexture() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#020204';
  x.fillRect(0, 0, 2048, 512);
  // distant glow
  const grad = x.createLinearGradient(0, 320, 0, 512);
  grad.addColorStop(0, 'rgba(20,12,24,0)');
  grad.addColorStop(1, 'rgba(48,20,40,0.5)');
  x.fillStyle = grad;
  x.fillRect(0, 320, 2048, 192);
  let bx = 0;
  while (bx < 2048) {
    const bw = 30 + Math.random() * 70;
    const bh = 90 + Math.random() * 280;
    x.fillStyle = `rgba(${8 + Math.random() * 8 | 0},${8 + Math.random() * 8 | 0},${14 + Math.random() * 10 | 0},1)`;
    x.fillRect(bx, 512 - bh, bw, bh);
    // windows
    for (let wy = 512 - bh + 8; wy < 500; wy += 14) {
      for (let wx = bx + 5; wx < bx + bw - 6; wx += 11) {
        if (Math.random() < 0.16) {
          const warm = Math.random() < 0.7;
          x.fillStyle = warm
            ? `rgba(255,${170 + Math.random() * 60 | 0},90,${0.35 + Math.random() * 0.5})`
            : `rgba(140,190,255,${0.3 + Math.random() * 0.4})`;
          x.fillRect(wx, wy, 4, 6);
        }
      }
    }
    // occasional pink neon
    if (Math.random() < 0.14) {
      x.fillStyle = 'rgba(255,45,126,0.85)';
      x.fillRect(bx + bw * 0.3, 512 - bh - 4, bw * 0.4, 4);
      x.shadowColor = '#ff2d7e'; x.shadowBlur = 16;
      x.fillRect(bx + bw * 0.3, 512 - bh - 4, bw * 0.4, 4);
      x.shadowBlur = 0;
    }
    bx += bw + 4 + Math.random() * 20;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeDancefloorTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  const cols = ['#1a0a14', '#2a0d1e', '#3d1029', '#12060e'];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      x.fillStyle = cols[(Math.random() * cols.length) | 0];
      x.fillRect(i * 32, j * 32, 32, 32);
    }
  }
  x.strokeStyle = 'rgba(255,45,126,0.5)';
  for (let i = 0; i <= 8; i++) {
    x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 256); x.stroke();
    x.beginPath(); x.moveTo(0, i * 32); x.lineTo(256, i * 32); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- world
export class World {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020204);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 220);

    this.player = {
      pos: new THREE.Vector3(0, EYE, 0),
      vel: new THREE.Vector3(),
      yaw: 0, pitch: 0,
      targetYaw: 0, targetPitch: 0,
      moveEnabled: false,
      lookEnabled: false,
      cinematicLook: false,   // subtle parallax look without pointer lock
      bobT: 0,
    };
    this.keys = {};
    this.locked = false;

    this.colliders = [];
    this.zones = {};
    this.interactables = [];
    this.npcs = {};
    this.guards = [];
    this.cams = [];
    this.restricted = [];
    this.pollers = [];
    this.dynamic = [];        // {update(dt,t)}
    this.tags = {};

    this.suspicion = 0;
    this.suspicionEnabled = false;
    this.suspicionVisible = false;
    this.onSuspicion = null;
    this.onBusted = null;
    this._busted = false;

    this.rainPts = null;
    this.policeLights = null;
    this._mouse = { x: 0, y: 0 };
    this._stepT = 0;
    this.onStep = null;

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('mousemove', (e) => {
      this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (this.locked && this.player.lookEnabled) {
        this.player.targetYaw -= e.movementX * 0.0021;
        this.player.targetPitch -= e.movementY * 0.0019;
        this.player.targetPitch = Math.max(-1.45, Math.min(1.45, this.player.targetPitch));
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.renderer.domElement;
      if (this.onLockChange) this.onLockChange(this.locked);
    });

    this.clock = new THREE.Clock();
    this.onTick = null;
    this.renderer.setAnimationLoop(() => this._frame());
    this.applyQuality(Settings.quality);
  }

  applyQuality(q) {
    const dpr = window.devicePixelRatio || 1;
    if (q === 'low') this.renderer.setPixelRatio(Math.min(dpr, 0.65));
    else if (q === 'medium') this.renderer.setPixelRatio(Math.min(dpr, 1));
    else this.renderer.setPixelRatio(Math.min(dpr, 1.75));
    this.renderer.shadowMap.enabled = q === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  requestLock() {
    if (!this.locked) {
      try {
        const p = this.renderer.domElement.requestPointerLock();
        if (p && typeof p.catch === 'function') p.catch(() => { /* needs gesture */ });
      } catch (e) { /* needs gesture */ }
    }
  }
  releaseLock() {
    if (this.locked) document.exitPointerLock();
  }

  // -------------------------------------------------------------- frame
  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const p = this.player;

    // look smoothing
    if (p.cinematicLook && !this.locked) {
      // gentle parallax toward cursor
      const baseYaw = p.baseYaw ?? p.yaw;
      const basePitch = p.basePitch ?? p.pitch;
      p.targetYaw = baseYaw - this._mouse.x * 0.32;
      p.targetPitch = basePitch - this._mouse.y * 0.18;
    }
    const k = 1 - Math.exp(-dt * 16);
    p.yaw += (p.targetYaw - p.yaw) * k;
    p.pitch += (p.targetPitch - p.pitch) * k;

    // movement
    let moving = false;
    if (p.moveEnabled && this.locked) {
      const fwd = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0);
      const strafe = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
      const run = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
      const speed = run ? 5.0 : 2.9;
      const dir = new THREE.Vector3(
        Math.sin(p.yaw) * -fwd + Math.cos(p.yaw) * strafe,
        0,
        Math.cos(p.yaw) * -fwd - Math.sin(p.yaw) * strafe,
      );
      if (dir.lengthSq() > 0) { dir.normalize().multiplyScalar(speed); moving = true; }
      // smooth accel
      p.vel.x += (dir.x - p.vel.x) * Math.min(1, dt * 11);
      p.vel.z += (dir.z - p.vel.z) * Math.min(1, dt * 11);
    } else {
      p.vel.multiplyScalar(Math.max(0, 1 - dt * 10));
    }

    // collide & move (axis separated)
    if (Math.abs(p.vel.x) > 0.0005) {
      const nx = p.pos.x + p.vel.x * dt;
      if (!this._collides(nx, p.pos.z)) p.pos.x = nx;
    }
    if (Math.abs(p.vel.z) > 0.0005) {
      const nz = p.pos.z + p.vel.z * dt;
      if (!this._collides(p.pos.x, nz)) p.pos.z = nz;
    }

    // head bob
    const sp = Math.hypot(p.vel.x, p.vel.z);
    if (sp > 0.4) {
      p.bobT += dt * sp * 2.4;
      this._stepT += dt * sp;
      if (this._stepT > 1.9) { this._stepT = 0; if (this.onStep) this.onStep(); }
    } else {
      p.bobT += (Math.round(p.bobT / Math.PI) * Math.PI - p.bobT) * Math.min(1, dt * 6);
    }
    const bobY = Math.sin(p.bobT * 2) * 0.028 * Math.min(1, sp / 3);
    const bobX = Math.cos(p.bobT) * 0.014 * Math.min(1, sp / 3);

    this.camera.position.set(p.pos.x + Math.cos(p.yaw) * bobX, p.pos.y + bobY, p.pos.z - Math.sin(p.yaw) * bobX);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(p.yaw);
    this.camera.rotateX(p.pitch);

    // dynamic objects
    for (const d of this.dynamic) d.update(dt, t);

    // npc idle + labels
    for (const id in this.npcs) {
      const n = this.npcs[id];
      if (n.sway) n.group.rotation.y = n.baseRot + Math.sin(t * n.swaySpeed + n.swayOff) * 0.12;
      if (n.facePlayer) {
        const dx = p.pos.x - n.group.position.x, dz = p.pos.z - n.group.position.z;
        const target = Math.atan2(dx, dz);
        let diff = target - n.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        n.group.rotation.y += diff * Math.min(1, dt * 5);
      }
      if (n.label) {
        const d = n.group.position.distanceTo(p.pos);
        n.label.visible = d < 8;
      }
      if (n.walker) this._updateWalker(n, dt);
    }

    // guards
    for (const g of this.guards) this._updateGuard(g, dt, t);
    // cameras
    for (const c of this.cams) this._updateCam(c, dt, t);
    // restricted zones
    if (this.suspicionEnabled) {
      for (const r of this.restricted) {
        if (r.box.containsPoint(p.pos)) this.addSuspicion(r.rate * dt);
      }
      this.suspicion = Math.max(0, this.suspicion - 3.2 * dt);
      if (this.onSuspicion) this.onSuspicion(this.suspicion);
    }

    // rain
    if (this.rainPts) {
      const arr = this.rainPts.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] -= dt * 14;
        if (arr[i] < 0) arr[i] = 18 + Math.random() * 4;
      }
      this.rainPts.geometry.attributes.position.needsUpdate = true;
      this.rainPts.position.x = p.pos.x;
      this.rainPts.position.z = p.pos.z;
    }

    // police flash
    if (this.policeLights) {
      const phase = Math.floor(t * 3.2) % 2;
      this.policeLights.red.intensity = phase === 0 ? this.policeLights.power : 0;
      this.policeLights.blue.intensity = phase === 1 ? this.policeLights.power : 0;
    }

    // pollers (zone waits etc.)
    for (let i = this.pollers.length - 1; i >= 0; i--) {
      if (this.pollers[i](dt)) this.pollers.splice(i, 1);
    }

    if (this.onTick) this.onTick(dt, t);
    this.renderer.render(this.scene, this.camera);
  }

  _collides(x, z) {
    for (const b of this.colliders) {
      if (x + PLAYER_R > b.min.x && x - PLAYER_R < b.max.x &&
          z + PLAYER_R > b.min.z && z - PLAYER_R < b.max.z) return true;
    }
    return false;
  }

  _updateWalker(n, dt) {
    const w = n.walker;
    const target = w.points[w.i];
    const dx = target.x - n.group.position.x;
    const dz = target.z - n.group.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) {
      if (w.loop) w.i = (w.i + 1) % w.points.length;
      else if (w.i < w.points.length - 1) w.i++;
      else { n.walker = null; if (w.onArrive) w.onArrive(); return; }
    } else {
      const sp = w.speed || 1.6;
      n.group.position.x += (dx / d) * sp * dt;
      n.group.position.z += (dz / d) * sp * dt;
      n.group.rotation.y = Math.atan2(dx, dz);
      n.group.position.y = Math.abs(Math.sin(performance.now() * 0.012)) * 0.018;
    }
  }

  _updateGuard(g, dt, t) {
    const n = g.npc;
    if (!n.walker && g.points.length > 1) {
      n.walker = { points: g.points, i: g.i || 0, loop: true, speed: g.speed };
    }
    if (g.npc.walker) g.i = g.npc.walker.i;
    // detection
    if (this.suspicionEnabled && g.detect) {
      const p = this.player.pos;
      const dx = p.x - n.group.position.x, dz = p.z - n.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < g.range) {
        const facing = n.group.rotation.y;
        const toPlayer = Math.atan2(dx, dz);
        let diff = Math.abs(Math.atan2(Math.sin(toPlayer - facing), Math.cos(toPlayer - facing)));
        if (diff < 0.72 || dist < 1.6) {
          this.addSuspicion(g.rate * dt * (dist < 3 ? 2 : 1));
          g.alerted = true;
        } else g.alerted = false;
      } else g.alerted = false;
      if (g.cone) g.cone.material.opacity = g.alerted ? 0.16 : 0.05;
    }
  }

  _updateCam(c, dt, t) {
    c.head.rotation.y = c.baseYaw + Math.sin(t * c.speed + c.off) * c.sweep;
    if (this.suspicionEnabled) {
      const p = this.player.pos;
      const worldYaw = c.group.rotation.y + c.head.rotation.y;
      const dx = p.x - c.group.position.x, dz = p.z - c.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < c.range) {
        const toPlayer = Math.atan2(dx, dz);
        let diff = Math.abs(Math.atan2(Math.sin(toPlayer - worldYaw), Math.cos(toPlayer - worldYaw)));
        if (diff < 0.3) {
          this.addSuspicion(c.rate * dt);
          c.lens.material.emissive.setHex(0xff2020);
        } else c.lens.material.emissive.setHex(0x441111);
      } else c.lens.material.emissive.setHex(0x441111);
    }
  }

  addSuspicion(amt) {
    if (!this.suspicionEnabled || this._busted) return;
    this.suspicion = Math.min(100, this.suspicion + amt);
    if (this.suspicion >= 100 && this.onBusted) {
      this._busted = true;
      this.onBusted();
    }
  }
  resetSuspicion() { this.suspicion = 0; this._busted = false; }

  // -------------------------------------------------------------- api
  setSuspicionSystem(enabled) {
    this.suspicionEnabled = enabled;
    if (!enabled) { this.suspicion = 0; this._busted = false; }
  }

  teleport(x, z, yaw = 0) {
    this.player.pos.set(x, EYE, z);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = this.player.targetYaw = yaw;
    this.player.pitch = this.player.targetPitch = 0;
  }

  setCinematicLook(on, baseYaw, basePitch = 0) {
    const p = this.player;
    p.cinematicLook = on;
    if (on) { p.baseYaw = baseYaw ?? p.yaw; p.basePitch = basePitch; }
  }

  lookTowards(x, y, z, instant = false) {
    const p = this.player;
    const dx = x - p.pos.x, dy = y - p.pos.y, dz = z - p.pos.z;
    const yaw = Math.atan2(dx, dz) + Math.PI; // camera forward is -z after yaw
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    p.targetYaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    // unwrap relative to current yaw for shortest path
    let diff = p.targetYaw - p.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    p.targetYaw = p.yaw + diff;
    p.targetPitch = pitch;
    if (p.cinematicLook) { p.baseYaw = p.targetYaw; p.basePitch = pitch; }
    if (instant) { p.yaw = p.targetYaw; p.pitch = p.targetPitch; }
  }

  waitForZone(name, signal) {
    return new Promise((resolve, reject) => {
      const z = this.zones[name];
      const poll = () => {
        if (signal && signal.aborted) { reject(new DOMException('aborted', 'AbortError')); return true; }
        if (z.containsPoint(this.player.pos)) { resolve(); return true; }
        return false;
      };
      this.pollers.push(poll);
    });
  }

  waitFor(fn, signal) {
    return new Promise((resolve, reject) => {
      this.pollers.push(() => {
        if (signal && signal.aborted) { reject(new DOMException('aborted', 'AbortError')); return true; }
        if (fn()) { resolve(); return true; }
        return false;
      });
    });
  }

  wait(seconds, signal) {
    return new Promise((resolve, reject) => {
      let t = 0;
      this.pollers.push((dt) => {
        if (signal && signal.aborted) { reject(new DOMException('aborted', 'AbortError')); return true; }
        t += dt;
        if (t >= seconds) { resolve(); return true; }
        return false;
      });
    });
  }

  addInteractable(id, obj, label, { radius = 2.3, enabled = true, highlight = true } = {}) {
    const entry = { id, obj, label, radius, enabled, used: false, resolver: null };
    if (highlight) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.24, 24),
        new THREE.MeshBasicMaterial({ color: 0xff2d7e, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      const wp = new THREE.Vector3();
      obj.getWorldPosition(wp);
      ring.position.set(wp.x, 0.03, wp.z);
      this.scene.add(ring);
      entry.ring = ring;
      this.dynamic.push({ update: (dt, t) => {
        ring.material.opacity = entry.enabled && !entry.used ? 0.3 + Math.sin(t * 3.4) * 0.2 : 0;
        ring.scale.setScalar(1 + Math.sin(t * 3.4) * 0.08);
      } });
    }
    this.interactables.push(entry);
    return entry;
  }

  getInteractable(id) { return this.interactables.find(i => i.id === id); }

  nearestInteractable() {
    const p = this.player.pos;
    let best = null, bestD = Infinity;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const wp = new THREE.Vector3();
    for (const it of this.interactables) {
      if (!it.enabled || it.used) continue;
      it.obj.getWorldPosition(wp);
      const d = Math.hypot(wp.x - p.x, wp.z - p.z);
      if (d > it.radius) continue;
      const dir = new THREE.Vector3(wp.x - p.x, 0, wp.z - p.z).normalize();
      const dot = d < 0.7 ? 1 : dir.dot(new THREE.Vector3(fwd.x, 0, fwd.z).normalize());
      if (dot < 0.25) continue;
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  waitForInteract(id, signal) {
    const it = this.getInteractable(id);
    it.enabled = true; it.used = false;
    return new Promise((resolve, reject) => {
      it.resolver = resolve;
      if (signal) signal.addEventListener('abort', () => {
        it.resolver = null;
        reject(new DOMException('aborted', 'AbortError'));
      }, { once: true });
    });
  }

  tryInteract() {
    const it = this.nearestInteractable();
    if (it && it.resolver) {
      const r = it.resolver;
      it.resolver = null;
      it.used = true;
      r();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------- builders base
  clearLocation() {
    this.scene.clear();
    this.colliders = [];
    this.zones = {};
    this.interactables = [];
    this.npcs = {};
    this.guards = [];
    this.cams = [];
    this.restricted = [];
    this.pollers = [];
    this.dynamic = [];
    this.tags = {};
    this.rainPts = null;
    this.policeLights = null;
    this.resetSuspicion();
    this.suspicionEnabled = false;
  }

  _base(fogDensity = 0.04) {
    this.scene.fog = new THREE.FogExp2(0x020205, fogDensity);
    const hemi = new THREE.HemisphereLight(0x1c1830, 0x050308, 0.85);
    this.scene.add(hemi);
  }

  mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0.05,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.eIntensity ?? 1,
      ...(opts.map ? { map: opts.map } : {}),
      ...(opts.transparent ? { transparent: true, opacity: opts.opacity ?? 0.5 } : {}),
      ...(opts.side ? { side: opts.side } : {}),
    });
  }

  box(w, h, d, material, x, y, z, { collide = false, ry = 0, shadow = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    if (this.renderer.shadowMap.enabled && shadow) { m.castShadow = true; m.receiveShadow = true; }
    this.scene.add(m);
    if (collide) this.addColliderFor(m);
    return m;
  }

  addColliderFor(mesh) {
    mesh.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(mesh);
    this.colliders.push(b);
    return b;
  }
  addColliderBox(cx, cz, w, d) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(cx - w / 2, 0, cz - d / 2),
      new THREE.Vector3(cx + w / 2, 3, cz + d / 2)));
  }

  addZone(name, cx, cz, w, d) {
    this.zones[name] = new THREE.Box3(
      new THREE.Vector3(cx - w / 2, 0, cz - d / 2),
      new THREE.Vector3(cx + w / 2, 3.5, cz + d / 2));
  }

  addRestricted(cx, cz, w, d, rate = 16) {
    this.restricted.push({
      box: new THREE.Box3(
        new THREE.Vector3(cx - w / 2, 0, cz - d / 2),
        new THREE.Vector3(cx + w / 2, 3.5, cz + d / 2)),
      rate,
    });
  }

  point(color, intensity, dist, x, y, z, { shadow = false, decay = 1.6 } = {}) {
    // physical light units in modern three.js need much higher raw intensity
    const l = new THREE.PointLight(color, intensity * 9, dist, decay);
    l.position.set(x, y, z);
    if (shadow && this.renderer.shadowMap.enabled) {
      l.castShadow = true;
      l.shadow.mapSize.set(512, 512);
    }
    this.scene.add(l);
    return l;
  }

  neonStrip(w, x, y, z, color = 0xff2d7e, ry = 0, intensity = 2.4) {
    const m = this.box(w, 0.06, 0.05,
      this.mat(0x000000, { emissive: color, eIntensity: intensity }), x, y, z, { ry, shadow: false });
    this.point(color, 3.2, 7, x, y - 0.2, z);
    return m;
  }

  ceilingLamp(x, y, z, color = 0xffd9a0, intensity = 4, dist = 9, shadow = false) {
    this.box(0.5, 0.04, 0.5, this.mat(0x000000, { emissive: color, eIntensity: 1.6 }), x, y, z, { shadow: false });
    return this.point(color, intensity, dist, x, y - 0.35, z, { shadow });
  }

  skyline(radius = 70) {
    const tex = makeCityTexture();
    const geo = new THREE.CylinderGeometry(radius, radius, 46, 48, 1, true);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex, side: THREE.BackSide, fog: false,
    }));
    mesh.position.y = 14;
    this.scene.add(mesh);
    return mesh;
  }

  rain(count = 1300) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 44;
      arr[i * 3 + 1] = Math.random() * 22;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mult = Settings.quality === 'low' ? 0.5 : 1;
    const m = new THREE.PointsMaterial({
      color: 0x8fa6bd, size: 0.05 * (2 - mult), transparent: true, opacity: 0.5,
      sizeAttenuation: true, fog: true,
    });
    this.rainPts = new THREE.Points(geo, m);
    this.scene.add(this.rainPts);
  }

  policeFlash(x, y, z, power = 12) {
    const red = this.point(0xff2030, 0, 30, x - 1.4, y, z);
    const blue = this.point(0x2050ff, 0, 30, x + 1.4, y, z);
    this.policeLights = { red, blue, power: power * 9 };
  }
  stopPoliceFlash() {
    if (this.policeLights) {
      this.policeLights.red.intensity = 0;
      this.policeLights.blue.intensity = 0;
      this.policeLights = null;
    }
  }

  flickerLight(light, _base, speed = 11) {
    const base = light.intensity; // already scaled
    this.dynamic.push({ update: (dt, t) => {
      light.intensity = base * (0.62 + 0.38 * Math.abs(Math.sin(t * speed) * Math.sin(t * 3.7 + 1)));
    } });
  }

  // -------------------------------------------------------------- people
  buildPerson(look = {}) {
    const g = new THREE.Group();
    const skin = this.mat(look.skin ?? 0xb98a64, { rough: 0.7 });
    const outfit = this.mat(look.outfit ?? 0x1c1c22, { rough: 0.9 });
    const hairM = this.mat(look.hair ?? 0x111009, { rough: 0.95 });

    // legs
    const legGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.86, 8);
    [-0.105, 0.105].forEach(x => {
      const leg = new THREE.Mesh(legGeo, outfit);
      leg.position.set(x, 0.43, 0);
      g.add(leg);
    });
    // torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.195, 0.42, 4, 10), outfit);
    torso.position.y = 1.13;
    g.add(torso);
    // accent sash/belt
    if (look.accent) {
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 12),
        this.mat(0x000000, { emissive: look.accent, eIntensity: 0.8 }));
      belt.position.y = 0.95;
      g.add(belt);
    }
    // arms
    const armGeo = new THREE.CapsuleGeometry(0.06, 0.52, 4, 8);
    [-0.27, 0.27].forEach(x => {
      const arm = new THREE.Mesh(armGeo, outfit);
      arm.position.set(x, 1.16, 0);
      arm.rotation.z = x < 0 ? 0.12 : -0.12;
      g.add(arm);
    });
    // head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), skin);
    head.position.y = 1.62;
    g.add(head);
    // hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.142, 12, 10,
      0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
    hair.position.set(0, 1.65, -0.012);
    g.add(hair);
    if (look.hairLong) {
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.07, 0.42, 8), hairM);
      back.position.set(0, 1.42, -0.085);
      g.add(back);
    }
    if (this.renderer.shadowMap.enabled) g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    return g;
  }

  addNPC(id, look, x, z, rotY = 0, { name = null, sway = true, facePlayer = false, collide = true } = {}) {
    const group = this.buildPerson(look);
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    this.scene.add(group);
    let label = null;
    if (name) {
      label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeLabelTexture(name, '#ffd9e8'), transparent: true, depthTest: false,
      }));
      label.scale.set(1.5, 0.375, 1);
      label.position.y = 2.05;
      group.add(label);
    }
    if (collide) this.addColliderBox(x, z, 0.55, 0.55);
    const npc = {
      id, group, label,
      baseRot: rotY, sway, swaySpeed: 0.5 + Math.random() * 0.7, swayOff: Math.random() * 9,
      facePlayer, walker: null,
    };
    this.npcs[id] = npc;
    return npc;
  }

  removeNPC(id) {
    const n = this.npcs[id];
    if (n) { this.scene.remove(n.group); delete this.npcs[id]; }
  }

  addGuard(id, points, { speed = 1.3, range = 8, rate = 30, detect = true, name = null } = {}) {
    const npc = this.addNPC(id, { outfit: 0x14141a, accent: 0xb3122e, skin: 0xa97f58, hair: 0x111111 },
      points[0].x, points[0].z, 0, { sway: false, collide: false, name });
    // flashlight cone visual
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 4.5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.rotation.x = Math.PI / 2 - 0.12;
    cone.position.set(0, 1.3, 2.2);
    npc.group.add(cone);
    const g = { id, npc, points, i: 0, speed, range, rate, detect, cone, alerted: false };
    this.guards.push(g);
    return g;
  }

  addSecurityCamera(x, y, z, baseYaw, { sweep = 0.8, speed = 0.5, range = 9, rate = 38 } = {}) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), this.mat(0x222228));
    mount.position.y = 0.12;
    group.add(mount);
    const head = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.34), this.mat(0x1a1a20, { metal: 0.4, rough: 0.4 }));
    body.position.z = 0.1;
    head.add(body);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8),
      this.mat(0x110000, { emissive: 0x441111, eIntensity: 2 }));
    lens.position.z = 0.29;
    head.add(lens);
    // vision cone
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(Math.tan(0.3) * range, range, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff2d7e, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = range / 2 + 0.2;
    cone.position.y = -y / 2 + 0.4;
    cone.rotation.x += Math.atan2(y - 1, range) * -0; // keep simple horizontal cone
    head.add(cone);
    group.add(head);
    this.scene.add(group);
    group.rotation.y = 0;
    const cam = { group, head, lens, baseYaw, sweep, speed, range, rate, off: Math.random() * 8 };
    head.rotation.y = baseYaw;
    this.cams.push(cam);
    return cam;
  }

  // -------------------------------------------------------------- props
  pTable(x, z, w = 1.5, d = 0.8, h = 0.78, color = 0x241a14) {
    const top = this.box(w, 0.06, d, this.mat(color, { rough: 0.5 }), x, h, z, { collide: true });
    const legM = this.mat(0x16100b);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
      this.box(0.06, h, 0.06, legM, x + sx * (w / 2 - 0.08), h / 2, z + sz * (d / 2 - 0.08), { shadow: false }));
    return top;
  }

  pRoundTable(x, z, r = 0.55, h = 1.04) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 18), this.mat(0x1c1117, { rough: 0.4 }));
    m.position.set(x, h, z);
    this.scene.add(m);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, h, 10), this.mat(0x16100b, { metal: 0.5, rough: 0.4 }));
    stem.position.set(x, h / 2, z);
    this.scene.add(stem);
    this.addColliderBox(x, z, r * 1.6, r * 1.6);
    return m;
  }

  pSofa(x, z, ry = 0, color = 0x1d1218) {
    const g = new THREE.Group();
    const m = this.mat(color, { rough: 0.95 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.42, 0.9), m); seat.position.y = 0.24; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.22), m); back.position.set(0, 0.68, -0.36); g.add(back);
    [[-0.95], [0.95]].forEach(([ax]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.9), m);
      arm.position.set(ax, 0.45, 0); g.add(arm);
    });
    g.position.set(x, 0, z); g.rotation.y = ry;
    this.scene.add(g);
    this.addColliderBox(x, z, Math.abs(Math.cos(ry)) * 2.2 + Math.abs(Math.sin(ry)) * 1.1,
      Math.abs(Math.sin(ry)) * 2.2 + Math.abs(Math.cos(ry)) * 1.1);
    return g;
  }

  pHandbag(x, y, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.13),
      this.mat(0xff2d7e, { rough: 0.35, emissive: 0xff2d7e, eIntensity: 0.22 }));
    g.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 18, Math.PI),
      this.mat(0xc9a45c, { metal: 0.8, rough: 0.3 }));
    handle.position.y = 0.12;
    g.add(handle);
    g.position.set(x, y, z);
    this.scene.add(g);
    return g;
  }

  pPinkBox(x, y, z) {
    const m = this.box(0.34, 0.22, 0.24,
      this.mat(0x2a0d1a, { rough: 0.4, emissive: 0xff2d7e, eIntensity: 0.35 }), x, y, z, { shadow: false });
    const ribbon = this.box(0.36, 0.03, 0.05, this.mat(0x000000, { emissive: 0xff2d7e, eIntensity: 1.6 }), x, y + 0.115, z, { shadow: false });
    return m;
  }

  pPhone(x, y, z, ry = 0) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.17), this.mat(0x0a0a0c, { rough: 0.3, metal: 0.6 }));
    g.add(body);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.013, 0.155),
      this.mat(0x000000, { emissive: 0xff2d7e, eIntensity: 0.7 }));
    screen.position.y = 0.002;
    g.add(screen);
    g.position.set(x, y, z); g.rotation.y = ry;
    this.scene.add(g);
    return g;
  }

  pScreen(x, y, z, w = 0.6, h = 0.38, ry = 0, color = 0x88c0ff, intensity = 0.9) {
    const frame = this.box(w + 0.04, h + 0.04, 0.04, this.mat(0x111114), x, y, z, { ry, shadow: false });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      this.mat(0x000000, { emissive: color, eIntensity: intensity }));
    scr.position.set(x, y, z); scr.rotation.y = ry;
    scr.translateZ(0.025);
    this.scene.add(scr);
    return scr;
  }

  pCabinet(x, z, ry = 0, num = null) {
    const body = this.box(0.9, 1.5, 0.5, this.mat(0x23262c, { metal: 0.5, rough: 0.5 }), x, 0.75, z, { ry, collide: true });
    for (let i = 0; i < 4; i++) {
      const drawer = this.box(0.78, 0.3, 0.03, this.mat(0x2c3038, { metal: 0.5, rough: 0.45 }), x, 0.27 + i * 0.36, z, { ry, shadow: false });
      drawer.translateZ(0.26);
    }
    if (num !== null) {
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.15),
        new THREE.MeshBasicMaterial({ map: makeLabelTexture(String(num), '#ffd9e8'), transparent: true }));
      lab.position.set(x, 1.62, z); lab.rotation.y = ry;
      lab.translateZ(0.27);
      this.scene.add(lab);
    }
    return body;
  }

  pCar(x, z, ry = 0, color = 0x15161c) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.5, 4.3), this.mat(color, { rough: 0.32, metal: 0.6 }));
    body.position.y = 0.52; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.45, 2.1), this.mat(0x0c0d12, { rough: 0.15, metal: 0.6 }));
    cabin.position.set(0, 0.95, -0.2); g.add(cabin);
    const wheelG = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
    const wheelM = this.mat(0x0a0a0a, { rough: 0.95 });
    [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(wheelG, wheelM);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.33, wz);
      g.add(w);
    });
    g.position.set(x, 0, z); g.rotation.y = ry;
    this.scene.add(g);
    this.addColliderBox(x, z,
      Math.abs(Math.cos(ry)) * 2 + Math.abs(Math.sin(ry)) * 4.4,
      Math.abs(Math.sin(ry)) * 2 + Math.abs(Math.cos(ry)) * 4.4);
    return g;
  }

  pPlant(x, z) {
    const pot = this.box(0.34, 0.4, 0.34, this.mat(0x1a1410), x, 0.2, z, { shadow: false });
    const leafM = this.mat(0x0d1f12, { rough: 0.9 });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.85, 5), leafM);
      leaf.position.set(x + (Math.random() - 0.5) * 0.18, 0.78, z + (Math.random() - 0.5) * 0.18);
      leaf.rotation.set((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7);
      this.scene.add(leaf);
    }
    return pot;
  }

  pPillar(x, z, r = 0.4, h = 4, color = 0x191720) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 12), this.mat(color, { rough: 0.6 }));
    m.position.set(x, h / 2, z);
    this.scene.add(m);
    this.addColliderBox(x, z, r * 2.1, r * 2.1);
    return m;
  }

  pDoor(x, z, ry = 0, color = 0x1c1410, label = null) {
    const frame = this.box(1.3, 2.5, 0.16, this.mat(0x0e0a08), x, 1.25, z, { ry, shadow: false });
    const door = this.box(1.05, 2.3, 0.07, this.mat(color, { rough: 0.7 }), x, 1.15, z, { ry, shadow: false });
    if (label) {
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35),
        new THREE.MeshBasicMaterial({ map: makeLabelTexture(label, '#ff8fb8'), transparent: true }));
      lab.position.set(x, 2.62, z);
      lab.rotation.y = ry;
      lab.translateZ(0.1);
      this.scene.add(lab);
    }
    return door;
  }

  room(w, d, h, { floorColor = 0x121016, wallColor = 0x131119, ceil = true, cx = 0, cz = 0, openings = [] } = {}) {
    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat(floorColor, { rough: 0.55, metal: 0.08 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    if (this.renderer.shadowMap.enabled) floor.receiveShadow = true;
    this.scene.add(floor);
    if (ceil) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat(0x0b0a0f, { rough: 0.95 }));
      c.rotation.x = Math.PI / 2;
      c.position.set(cx, h, cz);
      this.scene.add(c);
    }
    const wallM = this.mat(wallColor, { rough: 0.92 });
    const walls = [
      { x: cx, z: cz - d / 2, w, ry: 0, id: 'n' },
      { x: cx, z: cz + d / 2, w, ry: 0, id: 's' },
      { x: cx - w / 2, z: cz, w: d, ry: Math.PI / 2, id: 'w' },
      { x: cx + w / 2, z: cz, w: d, ry: Math.PI / 2, id: 'e' },
    ];
    walls.forEach(s => {
      if (openings.includes(s.id)) return;
      this.box(s.w, h, 0.25, wallM, s.x, h / 2, s.z, { collide: true, ry: s.ry });
    });
    return floor;
  }

  // ================================================================ LOCATIONS
  loadLocation(name) {
    this.clearLocation();
    const fn = this['loc_' + name];
    if (!fn) throw new Error('unknown location ' + name);
    fn.call(this);
  }

  // ---- luxury apartment (opening + M2) ----
  loc_apartment() {
    this._base(0.028);
    const W = 16, D = 11, H = 3.1;
    this.room(W, D, H, { floorColor: 0x17110d, wallColor: 0x14111a, openings: ['n'] });
    // window wall (north): glass + frames + skyline
    this.skyline(60);
    const glassM = this.mat(0x0a1018, { rough: 0.05, metal: 0.4, transparent: true, opacity: 0.32 });
    this.box(W, H, 0.08, glassM, 0, H / 2, -D / 2, { shadow: false });
    this.addColliderBox(0, -D / 2, W, 0.4);
    const frameM = this.mat(0x0b0a08, { metal: 0.6, rough: 0.4 });
    for (let i = -2; i <= 2; i++) this.box(0.09, H, 0.14, frameM, i * (W / 5), H / 2, -D / 2, { shadow: false });
    this.box(W, 0.12, 0.14, frameM, 0, H - 0.1, -D / 2, { shadow: false });

    // furniture
    this.pSofa(-1.4, -0.6, Math.PI, 0x231521);
    this.pSofa(-3.6, -2.4, Math.PI / 2, 0x1d1218);
    const coffee = this.pTable(-1.4, -2.4, 1.3, 0.7, 0.46, 0x1c1117);
    this.tags.coffeeTable = coffee;
    const bag = this.pHandbag(-1.4, 0.62, -2.4);
    this.tags.handbag = bag;
    this.pPhone(-1.0, 0.52, -2.3, 0.5);
    this.tags.phoneSpot = this.pTable(4.6, -3.6, 1.2, 0.5, 0.85, 0x1a1410); // side table w/ phone dock
    const dock = this.pPhone(4.6, 0.92, -3.6, -0.4);
    this.tags.phoneDock = dock;

    // bar corner
    this.pTable(6.2, 2.6, 1.6, 0.6, 1.0, 0x140e0a);
    this.pPlant(7.2, -4.6);
    this.pPlant(-7.2, -4.6);
    this.pPlant(-7.2, 4.4);

    // pink neon art on east wall
    this.neonStrip(2.6, 7.85, 1.9, 0, 0xff2d7e, Math.PI / 2, 1.8);
    // warm lamps
    this.ceilingLamp(-1.4, H - 0.05, -1.4, 0xffd9a0, 2.6, 8, true);
    this.ceilingLamp(4.5, H - 0.05, 2.5, 0xffc890, 2.0, 8);
    this.point(0xff2d7e, 1.4, 8, 7.4, 1.6, 0);
    // floor lamp by window
    this.box(0.06, 1.5, 0.06, frameM, 3.2, 0.75, -4.6);
    this.point(0xffd9a0, 1.8, 6, 3.2, 1.6, -4.6);

    // front door (south)
    const door = this.pDoor(0, D / 2 - 0.05, 0, 0x1c1410);
    this.tags.frontDoor = door;
    // note prop (for M2)
    const note = this.box(0.22, 0.005, 0.3, this.mat(0xd8d2c4, { rough: 0.9 }), 0.4, 0.02, D / 2 - 0.7, { shadow: false });
    note.visible = false;
    this.tags.note = note;

    // zones
    this.addZone('window', 0, -D / 2 + 1.4, W, 2.8);
    this.addZone('door', 0, D / 2 - 1.2, 4, 2.4);

    // rain outside (visible thru glass) + ambience
    this.rain(900);
  }

  // ---- party hall (M1) ----
  loc_partyHall() {
    this._base(0.03);
    const W = 30, D = 20, H = 4.4;
    this.room(W, D, H, { floorColor: 0x100d12, wallColor: 0x120f17 });
    this.skyline(75);

    // entrance corridor (south middle)
    this.addZone('entrance', 0, D / 2 - 1.5, 5, 3);
    this.addZone('mainHall', 0, -1, 12, 9);

    // dance floor (emissive checker grid)
    const dfMat = this.mat(0x000000, { emissive: 0xffffff, eIntensity: 0.55 });
    dfMat.emissiveMap = makeDancefloorTexture();
    const df = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), dfMat);
    df.rotation.x = -Math.PI / 2;
    df.position.set(0, 0.012, -2);
    this.scene.add(df);
    this.dynamic.push({ update: (dt, t) => { dfMat.emissiveIntensity = 0.4 + Math.sin(t * 2.2) * 0.18; } });

    // columns
    [[-7, -6], [7, -6], [-7, 3], [7, 3]].forEach(([x, z]) => this.pPillar(x, z, 0.45, H, 0x1a1620));

    // bar along east
    const barM = this.mat(0x190f14, { rough: 0.35 });
    this.box(0.8, 1.1, 9, barM, 13.2, 0.55, -2, { collide: true });
    this.box(1.2, 0.06, 9.6, this.mat(0x2a1a22, { rough: 0.2, metal: 0.3 }), 13.2, 1.12, -2);
    this.neonStrip(9, 13.65, 0.35, -2, 0xff2d7e, Math.PI / 2, 2.2);
    // shelves with bottles
    this.box(0.3, 2.2, 9, this.mat(0x0d0a10), 14.7, 1.6, -2, { collide: true });
    for (let i = 0; i < 14; i++) {
      this.box(0.09, 0.3, 0.09,
        this.mat(0x0c0a14, { emissive: [0xff2d7e, 0xc9a45c, 0x4d7fb5][i % 3], eIntensity: 0.5 }),
        14.5, 1.2 + (i % 3) * 0.5, -6 + (i * 0.62), { shadow: false });
    }

    // DJ booth west
    this.box(2.6, 1.2, 1.4, this.mat(0x0e0b12, { rough: 0.4 }), -13, 0.6, -2, { collide: true });
    this.pScreen(-13.4, 1.9, -2, 1.8, 0.9, Math.PI / 2, 0xff2d7e, 0.8);
    this.neonStrip(2.6, -13, 1.35, -1.3, 0xff2d7e, 0, 2.6);

    // VIP corner & tables
    [[-9, 7], [-5, 8], [4, 8], [9, 7], [-10, -8], [10, -8]].forEach(([x, z]) => {
      this.pRoundTable(x, z);
      // glasses
      this.box(0.05, 0.16, 0.05, this.mat(0x223, { rough: 0.1, transparent: true, opacity: 0.7 }), x + 0.15, 1.16, z, { shadow: false });
    });

    // side table with the pink handbag
    const side = this.pTable(8.5, -8.6, 1.2, 0.6, 0.8, 0x1c1117);
    const bag = this.pHandbag(8.5, 0.95, -8.6);
    this.tags.handbag = bag;

    // private elevator NE corner
    const elevM = this.mat(0x16141c, { metal: 0.7, rough: 0.3 });
    this.box(2.6, 3, 0.3, elevM, 12.2, 1.5, -9.7, { collide: true });
    this.box(0.08, 2.4, 0.06, this.mat(0x000000, { emissive: 0xff2d7e, eIntensity: 2.4 }), 12.2, 1.2, -9.5, { shadow: false });
    const elevLab = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.4),
      new THREE.MeshBasicMaterial({ map: makeLabelTexture('PRIVATE ELEVATOR', '#ff8fb8'), transparent: true }));
    elevLab.position.set(12.2, 2.7, -9.5);
    this.scene.add(elevLab);
    this.tags.elevator = elevLab;
    this.addZone('elevator', 12.2, -8.6, 3.2, 2.4);

    // ceiling pin lights
    for (let x = -12; x <= 12; x += 6) for (let z = -8; z <= 8; z += 8) {
      this.box(0.18, 0.04, 0.18, this.mat(0x000000, { emissive: 0xffd9a0, eIntensity: 1.5 }), x, H - 0.04, z, { shadow: false });
    }
    this.ceilingLamp(0, H - 0.05, -2, 0xff5e9e, 5.5, 16, true);
    this.ceilingLamp(-8, H - 0.05, 5, 0xffc890, 2.6, 10);
    this.ceilingLamp(8, H - 0.05, 5, 0xffc890, 2.6, 10);
    this.point(0xff2d7e, 4, 14, -13, 2.4, -2);
    this.point(0xc9a45c, 2.2, 12, 13, 2, -2);

    // moving party light
    const partyLight = this.point(0xff2d7e, 3, 18, 0, H - 0.6, -2);
    this.dynamic.push({ update: (dt, t) => {
      partyLight.position.x = Math.sin(t * 0.7) * 6;
      partyLight.position.z = -2 + Math.cos(t * 0.9) * 4;
      partyLight.color.setHSL(0.93 + Math.sin(t * 0.4) * 0.04, 0.85, 0.55);
    } });
  }

  // ---- farmhouse (M3 + M9) ----
  loc_farmhouse() {
    this._base(0.022);
    // grounds
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), this.mat(0x0a0d08, { rough: 1 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    this.skyline(85);

    // main hall building 24x14 at center-north
    const W = 24, D = 14, H = 3.8, CZ = -8;
    const wallM = this.mat(0x171318, { rough: 0.92 });
    this.room(W, D, H, { floorColor: 0x161210, wallColor: 0x171318, cz: CZ, openings: ['s', 'w', 'e'] });
    // south wall with door gap
    this.box(10, H, 0.25, wallM, -7, H / 2, CZ + D / 2, { collide: true });
    this.box(10, H, 0.25, wallM, 7, H / 2, CZ + D / 2, { collide: true });
    this.box(4, 1.2, 0.25, wallM, 0, H - 0.6, CZ + D / 2);
    this.pDoor(0, CZ + D / 2, 0, 0x241a10);
    // west & east walls with doorway gaps at z = CZ ± 1.1
    [[-12], [12]].forEach(([wx]) => {
      this.box(0.25, H, 5.9, wallM, wx, H / 2, CZ - 4.05, { collide: true });
      this.box(0.25, H, 5.9, wallM, wx, H / 2, CZ + 4.05, { collide: true });
      this.box(0.25, 1.2, 2.4, wallM, wx, H - 0.6, CZ);
    });

    // interior luxury
    this.pSofa(-6, CZ - 2, Math.PI, 0x231521);
    this.pSofa(-6, CZ + 1, 0, 0x1d1218);
    this.pTable(-6, CZ - 0.5, 1.4, 0.8, 0.46);
    [[-9, CZ + 4], [9, CZ + 4], [-9, CZ - 5], [9, CZ - 5]].forEach(([x, z]) => this.pPlant(x, z));
    this.pRoundTable(4, CZ - 2);
    this.pRoundTable(7.5, CZ + 2);
    this.ceilingLamp(0, H - 0.05, CZ, 0xffd9a0, 4.2, 13, true);
    this.ceilingLamp(-7, H - 0.05, CZ, 0xffc890, 2.4, 9);
    this.ceilingLamp(7, H - 0.05, CZ, 0xffc890, 2.4, 9);
    this.point(0xc9a45c, 2.5, 10, 0, 2, CZ + 5);

    // west side room (guest list)
    this.room(8, 8, H, { floorColor: 0x14100e, wallColor: 0x161217, cx: -16, cz: CZ, openings: ['e'] });
    const glTable = this.pTable(-16, CZ, 1.8, 0.9, 0.8, 0x1a1208);
    const ledger = this.box(0.5, 0.05, 0.36, this.mat(0xcfc7b4, { rough: 0.9 }), -16, 0.85, CZ, { shadow: false });
    this.tags.guestlist = ledger;
    this.ceilingLamp(-16, H - 0.05, CZ, 0xffd9a0, 2.2, 8);

    // east wing: meeting room (M9) — north wall has a hidden gap behind the shelf
    this.room(9, 9, H, { floorColor: 0x14100e, wallColor: 0x161217, cx: 16.5, cz: CZ, openings: ['w', 'n'] });
    this.box(3.4, H, 0.25, wallM, 13.7, H / 2, CZ - 4.5, { collide: true });
    this.box(3.4, H, 0.25, wallM, 19.3, H / 2, CZ - 4.5, { collide: true });
    this.box(2.4, 1.0, 0.25, wallM, 16.5, H - 0.5, CZ - 4.5);
    this.pTable(16.5, CZ, 2.6, 1.2, 0.78, 0x1c1208);
    for (let i = 0; i < 4; i++) {
      this.box(0.45, 0.9, 0.45, this.mat(0x14100c), 15 + (i % 2) * 3, 0.45, CZ - 1.6 + Math.floor(i / 2) * 3.2, { collide: true });
    }
    this.ceilingLamp(16.5, H - 0.05, CZ, 0xffc890, 2.6, 9);
    this.addZone('meetingRoom', 16.5, CZ, 8, 8);

    // blackmail room behind shelf (north of meeting room)
    const shelf = this.box(2.4, 2.4, 0.4, this.mat(0x130e0a), 16.5, 1.2, CZ - 4.5, { collide: true });
    this.tags.blackShelf = shelf;
    this.room(6, 5, 3, { floorColor: 0x0e0b10, wallColor: 0x120e14, cx: 16.5, cz: CZ - 7.4, openings: ['s'] });
    // pinboard + screens + PC
    this.pScreen(16.5, 1.7, CZ - 9.6, 1.6, 0.8, 0, 0xff2d7e, 0.5);
    const pc = this.pTable(18, CZ - 8.5, 1.2, 0.6, 0.78);
    this.pScreen(18, 1.35, CZ - 8.8, 0.55, 0.35, 0, 0x88c0ff, 0.8);
    this.tags.uploadPC = pc;
    this.point(0xff2d7e, 2, 7, 16.5, 1.8, CZ - 7.4);
    this.addZone('blackRoom', 16.5, CZ - 7.4, 5.6, 4.6);
    const ledger2 = this.box(0.5, 0.06, 0.36, this.mat(0x1a1414, { rough: 0.8, emissive: 0xff2d7e, eIntensity: 0.12 }), 15.4, 0.83, CZ - 8.5, { shadow: false });
    this.tags.ledger = ledger2;

    // basement door (restricted, NW behind hall)
    const bDoor = this.pDoor(-10, CZ - D / 2 - 0.1, 0, 0x0d0a08, 'B-17');
    this.tags.basementDoor = bDoor;
    this.addZone('basementDoor', -10, CZ - D / 2 - 1, 4, 2.6);

    // lawn: string lights + gate south
    for (let x = -14; x <= 14; x += 4) {
      this.box(0.05, 2.6, 0.05, this.mat(0x0c0a08), x, 1.3, 6);
      this.point(0xffc890, 0.7, 5, x, 2.5, 6);
    }
    // perimeter wall
    const perimM = this.mat(0x101010, { rough: 1 });
    this.box(44, 2.4, 0.4, perimM, 0, 1.2, 14, { collide: true });
    this.box(44, 2.4, 0.4, perimM, 0, 1.2, -22, { collide: true });
    this.box(0.4, 2.4, 36, perimM, -22, 1.2, -4, { collide: true });
    this.box(0.4, 2.4, 36, perimM, 22, 1.2, -4, { collide: true });
    // main gate south (gap)
    this.colliders = this.colliders.filter(b => !(b.min.z > 13 && b.min.x < 3 && b.max.x > -3));
    this.box(19, 2.4, 0.4, perimM, -11.5, 1.2, 14, { collide: true });
    this.box(19, 2.4, 0.4, perimM, 11.5, 1.2, 14, { collide: true });
    this.addZone('gate', 0, 13, 4, 3);
    this.addZone('lawn', 0, 8, 30, 8);
    this.addZone('hall', 0, CZ, 16, 10);
    // service gate west (gap z 1..4)
    this.colliders = this.colliders.filter(b => !(b.min.x < -21 && b.min.z < 5 && b.max.z > 1));
    this.box(0.4, 2.4, 23, perimM, -22, 1.2, -10.5, { collide: true });
    this.box(0.4, 2.4, 10, perimM, -22, 1.2, 9, { collide: true });
    this.addZone('serviceGate', -21, 2.5, 2.6, 3);

    // gate lamps
    this.point(0xffd9a0, 2, 9, 0, 2.6, 13);
    this.point(0xff2d7e, 1.6, 8, -21, 2.2, 3);
    this.rain(0); // no rain here
  }

  // ---- parking (M4) ----
  loc_parking() {
    this._base(0.05);
    const W = 38, D = 26, H = 2.9;
    this.room(W, D, H, { floorColor: 0x131316, wallColor: 0x151518 });
    // pillars grid
    for (let x = -14; x <= 14; x += 7) for (let z = -9; z <= 9; z += 9) {
      this.box(0.7, H, 0.7, this.mat(0x1b1b20, { rough: 0.8 }), x, H / 2, z, { collide: true });
      // painted stripe
      this.box(0.72, 0.5, 0.72, this.mat(0x3d2d10, { emissive: 0xc9a45c, eIntensity: 0.12 }), x, 0.6, z, { shadow: false });
    }
    // cars
    [[-10, -5, 0.1, 0x15161c], [-5.5, -5.2, -0.06, 0x1a1216], [3, -5, 0.04, 0x10141a],
     [8, -5.2, 0, 0x16161a], [-10, 5.4, 3.2, 0x191920], [-4, 5.2, 3.1, 0x121218],
     [9, 5.3, 3.18, 0x1c141a]].forEach(([x, z, ry, c]) => this.pCar(x, z, ry, c));
    // van (hide spot)
    const van = new THREE.Group();
    const vb = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 5), this.mat(0x14171c, { rough: 0.6 }));
    vb.position.y = 1.15; van.add(vb);
    van.position.set(14.5, 0, 5.6);
    this.scene.add(van);
    this.addColliderBox(14.5, 5.6, 2.3, 5.2);
    this.tags.van = van;
    this.addZone('vanHide', 14.5, 9, 5, 2.6);

    // fluorescent tubes (flicker)
    for (let x = -14; x <= 14; x += 7) {
      const tube = this.box(2.2, 0.06, 0.12, this.mat(0x000000, { emissive: 0xbfd4e8, eIntensity: 1.4 }), x, H - 0.06, 0, { shadow: false });
      const l = this.point(0xbfd4e8, 1.8, 10, x, H - 0.4, 0);
      if (x === 0 || x === -14) this.flickerLight(l, 1.8, 13);
    }
    this.point(0xff2d7e, 1.6, 9, 17.5, 1.8, 9); // pink exit sign glow
    const exitLab = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4),
      new THREE.MeshBasicMaterial({ map: makeLabelTexture('EXIT  ▸', '#ff5e9e'), transparent: true }));
    exitLab.position.set(18.4, 2.2, 9); exitLab.rotation.y = -Math.PI / 2;
    this.scene.add(exitLab);

    // Ayan's corner: crates NE
    this.box(0.8, 0.8, 0.8, this.mat(0x191510), 16.6, 0.4, -9.5, { collide: true });
    this.box(0.7, 0.6, 0.7, this.mat(0x161310), 15.7, 0.3, -10.2, { collide: true });
    this.addZone('ayanCorner', 15.5, -8.5, 6, 5);
    this.addZone('exit', 17.6, 9, 3, 4);
    this.point(0xffc890, 1, 6, 16, 2.2, -9);
  }

  // ---- cafe (M5) ----
  loc_cafe() {
    this._base(0.03);
    const W = 15, D = 11, H = 3;
    this.room(W, D, H, { floorColor: 0x191410, wallColor: 0x16110e, openings: ['s'] });
    // front glass + street
    this.skyline(50);
    const glassM = this.mat(0x0a1018, { rough: 0.05, metal: 0.3, transparent: true, opacity: 0.3 });
    this.box(W, H, 0.08, glassM, 0, H / 2, D / 2, { shadow: false });
    this.addColliderBox(0, D / 2, W, 0.4);
    // neon cafe sign (backwards, outside)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8),
      new THREE.MeshBasicMaterial({ map: makeLabelTexture('CAFE  SARANG', '#ff5e9e'), transparent: true }));
    sign.position.set(0, 2.6, D / 2 + 0.4); sign.rotation.y = Math.PI;
    this.scene.add(sign);
    this.point(0xff2d7e, 2.4, 8, 0, 2.4, D / 2 - 0.5);

    // counter
    this.box(0.7, 1.05, 5, this.mat(0x1d130c, { rough: 0.4 }), -6.6, 0.52, -1.5, { collide: true });
    this.box(1, 0.05, 5.4, this.mat(0x2a1c12, { rough: 0.25 }), -6.6, 1.07, -1.5);
    // espresso machine
    this.box(0.6, 0.5, 0.5, this.mat(0x26262c, { metal: 0.7, rough: 0.3 }), -6.6, 1.35, -3.2, { shadow: false });
    this.point(0xffc890, 1.6, 6, -6.6, 1.9, -1.5);

    // tables
    [[-2.5, -2.5], [1.5, -3], [4.8, -2], [-2, 2], [4.5, 2.4]].forEach(([x, z]) => {
      this.pRoundTable(x, z, 0.5, 0.76);
      // chairs
      [[0.9, 0], [-0.9, 0]].forEach(([ox, oz]) => {
        this.box(0.42, 0.5, 0.42, this.mat(0x140f0a), x + ox, 0.25, z + oz, { collide: true, shadow: false });
        this.box(0.42, 0.55, 0.08, this.mat(0x140f0a), x + ox + (ox > 0 ? 0.18 : -0.18), 0.78, z + oz, { shadow: false });
      });
    });
    this.tags.mahnoorTable = this.zones; // placeholder
    this.addZone('mahnoorTable', 4.8, -2, 3.4, 3);
    this.addZone('door', 0, D / 2 - 1, 3, 2);
    // warm hanging bulbs
    [[-2.5, -2.5], [1.5, -3], [4.8, -2], [-2, 2]].forEach(([x, z]) => {
      this.box(0.02, 0.7, 0.02, this.mat(0x0a0a0a), x, H - 0.35, z, { shadow: false });
      this.point(0xffb070, 1.1, 4.5, x, H - 0.75, z);
    });
    this.ceilingLamp(0, H - 0.05, 0, 0xffc890, 1.6, 9);
    this.rain(700);
  }

  // ---- court complex (M6) ----
  loc_court() {
    this._base(0.024);
    this.skyline(80);
    // long outdoor walkway
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 60), this.mat(0x131316, { rough: 0.7 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    // walkway strip
    const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 46), this.mat(0x1a1a1e, { rough: 0.5 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -3);
    this.scene.add(path);
    // barriers each side
    const barM = this.mat(0x222228, { metal: 0.6, rough: 0.4 });
    for (let z = 16; z >= -20; z -= 2.4) {
      [-3.4, 3.4].forEach(x => {
        this.box(0.06, 1, 0.06, barM, x, 0.5, z, { shadow: false });
        this.box(0.06, 0.06, 2.4, barM, x, 0.95, z - 1.2, { shadow: false });
      });
    }
    this.addColliderBox(-3.7, -3, 0.5, 46);
    this.addColliderBox(3.7, -3, 0.5, 46);
    // court building facade north
    const fac = this.mat(0x18151c, { rough: 0.85 });
    this.box(34, 9, 1, fac, 0, 4.5, -26, { collide: true });
    [[-8], [8]].forEach(([x]) => this.pPillar(x, -25, 0.7, 9, 0x1d1a22));
    [[-13], [13]].forEach(([x]) => this.pPillar(x, -25, 0.7, 9, 0x1d1a22));
    // steps
    for (let i = 0; i < 3; i++) {
      this.box(14, 0.18, 1.2, this.mat(0x1c1920), 0, 0.09 + i * 0.18, -22.6 - i * 1.2);
    }
    // door
    const door = this.pDoor(0, -25.4, 0, 0x241a10, 'CITY COURT');
    this.tags.courtDoor = door;
    this.addZone('courtDoor', 0, -23.5, 5, 3.4);
    this.addZone('midway', 0, -8, 7, 4);
    // lamps
    for (let z = 12; z >= -20; z -= 8) {
      [-4.2, 4.2].forEach(x => {
        this.box(0.07, 3.4, 0.07, barM, x, 1.7, z);
        this.point(0xcfe0f0, 1.8, 8, x, 3.3, z);
      });
    }
    this.point(0xffd9a0, 3, 18, 0, 6, -24);
    this.policeFlash(8, 2, 8, 7);
    this.rain(1100);
  }

  // ---- evidence basement (M7) ----
  loc_basement() {
    this._base(0.055);
    const W = 32, D = 17, H = 2.7;
    this.room(W, D, H, { floorColor: 0x101113, wallColor: 0x121316 });
    // shelf rows
    const rows = [-5, -1.5, 2, 5.5];
    rows.forEach((z, ri) => {
      for (let x = -12; x <= 6; x += 3.2) {
        if (ri === 2 && x > -3 && x < 3) continue; // gap
        const sh = this.box(2.8, 2.1, 0.7, this.mat(0x191b20, { rough: 0.8 }), x, 1.05, z, { collide: true });
        // boxes on shelves
        for (let i = 0; i < 3; i++) {
          this.box(0.5, 0.34, 0.45, this.mat(0x1f1a12, { rough: 1 }),
            x - 0.9 + i * 0.9, 0.6 + (i % 2) * 0.75, z, { shadow: false });
        }
      }
    });
    // file cabinets along east wall: 11..18
    for (let i = 0; i < 8; i++) {
      this.pCabinet(14.6, -6.5 + i * 1.9, -Math.PI / 2, 11 + i);
      if (11 + i === 17) this.addZone('cab17', 13.4, -6.5 + i * 1.9, 2.4, 1.8);
    }
    this.tags.cab17z = -6.5 + 6 * 1.9;
    // greenish industrial lights
    for (let x = -12; x <= 12; x += 8) {
      const l = this.point(0xbfe0c8, 1.5, 9, x, H - 0.3, 0);
      if (x === -4) this.flickerLight(l, 1.5, 9);
      this.box(1.6, 0.05, 0.1, this.mat(0x000000, { emissive: 0xbfe0c8, eIntensity: 1 }), x, H - 0.05, 0, { shadow: false });
    }
    // pink EXIT sign west
    const exitLab = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4),
      new THREE.MeshBasicMaterial({ map: makeLabelTexture('◂ EXIT', '#ff5e9e'), transparent: true }));
    exitLab.position.set(-15.4, 2.2, 0); exitLab.rotation.y = Math.PI / 2;
    this.scene.add(exitLab);
    this.point(0xff2d7e, 1.8, 8, -15, 2, 0);
    this.addZone('exit', -15, 0, 2.6, 5);
    this.addZone('entry', -15, 6.5, 3, 3);
    // stairs visual at entry
    for (let i = 0; i < 3; i++) this.box(2.4, 0.16, 0.8, this.mat(0x16171a), -15.4, 0.08 + i * 0.16, 6.8 + i * 0.5);
  }

  // ---- safe house (M8) ----
  loc_safehouse() {
    this._base(0.05);
    // bedroom
    this.room(6.5, 6, 2.7, { floorColor: 0x14110e, wallColor: 0x141217, cx: -6, cz: 0, openings: ['e'] });
    // bed
    this.box(1.6, 0.45, 2.2, this.mat(0x1c1822, { rough: 1 }), -7.4, 0.22, -1, { collide: true });
    this.box(1.5, 0.12, 0.6, this.mat(0x2a2433), -7.4, 0.52, -1.8, { shadow: false });
    this.point(0x4d7fb5, 0.6, 5, -6, 2.2, 0);
    // hallway
    this.room(8, 2.6, 2.7, { floorColor: 0x121013, wallColor: 0x141217, cx: -0.5, cz: 0, openings: ['e', 'w'] });
    // living room
    this.room(8, 7, 2.7, { floorColor: 0x14110e, wallColor: 0x141217, cx: 6.5, cz: 0, openings: ['w'] });
    const evTable = this.pTable(6.5, -1.5, 1.6, 0.8, 0.78);
    this.tags.evidenceTable = evTable;
    const bag = this.pHandbag(8.6, 0.6, 1.8);
    this.tags.handbag = bag;
    this.box(0.7, 0.5, 0.7, this.mat(0x16120e), 8.6, 0.25, 1.8, { collide: true }); // chair under bag
    this.pSofa(5, 2.2, Math.PI, 0x191420);
    this.point(0xffc890, 1.4, 7, 6.5, 2.2, 0);
    this.flickerLight(this.point(0xbfd4e8, 1, 6, -0.5, 2.3, 0), 1, 16);
    // front door (east wall of living room)
    this.pDoor(10.4, 0, Math.PI / 2, 0x1a120c);
    // back stairs door (north of bedroom)
    const back = this.pDoor(-6, -3, 0, 0x10160e, 'BACK STAIRS');
    this.tags.backStairs = back;
    this.addZone('backStairs', -6, -2.4, 2.6, 1.8);
    this.addZone('hallway', -0.5, 0, 7, 2.2);
    this.addZone('living', 6.5, 0, 7, 6);
    this.addZone('bedroom', -6, 0, 5.5, 5.5);
  }

  // ---- rooftop (M10) ----
  loc_rooftop() {
    this._base(0.03);
    this.skyline(65);
    const W = 26, D = 18;
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(W, D), this.mat(0x101013, { rough: 0.5, metal: 0.15 }));
    roof.rotation.x = -Math.PI / 2;
    this.scene.add(roof);
    // parapet
    const pm = this.mat(0x16161a, { rough: 0.9 });
    this.box(W, 1.1, 0.4, pm, 0, 0.55, -D / 2, { collide: true });
    this.box(W, 1.1, 0.4, pm, 0, 0.55, D / 2, { collide: true });
    this.box(0.4, 1.1, D, pm, -W / 2, 0.55, 0, { collide: true });
    this.box(0.4, 1.1, D, pm, W / 2, 0.55, 0, { collide: true });
    // bulkhead door
    this.box(3, 2.6, 2.4, this.mat(0x141418, { rough: 0.9 }), -10, 1.3, 6, { collide: true });
    this.pDoor(-10, 4.8, 0, 0x0e0c0a);
    // AC units & vents
    [[-4, -4], [2, -5.5], [7, -2], [4, 4.5]].forEach(([x, z]) => {
      this.box(1.6, 1, 1.6, this.mat(0x191a20, { metal: 0.4, rough: 0.6 }), x, 0.5, z, { collide: true });
      this.box(1.2, 0.08, 1.2, this.mat(0x0d0d10), x, 1.05, z, { shadow: false });
    });
    // antenna mast with pink beacon
    this.box(0.16, 7, 0.16, this.mat(0x1c1c22, { metal: 0.7 }), 9.5, 3.5, -6);
    const beacon = this.box(0.3, 0.3, 0.3, this.mat(0x000000, { emissive: 0xff2d7e, eIntensity: 4 }), 9.5, 7.1, -6, { shadow: false });
    const beaconL = this.point(0xff2d7e, 6, 24, 9.5, 7, -6);
    this.dynamic.push({ update: (dt, t) => {
      const v = 0.5 + 0.5 * Math.sin(t * 2.4);
      beacon.material.emissiveIntensity = 1.5 + v * 4;
      beaconL.intensity = (2 + v * 7) * 9;
    } });
    this.tags.beacon = beacon;
    this.addZone('ledge', 9.5, -7.4, 6, 3);
    this.addZone('center', 0, 0, 6, 6);
    // cold blue side light + police below
    this.point(0x4d7fb5, 2, 16, -8, 3, -4);
    this.policeFlash(0, -6, 16, 10);
    this.rain(1600);
  }
}
