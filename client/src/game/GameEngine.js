import { TERRAIN, FORTS, STARTING_UNITS, MAP_WIDTH, MAP_HEIGHT } from './MapData.js';
// Note: GEO_TERRAIN import removed — terrain is now per-battlefield via setGeoTerrain()

// ═══════════════════════════════════════════════════════════════
//  HISTORICAL SCALE
//  Every distance below is stated in METRES and converted to screen
//  pixels through the live map projection, so a range means the same
//  patch of ground no matter how far the player has zoomed in.
// ═══════════════════════════════════════════════════════════════

// 1 real second = 75 game seconds (1.25 game minutes).
const TIME_SCALE = 75;

// Effective fire ranges. Rifle-muskets were sighted to 500 yards but the
// overwhelming majority of Civil War infantry fire was delivered inside
// 200 yards; beyond that, hits were incidental. Field artillery worked at
// up to ~1,400 yards with shot and shell.
const RANGE_M = { infantry: 300, cavalry: 250, cannon: 1200, commander: 0 };

// Canister range — the point at which a gun stops being artillery and
// becomes an enormous shotgun. Double canister at this distance is what
// tore the head off Pickett's Charge.
const CANISTER_M = 350;

// How far a body of troops can DETECT the enemy. Cavalry were the eyes of
// the army; infantry saw only as far as their skirmish line; commanders had
// staff officers and signal stations working for them.
const SIGHT_M = { infantry: 700, cavalry: 1600, cannon: 900, commander: 1300 };

// Close assault — bayonet range at this map scale.
const CLOSE_ASSAULT_M = 120;

// Couriers, voice and the personal presence of a general officer.
const COMMANDER_AURA_M = 850;

// Formation spacing. Friendly units dress on each other; enemy lines close
// to within a stone's throw before the assault is decided.
const ALLY_SPACING_M = 180;
const ENEMY_SPACING_M = 85;

// Flag / objective capture radius.
const CAPTURE_M = 260;
const CAPTURE_SECONDS = 6;

// Casualties inflicted per real second, as a fraction of the firing
// strength, before any modifier. Tuned so a stand-up firefight at close
// range costs both sides roughly a third of their strength in half an
// hour of game time — the tempo of the Cornfield or the Wheatfield.
const FIRE_RATE = 0.016;

// Morale cost of losses: a unit that loses a quarter of its strength sheds
// roughly half its morale. Regiments historically broke between 30% and 50%.
const MORALE_PER_LOSS = 210;

// Relative killing power per man. A gunner is worth more than a musket, but
// a battery is a handful of men — the multiplier is per head, not per gun.
const TYPE_POWER = { infantry: 1.0, cavalry: 0.75, cannon: 1.4, commander: 0 };

// Rounds in a cartridge box. Running a unit dry and having to pull it out
// of line was one of the routine facts of Civil War command.
const AMMO_CAPACITY = 40;

// Seconds between volleys (real time). Fire was delivered in ordered
// volleys, not as a continuous stream.
const VOLLEY_INTERVAL = { infantry: 1.7, cavalry: 1.25, cannon: 2.4, commander: 99 };

// How long a stale enemy sighting stays on the map before staff stops
// trusting it.
const CONTACT_MEMORY_S = 22;

export class GameEngine {
  constructor() {
    this.bases = [];
    this.groups = [];
    this.dyingGroups = [];
    this.effects = [];
    this.smoke = [];
    this.contacts = { 1: new Map(), 2: new Map() };
    this.startStrength = { 1: 1, 2: 1 };
    this.groupIdCounter = 0;
    this.effectIdCounter = 0;
    this.aiTimer = 0;
    this.selectedGroupIds = new Set();
    this.mapWidth = 1600;
    this.mapHeight = 1000;
    this.running = false;
    this._terrainCache = new Map();
    this._smokeGrid = new Map();
    this._smokeCell = 48;
  }

  setProjections(latLngToPixel, pixelToLatLng) {
    this.latLngToPixel = latLngToPixel;
    this.pixelToLatLng = pixelToLatLng;
    this._terrainCache.clear();
  }

  setGeoTerrain(geoTerrain) {
    this.geoTerrain = geoTerrain;
    this._terrainCache.clear();
  }

  // ─── Map scale helpers ───────────────────────────────────────
  // Leaflet metres-per-pixel, adjusted for latitude.
  metersPerPixel() {
    const zoom = this.currentZoom || 14;
    const lat = this.centerLat != null ? this.centerLat : 39.46;
    return (Math.cos(lat * Math.PI / 180) * 40075016.686) / (256 * Math.pow(2, zoom));
  }

  mToPx(metres) {
    return metres / this.metersPerPixel();
  }

  pxToM(pixels) {
    return pixels * this.metersPerPixel();
  }

  // Init from a battlefield definition with pixel-converted coordinates
  initFromBattlefield(forts, units, mapWidth, mapHeight, geoTerrain) {
    this.mapWidth = mapWidth || 1600;
    this.mapHeight = mapHeight || 1000;
    this.geoTerrain = geoTerrain || null;
    this._terrainCache.clear();
    this.bases = forts.map(f => ({
      id: f.id, x: f.x, y: f.y,
      lat: f.lat, lng: f.lng,
      owner: f.owner,
      label: f.label,
      capture: 0,
      captureBy: 0,
    }));
    this.groups = [];
    this.dyingGroups = [];
    this.effects = [];
    this.smoke = [];
    this.contacts = { 1: new Map(), 2: new Map() };
    this.groupIdCounter = 0;
    this.aiTimer = 0;
    this.time = 0;
    this.selectedGroupIds = new Set();

    for (const u of units) {
      this.groups.push(this._makeGroup(u));
    }

    this.startStrength = { 1: 0, 2: 0 };
    for (const g of this.groups) {
      if (g.unitType !== 'commander') this.startStrength[g.owner] += g.count;
    }
    this.startStrength[1] = Math.max(1, this.startStrength[1]);
    this.startStrength[2] = Math.max(1, this.startStrength[2]);

    this._faceEnemy();
    this.computeVisibility(1, 0);
    this.computeVisibility(2, 0);
    for (const g of this.groups) g.visible = g.owner === 1 ? true : g.visibleTo1;
    this.updateSightPolygons(1);
  }

  _makeGroup(u) {
    return {
      id: ++this.groupIdCounter,
      owner: u.owner,
      x: u.x, y: u.y,
      lat: u.lat, lng: u.lng,          // ← store for reprojection on map move
      path: [],
      count: u.count,
      startCount: u.count,
      unitType: u.unitType,
      label: u.label,
      speed: 0,
      angle: 0,
      morale: 100,
      isBroken: false,
      ammo: u.unitType === 'commander' ? 0 : AMMO_CAPACITY,
      pending: 0,          // casualties owed to the current target, paid on the next volley
      pendingTargetId: null,
      reload: Math.random() * (VOLLEY_INTERVAL[u.unitType] || 2),
      underFire: 0,
      contact: 0,          // seconds since this unit was last in action
      lastFired: 0,
      fireTimer: 0,
      visibleTo1: u.owner === 1,
      visibleTo2: u.owner === 2,
    };
  }

  // Set initial combat facing so troops spawn already oriented toward the enemy
  _faceEnemy() {
    for (const g of this.groups) {
      const enemies = this.groups.filter(e => e.owner !== g.owner && e.count > 0);
      if (enemies.length > 0) {
        const ex = enemies.reduce((s, e) => s + e.x, 0) / enemies.length;
        const ey = enemies.reduce((s, e) => s + e.y, 0) / enemies.length;
        g.angle = Math.atan2(ey - g.y, ex - g.x);
      } else {
        g.angle = g.owner === 1 ? Math.PI : 0;
      }
    }
  }

  // Legacy init from old MapData (fallback)
  initMap() {
    this.mapWidth = MAP_WIDTH;
    this.mapHeight = MAP_HEIGHT;
    this.bases = FORTS.map(f => ({
      id: f.id, x: f.x, y: f.y,
      owner: f.owner,
      label: f.label,
      capture: 0,
      captureBy: 0,
    }));
    this.groups = [];
    this.dyingGroups = [];
    this.effects = [];
    this.smoke = [];
    this.contacts = { 1: new Map(), 2: new Map() };
    this.groupIdCounter = 0;
    this.aiTimer = 0;
    this.time = 0;
    this.selectedGroupIds = new Set();

    for (const u of STARTING_UNITS) this.groups.push(this._makeGroup(u));

    this.startStrength = { 1: 0, 2: 0 };
    for (const g of this.groups) {
      if (g.unitType !== 'commander') this.startStrength[g.owner] += g.count;
    }
    this.startStrength[1] = Math.max(1, this.startStrength[1]);
    this.startStrength[2] = Math.max(1, this.startStrength[2]);

    this._faceEnemy();
  }

  // Re-project all unit/base positions after map pan or zoom
  reprojectFromLatLng(latLngToPixel) {
    this.latLngToPixel = latLngToPixel;
    this._terrainCache.clear();
    for (const g of this.groups) {
      if (g.lat != null && g.lng != null) {
        const { x, y } = latLngToPixel(g.lat, g.lng);
        g.x = x;
        g.y = y;
      }
      // Re-project stored path waypoints
      if (g.path && g.path.length > 0) {
        for (const p of g.path) {
          if (p.lat != null && p.lng != null) {
            const { x, y } = latLngToPixel(p.lat, p.lng);
            p.x = x;
            p.y = y;
          }
        }
      }
    }
    for (const b of this.bases) {
      if (b.lat != null && b.lng != null) {
        const { x, y } = latLngToPixel(b.lat, b.lng);
        b.x = x;
        b.y = y;
      }
    }
    // Sightings and smoke are pinned to the ground, not to the screen.
    for (const side of [1, 2]) {
      for (const c of this.contacts[side].values()) {
        if (c.lat != null && c.lng != null) {
          const { x, y } = latLngToPixel(c.lat, c.lng);
          c.x = x; c.y = y;
        }
      }
    }
    for (const s of this.smoke) {
      if (s.lat != null && s.lng != null) {
        const { x, y } = latLngToPixel(s.lat, s.lng);
        s.x = x; s.y = y;
      }
    }
    // Effects are short-lived screen flashes — drop them rather than skew them.
    this.effects.length = 0;
    for (const g of this.groups) g._polyX = null;
    this.updateSightPolygons(1);
  }

  // Marching speeds: Infantry ~2.5 mph, Cavalry ~5 mph, Artillery ~1.8 mph.
  getBaseSpeed(unitType) {
    const baseMps = {
      infantry: 1.1,   // ~2.5 mph
      cavalry: 2.2,    // ~5.0 mph
      cannon: 0.8,     // ~1.8 mph
      commander: 1.8   // ~4.0 mph
    }[unitType] || 1.1;
    return this.mToPx(baseMps * TIME_SCALE);
  }

  // Fire range in pixels at the current map scale.
  getRange(unitType) {
    return this.mToPx(RANGE_M[unitType] != null ? RANGE_M[unitType] : 250);
  }

  getRangeMeters(unitType) {
    return RANGE_M[unitType] != null ? RANGE_M[unitType] : 250;
  }

  getSightMeters(unitType) {
    return SIGHT_M[unitType] != null ? SIGHT_M[unitType] : 600;
  }

  getSightRange(unitType) {
    return this.mToPx(this.getSightMeters(unitType));
  }

  getCommanderAura() {
    return this.mToPx(COMMANDER_AURA_M);
  }

  // ─── Frontage ────────────────────────────────────────────────
  // The ground a body of troops actually covers when formed for battle.
  // Two ranks at roughly a pace a file: a 400-man regiment holds about 250
  // yards of line, a 6-gun battery about 120. Drawing units at their real
  // frontage is what makes the ranges above read honestly on the map.
  getFrontageMeters(g) {
    const c = Math.max(1, g.count || 1);
    switch (g.unitType) {
      case 'cavalry':   return Math.min(600, Math.max(70, 40 + c * 0.70));
      case 'cannon':    return Math.min(400, Math.max(50, 30 + c * 0.90));
      case 'commander': return 90;
      default:          return Math.min(650, Math.max(70, 40 + c * 0.55));
    }
  }

  // Floored at a legible size — a map symbol you cannot see or click is no
  // use to anybody, however honest its scale.
  getFrontagePx(g) {
    return Math.max(22, this.mToPx(this.getFrontageMeters(g)));
  }

  getDepthPx(g) {
    const ratio = g.unitType === 'cannon' ? 0.42 : g.unitType === 'cavalry' ? 0.26 : 0.2;
    return Math.max(5, this.getFrontagePx(g) * ratio);
  }

  // ─── Terrain lookup (cached on a coarse pixel grid) ──────────
  getTerrainAt(x, y) {
    if (!this.geoTerrain || !this.geoTerrain.features || !this.pixelToLatLng) {
      return TERRAIN.grass;
    }
    if (isNaN(x) || isNaN(y)) return TERRAIN.grass;

    const key = ((x / 6) | 0) * 100000 + ((y / 6) | 0);
    const cached = this._terrainCache.get(key);
    if (cached) return cached;

    const result = this._terrainLookup(x, y);
    if (this._terrainCache.size > 40000) this._terrainCache.clear();
    this._terrainCache.set(key, result);
    return result;
  }

  _terrainLookup(x, y) {
    const loc = this.pixelToLatLng(x, y);
    if (!loc) return TERRAIN.grass;
    const { lat, lng } = loc;

    // Ray-Casting point-in-polygon against GeoJSON features
    for (const feature of this.geoTerrain.features) {
      const geom = feature.geometry;
      let rings = [];

      if (geom.type === 'Polygon') {
        rings = [geom.coordinates[0]];
      } else if (geom.type === 'MultiPolygon') {
        rings = geom.coordinates.map(poly => poly[0]);
      } else {
        continue;
      }

      for (const ring of rings) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const xi = ring[i][0], yi = ring[i][1];
          const xj = ring[j][0], yj = ring[j][1];
          const intersect = ((yi > lat) !== (yj > lat)) &&
              (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) {
          return TERRAIN[feature.properties.type] || TERRAIN.grass;
        }
      }
    }

    return TERRAIN.grass;
  }

  getEffectiveRange(group) {
    const base = this.getRange(group.unitType);
    const terrain = this.getTerrainAt(group.x, group.y);
    const isCannon = group.unitType === 'cannon';
    // A gun on a ridge commands the whole field; a gun in a thicket cannot
    // see fifty yards. Infantry in timber fought at pistol range.
    const mult = terrain.label === 'High Ground' ? (isCannon ? 1.5 : 1.2)
      : terrain.label === 'Open Field' ? 1.1
      : terrain.label === 'Woods' || terrain.label === 'Forest' ? (isCannon ? 0.18 : 0.45)
      : terrain.label === 'Building' ? 0.6
      : terrain.label === 'Wheat Field' ? 0.75
      : terrain.label === 'Orchard' ? 0.7
      : terrain.label === 'Marsh' ? (isCannon ? 0.3 : 0.7)
      : terrain.label === 'Creek' || terrain.label === 'River' ? (isCannon ? 0.2 : 0.75)
      : terrain.label === 'Sunken Road' ? (isCannon ? 0.2 : 0.8)
      : 1.0;
    return base * mult;
  }

  // ─── Line of sight ───────────────────────────────────────────
  // Returns 1.0 for a clear view down to ~0.1 when the ground between two
  // points is choked with timber or buildings. Ridges mask what lies behind
  // them unless the observer is himself on high ground.
  lineOfSightFactor(ax, ay, bx, by, observerTerrain) {
    const dist = Math.hypot(bx - ax, by - ay);
    if (dist < 10) return 1;
    const steps = Math.min(12, Math.max(3, Math.round(dist / 16)));
    const observerHigh = observerTerrain && observerTerrain.label === 'High Ground';
    let blocked = 0, sampled = 0;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const terr = this.getTerrainAt(ax + (bx - ax) * t, ay + (by - ay) * t);
      sampled++;
      if (!terr.blocksSight) continue;
      // Crest masking only works on the man in the low ground.
      if (terr.label === 'High Ground' && observerHigh) continue;
      blocked += terr.blocksSight;
    }
    if (!sampled) return 1;
    return Math.max(0.1, 1 - (blocked / sampled) * 1.5);
  }

  // ─── Powder smoke ────────────────────────────────────────────
  // Black powder produced enormous volumes of white smoke that hung over
  // the firing line in still air, blinding both sides. It is tracked as a
  // real obstruction, not just decoration.
  spawnSmoke(x, y, radiusPx, density) {
    const puff = {
      x, y,
      r0: radiusPx * 0.45,
      r: radiusPx,
      density,
      t: 0,
      life: 3.2 + Math.random() * 1.6,
      drift: 0.35 + Math.random() * 0.4,
      seed: Math.random(),
    };
    if (this.pixelToLatLng) {
      const loc = this.pixelToLatLng(x, y);
      if (loc) { puff.lat = loc.lat; puff.lng = loc.lng; }
    }
    this.smoke.push(puff);
    if (this.smoke.length > 260) this.smoke.splice(0, this.smoke.length - 260);
  }

  updateSmoke(dt) {
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.t += dt;
      if (s.t >= s.life) { this.smoke.splice(i, 1); continue; }
      // A light breeze off the ridges drifts the bank downfield.
      s.y -= s.drift * dt * 6;
      if (this.pixelToLatLng) {
        const loc = this.pixelToLatLng(s.x, s.y);
        if (loc) { s.lat = loc.lat; s.lng = loc.lng; }
      }
    }

    // Coarse density grid so sight checks stay cheap.
    const cell = this._smokeCell;
    const grid = this._smokeGrid;
    grid.clear();
    for (const s of this.smoke) {
      const age = s.t / s.life;
      const d = s.density * (1 - age) * (1 - age);
      if (d <= 0.01) continue;
      const r = s.r0 + (s.r - s.r0) * age;
      const x0 = Math.floor((s.x - r) / cell), x1 = Math.floor((s.x + r) / cell);
      const y0 = Math.floor((s.y - r) / cell), y1 = Math.floor((s.y + r) / cell);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          const k = gx * 100000 + gy;
          grid.set(k, (grid.get(k) || 0) + d);
        }
      }
    }
  }

  // 0 = clear air, up to ~0.75 = you are firing at the flashes and nothing else.
  smokeBetween(ax, ay, bx, by) {
    const grid = this._smokeGrid;
    if (!grid || grid.size === 0) return 0;
    const cell = this._smokeCell;
    let total = 0;
    const samples = 4;
    for (let i = 1; i <= samples; i++) {
      const t = i / (samples + 1);
      const sx = ax + (bx - ax) * t, sy = ay + (by - ay) * t;
      total += grid.get(Math.floor(sx / cell) * 100000 + Math.floor(sy / cell)) || 0;
    }
    return Math.min(0.75, (total / samples) * 0.4);
  }

  // ─── Fog of war ──────────────────────────────────────────────
  // How far a given unit can see, after terrain. Exposed so the renderer
  // draws exactly the same fog the engine enforces.
  observerSight(observer) {
    let sight = this.getSightRange(observer.unitType);
    const t = this.getTerrainAt(observer.x, observer.y);

    // Signal stations and observation posts went on the hills for a reason.
    if (t.label === 'High Ground') {
      sight *= observer.unitType === 'commander' ? 1.9
             : observer.unitType === 'cannon' ? 1.7
             : observer.unitType === 'cavalry' ? 1.5
             : 1.4;
    }
    if (t.label === 'Woods') sight *= 0.35;
    if (t.label === 'Building') sight *= 0.55;
    if (t.label === 'Marsh') sight *= 0.55;
    if (t.label === 'Creek' || t.label === 'Sunken Road') sight *= 0.55;
    if (t.label === 'Wheat Field') sight *= 0.7;   // a man in tall corn sees nothing
    if (t.label === 'Orchard') sight *= 0.75;
    if (t.label === 'Road') sight *= 1.1;
    // A broken unit is not scouting anything; it is running.
    if (observer.isBroken) sight *= 0.5;
    return sight;
  }

  // Compute which enemy groups each side can see, and record the sighting.
  // Civil War generals fought half-blind: Lee lost track of Stuart for days,
  // and whole corps disappeared into the Wilderness.
  computeVisibility(owner, dt) {
    const key = owner === 1 ? 'visibleTo1' : 'visibleTo2';
    const friendly = this.groups.filter(g => g.owner === owner && g.count > 0);
    const enemies = this.groups.filter(g => g.owner !== owner && g.count > 0);
    const memory = this.contacts[owner];

    // Pre-compute each observer's reach once.
    const obs = friendly.map(f => ({
      g: f,
      terr: this.getTerrainAt(f.x, f.y),
      sight: this.observerSight(f),
    }));

    for (const e of enemies) {
      const eTerrain = this.getTerrainAt(e.x, e.y);
      let seen = false;

      for (const o of obs) {
        let sight = o.sight;

        // ── Concealment offered by the ground the enemy stands on ──
        if (eTerrain.label === 'Woods') sight *= 0.45;
        else if (eTerrain.label === 'Building') sight *= 0.6;
        else if (eTerrain.label === 'Sunken Road') sight *= 0.5;   // Bloody Lane was invisible until close
        else if (eTerrain.label === 'Wheat Field') sight *= 0.6;
        else if (eTerrain.label === 'Marsh') sight *= 0.65;
        else if (eTerrain.label === 'Creek') sight *= 0.7;
        else if (eTerrain.label === 'High Ground') sight *= 1.25;  // silhouetted on the ridge

        // ── What the enemy is doing ──
        if (e.isMoving) sight *= 1.3;                 // dust, noise, glinting arms
        if (e.isBroken) sight *= 1.35;                // a rout is loud
        if (e.fireTimer > 0) sight *= 2.2;            // muzzle flash and smoke give a battery away
        else if (e.underFire > 0) sight *= 1.2;
        if (e.count > 800) sight *= 1.25;
        else if (e.count < 60) sight *= 0.8;

        const dist = Math.hypot(o.g.x - e.x, o.g.y - e.y);
        if (dist > sight) continue;

        // A unit that is firing on us is located by its flashes and its noise,
        // whatever the smoke — men fought whole engagements seeing nothing but
        // the flame of the opposing line.
        if (e.fireTimer > 0 && dist < this.getEffectiveRange(o.g) * 1.2) { seen = true; break; }

        // Timber, buildings and intervening ridges break the sightline.
        const los = this.lineOfSightFactor(o.g.x, o.g.y, e.x, e.y, o.terr);
        // Powder smoke shortens the view without closing it entirely.
        const smoke = 1 - this.smokeBetween(o.g.x, o.g.y, e.x, e.y) * 0.55;
        if (dist < sight * los * smoke) { seen = true; break; }
      }

      e[key] = seen;
      if (seen) {
        // Record a fresh sighting for the staff map.
        const rec = memory.get(e.id) || {};
        rec.id = e.id;
        rec.owner = e.owner;
        rec.unitType = e.unitType;
        rec.count = e.count;
        rec.x = e.x; rec.y = e.y;
        rec.lat = e.lat; rec.lng = e.lng;
        rec.age = 0;
        memory.set(e.id, rec);
      }
    }

    // Own units are always visible to their own commander.
    for (const f of friendly) f[key] = true;

    // Age out stale reports.
    for (const [id, rec] of memory) {
      rec.age += dt;
      if (rec.age > CONTACT_MEMORY_S) memory.delete(id);
    }
  }

  isVisibleTo(group, owner) {
    return owner === 1 ? group.visibleTo1 : group.visibleTo2;
  }

  // The actual shape of what a unit can see: rays are cast outward and cut
  // short where they run into timber, buildings or an intervening crest, so
  // woods and ridges throw real blind spots across the field instead of the
  // tidy circle a range check would give.
  sightPolygon(g, rayCount = 40) {
    const maxR = this.observerSight(g);
    const terr = this.getTerrainAt(g.x, g.y);
    const observerHigh = terr.label === 'High Ground';
    const step = Math.max(6, maxR / 22);
    // However blind a unit is, it knows the ground it is standing on.
    const minR = Math.min(maxR, this.mToPx(140));

    const reach = new Array(rayCount);
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const cos = Math.cos(a), sin = Math.sin(a);
      let r0 = maxR;
      for (let r = step; r <= maxR; r += step) {
        const t = this.getTerrainAt(g.x + cos * r, g.y + sin * r);
        if (!t.blocksSight) continue;
        if (t.label === 'High Ground' && observerHigh) continue;
        // Vision dies out a little way inside the obstruction, not at its edge.
        r0 = Math.min(maxR, r + step * (1 - t.blocksSight) * 2.5);
        break;
      }
      reach[i] = Math.max(minR, r0);
    }

    // Soften the ray edges — a sightline does not end in a razor spike, and
    // the eye reads a smooth horizon far better than a starburst.
    const pts = new Array(rayCount);
    for (let i = 0; i < rayCount; i++) {
      const p = reach[(i - 1 + rayCount) % rayCount];
      const n = reach[(i + 1) % rayCount];
      const r = reach[i] * 0.5 + p * 0.25 + n * 0.25;
      const a = (i / rayCount) * Math.PI * 2;
      pts[i] = [g.x + Math.cos(a) * r, g.y + Math.sin(a) * r];
    }
    return { maxR, pts };
  }

  // Recomputed only when a unit has actually moved, and staggered across
  // frames, so the fog stays cheap with a full order of battle on the map.
  updateSightPolygons(owner) {
    for (const g of this.groups) {
      if (g.owner !== owner || g.count <= 0) continue;
      const moved = g._polyX == null ||
        Math.hypot(g.x - g._polyX, g.y - g._polyY) > 4 ||
        this.time - (g._polyTime || 0) > 700;
      if (!moved) continue;
      g.sight = this.sightPolygon(g);
      g._polyX = g.x; g._polyY = g.y; g._polyTime = this.time;
    }
  }

  getBase(id) {
    return this.bases.find(b => b.id === id);
  }

  update(deltaMs) {
    if (!this.running) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.time = (this.time || 0) + deltaMs;

    // Reset per-frame visual state
    for (const g of this.groups) {
      g.isEngaged = false;
      g.justFired = false;
      g.wasHit = false;
      if (g.fireTimer > 0) g.fireTimer -= dt;
      if (g.underFire > 0) g.underFire -= dt;
    }

    this.updateSmoke(dt);
    this.updateEffects(dt);

    // AI
    this.aiTimer += dt;
    if (this.aiTimer > 1.5) {
      this.aiTimer = 0;
      this.updateAI();
    }

    // Fog-of-war is resolved before movement and combat so that nobody
    // shoots at what they cannot see.
    this.computeVisibility(1, dt);
    this.computeVisibility(2, dt);
    for (const g of this.groups) g.visible = g.owner === 1 ? true : g.visibleTo1;

    this.moveGroups(dt);
    this.separateGroups();
    this.resolveFire(dt);
    this.resolveCloseAssault(dt);
    this.resolveCaptures(dt);
    this.cleanupDead(dt);
    this.updateMoraleAndFacing(dt);
    this.updateSightPolygons(1);

    // Sync geographic coordinates with visual pixels so panning re-projects them correctly
    if (this.pixelToLatLng) {
      for (const g of this.groups) {
        const loc = this.pixelToLatLng(g.x, g.y);
        if (loc) {
          g.lat = loc.lat;
          g.lng = loc.lng;
        }
      }
    }
  }

  // ─── Movement ────────────────────────────────────────────────
  moveGroups(dt) {
    for (let i = this.groups.length - 1; i >= 0; i--) {
      const g = this.groups[i];

      if (!g.path || g.path.length === 0) {
        if (g.isMoving) {
          g.isMoving = false;
          g.stopTime = this.time;
        }
        continue;
      }

      const target = g.path[0];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const dist = Math.hypot(dx, dy);

      // Guard against NaN waypoints or zero distance
      if (isNaN(dist) || dist < 8) {
        g.path.shift();
        continue;
      }

      const terrain = this.getTerrainAt(g.x, g.y);
      if (!terrain.passable) {
        g.x += (dx / dist) * 4;
        g.y += (dy / dist) * 4;
        continue;
      }

      let speedMult = terrain.speed;

      // Climbing penalty: moving INTO a hill from lower ground is slow work,
      // and guns had to be manhandled up by hand.
      const destTerrain = this.getTerrainAt(g.x + (dx / dist) * 15, g.y + (dy / dist) * 15);
      if (destTerrain.label === 'High Ground' && terrain.label !== 'High Ground') {
        speedMult = g.unitType === 'cannon' ? 0.2 : 0.4;
      }

      // Routed men run; they do not march.
      if (g.isBroken) speedMult *= 1.35;
      // Shaken units drag their feet.
      else if (g.morale < 50) speedMult *= 0.85;

      const effectiveSpeed = this.getBaseSpeed(g.unitType) * speedMult;
      const moveDist = effectiveSpeed * dt;

      // Smooth rotation: low-pass filter toward movement direction
      let targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - g.angle;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // If the destination is behind the unit, it backs away facing the enemy.
      if (Math.abs(diff) > Math.PI / 2) {
        targetAngle += Math.PI;
        diff = targetAngle - g.angle;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
      }

      // Ponderous, deliberate wheeling — a line of battle does not pivot fast.
      g.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.4 * dt);

      g.isMoving = true;
      if (moveDist >= dist) {
        g.x = target.x;
        g.y = target.y;
      } else {
        g.x += (dx / dist) * moveDist;
        g.y += (dy / dist) * moveDist;
      }

      g.x = Math.max(5, Math.min(this.mapWidth - 5, g.x));
      g.y = Math.max(5, Math.min(this.mapHeight - 5, g.y));
      if (isNaN(g.x) || isNaN(g.y)) {
        g.x = this.mapWidth / 2;
        g.y = this.mapHeight / 2;
        g.path = [];
      }
    }
  }

  separateGroups() {
    const allySpacing = this.mToPx(ALLY_SPACING_M);
    const enemySpacing = this.mToPx(ENEMY_SPACING_M);
    for (let i = 0; i < this.groups.length; i++) {
      const a = this.groups[i];
      for (let j = i + 1; j < this.groups.length; j++) {
        const b = this.groups[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.1) {
          a.x += Math.random() - 0.5;
          a.y += Math.random() - 0.5;
          continue;
        }

        const sameSide = a.owner === b.owner;
        const minDist = sameSide ? allySpacing : enemySpacing;
        if (dist < minDist) {
          const overlap = minDist - dist;
          // Friendly units dress on each other; enemy lines refuse to merge.
          const force = sameSide ? 0.3 : 0.8;
          const pushX = (dx / dist) * overlap * force;
          const pushY = (dy / dist) * overlap * force;

          a.x -= pushX * 0.5;
          a.y -= pushY * 0.5;
          b.x += pushX * 0.5;
          b.y += pushY * 0.5;
        }
      }
    }
  }

  // ─── Fire combat ─────────────────────────────────────────────
  // Each body of troops picks ONE target and pours its fire into it. Damage
  // accumulates between volleys and is delivered as a single crashing
  // discharge, the way a line of battle actually fought.
  resolveFire(dt) {
    const alive = this.groups.filter(g => g.count > 0);

    for (const g of alive) {
      if (g.reload > 0) g.reload -= dt;

      if (g.unitType === 'commander') { g.targetId = null; continue; }

      const canFire = !g.isBroken && g.ammo > 0 &&
        (g.unitType !== 'cannon'
          ? !g.isMoving
          // Guns must be unlimbered and laid before they can open — about a
          // minute and a half of game time.
          : (!g.isMoving && (this.time - (g.stopTime || 0) >= 1200)));

      if (!canFire) {
        g.targetId = null;
        this.dumpPending(g);
        continue;
      }

      const target = this.pickTarget(g);
      if (!target) {
        g.targetId = null;
        this.dumpPending(g);
        continue;
      }

      if (g.pendingTargetId !== target.id) this.dumpPending(g);
      g.targetId = target.id;
      g.pendingTargetId = target.id;
      g.isEngaged = true;
      target.isEngaged = true;

      g.pending += this.fireRateAgainst(g, target) * dt;

      if (g.reload <= 0) this.fireVolley(g, target);
    }
  }

  pickTarget(g) {
    const rangePx = this.getEffectiveRange(g);
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.groups) {
      if (e.owner === g.owner || e.count <= 0) continue;
      const dist = Math.hypot(e.x - g.x, e.y - g.y);
      if (dist > rangePx) continue;
      if (!this.isVisibleTo(e, g.owner)) continue;
      // Close targets first, but gunners drew fire and a wavering line
      // invited the finishing volley.
      let score = 1 - dist / rangePx;
      if (e.unitType === 'cannon') score += 0.35;
      if (e.morale < 45) score += 0.25;
      if (e.isBroken) score -= 0.4;      // no point wasting powder on fugitives
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // Men who can actually bring a musket to bear on this target. A deep
  // formation cannot fire through its own front rank — extra depth absorbs
  // casualties rather than adding to the volume of fire.
  firingStrength(g) {
    return Math.min(g.count, 120 + g.count * 0.45);
  }

  // Casualties per real second, before the volley is delivered.
  fireRateAgainst(shooter, target) {
    const dist = Math.hypot(target.x - shooter.x, target.y - shooter.y);
    const rangePx = this.getEffectiveRange(shooter);
    const sTerr = this.getTerrainAt(shooter.x, shooter.y);
    const tTerr = this.getTerrainAt(target.x, target.y);

    let dmg = this.firingStrength(shooter) * FIRE_RATE * (TYPE_POWER[shooter.unitType] || 1);

    dmg *= this.rangeFalloff(shooter, dist, rangePx);
    dmg *= sTerr.offense;
    dmg *= this.exposure(target, tTerr);
    dmg /= this.coverFactor(shooter, target, tTerr, sTerr);
    dmg *= this.flankMult(shooter, target);
    dmg *= this.facingMult(shooter, target);
    // Shaken men fire high and load badly.
    dmg *= 0.55 + 0.45 * Math.max(0, Math.min(1, (shooter.morale || 0) / 100));
    dmg *= this.ammoFactor(shooter);
    dmg *= 1 - this.smokeBetween(shooter.x, shooter.y, target.x, target.y) * 0.45;
    dmg *= this.lineOfSightFactor(shooter.x, shooter.y, target.x, target.y, sTerr);

    if (shooter.unitType === 'cannon') dmg *= this.canisterMult(dist);

    // Horsemen who ride at a formed, steady line of infantry are shot out of
    // the saddle. Civil War cavalry knew it and almost never tried.
    if (shooter.unitType === 'cavalry' && target.unitType === 'infantry'
        && !target.isBroken && !target.isMoving) {
      dmg *= 0.55;
    }
    return Math.max(0, dmg);
  }

  rangeFalloff(shooter, dist, rangePx) {
    const r = Math.min(1, dist / Math.max(1, rangePx));
    if (shooter.unitType === 'cannon') {
      // Shot and shell carried, but laying a gun accurately at long range
      // was another matter.
      return Math.max(0.2, 1 - 0.78 * r * r);
    }
    // Rifle-muskets were murderous inside 150 yards and close to useless
    // past 300 — trajectory, black powder fouling, and untrained sights.
    return Math.max(0.1, 1 - 0.92 * r * r);
  }

  // How good a target the enemy presents. Troops crossing open ground could
  // neither lie down nor use cover; halted men did both.
  exposure(target, tTerr) {
    let e = target.isMoving ? 1.35 : 0.85;
    if (target.unitType === 'cavalry') e *= 1.35;   // horse and rider stand head and shoulders up
    if (target.unitType === 'cannon') e *= 0.75;    // gunners work spread around the pieces
    if (target.isBroken) e *= 1.3;                  // a rout shows its back
    if (target.count > 600) e *= 1.1;               // a deep mass cannot be missed
    if (tTerr.label === 'Road') e *= 1.15;          // caught in column on the pike
    return e;
  }

  coverFactor(shooter, target, tTerr, sTerr) {
    let def = tTerr.defense;
    // Cover you are walking through is cover you are not using.
    if (target.isMoving) def = 1 + (def - 1) * 0.45;
    if (target.isBroken) def = 1 + (def - 1) * 0.4;
    // Guns on a ridge fire down into the treetops and find the men beneath.
    if (shooter.unitType === 'cannon' && sTerr.label === 'High Ground' && tTerr.blocksSight) {
      def = 1 + (def - 1) * 0.4;
    }
    return Math.max(0.5, def);
  }

  canisterMult(dist) {
    const canister = this.mToPx(CANISTER_M);
    if (dist > canister) return 1;
    // Canister — and double canister at the last moment — is what artillery
    // was really for. It stopped assaults dead at Malvern Hill and Gettysburg.
    return 1 + 1.9 * (1 - dist / canister);
  }

  ammoFactor(g) {
    if (g.ammo <= 0) return 0;
    if (g.ammo < 8) return 0.45;   // husbanding the last rounds
    return 1;
  }

  // Enfilade. Fire that takes a line in flank or rear rakes its whole length
  // and no formation of the period could answer it.
  flankMult(attacker, defender) {
    const angleToAttacker = Math.atan2(attacker.y - defender.y, attacker.x - defender.x);
    let diff = angleToAttacker - (defender.angle || 0);
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const behind = Math.abs(diff) / Math.PI;   // 0 = front, 1 = rear
    return 1.0 + behind * 0.9;
  }

  // A unit firing across its own front does far less than one squarely faced.
  facingMult(attacker, target) {
    const angleToTarget = Math.atan2(target.y - attacker.y, target.x - attacker.x);
    let diff = angleToTarget - (attacker.angle || 0);
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const alignment = 1.0 - Math.abs(diff) / Math.PI;
    return 0.45 + alignment * 0.55;
  }

  dumpPending(g) {
    if (g.pending > 0 && g.pendingTargetId != null) {
      const t = this.groups.find(x => x.id === g.pendingTargetId);
      if (t) this.applyCasualties(t, g.pending, g, false);
    }
    g.pending = 0;
    g.pendingTargetId = null;
  }

  fireVolley(g, target) {
    const casualties = g.pending;
    g.pending = 0;
    g.reload = (VOLLEY_INTERVAL[g.unitType] || 2) * (0.85 + Math.random() * 0.3);
    g.ammo = Math.max(0, g.ammo - 1);
    g.lastFired = this.time;
    g.justFired = true;
    g.contact = 6;
    g.fireTimer = g.unitType === 'cannon' ? 0.45 : 0.3;

    if (casualties > 0) this.applyCasualties(target, casualties, g, true);
    this.spawnVolleyEffect(g, target);
  }

  applyCasualties(target, casualties, shooter, isVolley) {
    const before = Math.max(1, target.count);
    target.count -= casualties;
    target.wasHit = true;
    target.underFire = 3.0;
    target.contact = 6;

    // Morale follows losses, and losses taken from an unexpected quarter
    // hurt out of all proportion to their number.
    const frac = casualties / before;
    let shock = frac * MORALE_PER_LOSS;
    const flank = this.flankMult(shooter, target);
    shock *= 1 + (flank - 1) * 2.2;                 // enfilade is a morale weapon first
    if (shooter.unitType === 'cannon') shock *= 1.4; // being shelled unnerved men beyond the harm done
    if (target.unitType === 'cannon') shock *= 1.2;  // gunners cannot reply to what they cannot see
    target.morale -= shock;

    if (isVolley && casualties > 0.5) {
      this.spawnImpactEffect(target, shooter, casualties / before);
    }
  }

  // ─── Close assault ───────────────────────────────────────────
  // Bayonet wounds accounted for well under one per cent of Civil War
  // casualties. Assaults were decided by nerve: one side broke, almost
  // always before contact. Losses here are light; the morale swing is brutal.
  resolveCloseAssault(dt) {
    const closePx = this.mToPx(CLOSE_ASSAULT_M);
    for (let i = 0; i < this.groups.length; i++) {
      const a = this.groups[i];
      if (a.count <= 0) continue;
      for (let j = i + 1; j < this.groups.length; j++) {
        const b = this.groups[j];
        if (b.count <= 0 || a.owner === b.owner) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > closePx) continue;

        const aPow = this.assaultPower(a, b);
        const bPow = this.assaultPower(b, a);
        const total = aPow + bPow;
        if (total <= 0) continue;
        const aShare = aPow / total;

        // The losing side's nerve goes first.
        a.morale -= (1 - aShare) * 34 * dt;
        b.morale -= aShare * 34 * dt;
        a.isEngaged = true;
        b.isEngaged = true;
        a.inMelee = true;
        b.inMelee = true;

        // Modest, mutual bloodletting.
        const bite = 0.012 * dt;
        a.count -= b.count * bite * (1 - aShare) * 2;
        b.count -= a.count * bite * aShare * 2;
        a.wasHit = true; b.wasHit = true;
        a.underFire = 2.0; b.underFire = 2.0;
      }
    }
  }

  assaultPower(g, foe) {
    const terr = this.getTerrainAt(g.x, g.y);
    let p = g.count * Math.max(0.15, g.morale / 100);
    if (g.isBroken) p *= 0.25;

    if (g.unitType === 'cavalry') {
      // Sabres are decisive against broken men, wagon trains and gun crews;
      // they are worthless against a formed line that stands.
      p *= (foe.isBroken || foe.unitType === 'cannon') ? 2.4 : 0.5;
    }
    if (g.unitType === 'cannon') {
      // Artillery caught at close quarters is spiked and taken.
      p *= 0.25;
    }
    if (g.unitType === 'commander') p *= 0.1;

    // Defending a wall, a sunken lane or a house is worth a great deal.
    p *= Math.max(0.6, terr.defense);
    // Being taken in flank while receiving an assault is fatal.
    p /= this.flankMult(foe, g);
    return Math.max(0.01, p);
  }

  // ─── Objectives ──────────────────────────────────────────────
  // A position is not taken by riding past it. It has to be occupied and
  // held while nobody is contesting it.
  resolveCaptures(dt) {
    const radius = this.mToPx(CAPTURE_M);
    for (const base of this.bases) {
      let attacker = 0, defender = 0;
      for (const g of this.groups) {
        if (g.count <= 0 || g.isBroken) continue;
        if (Math.hypot(g.x - base.x, g.y - base.y) > radius) continue;
        if (g.owner === base.owner) defender += g.count;
        else attacker += g.count;
      }

      if (attacker > 0 && defender === 0) {
        const owner = this.groups.find(g =>
          g.count > 0 && !g.isBroken && g.owner !== base.owner &&
          Math.hypot(g.x - base.x, g.y - base.y) <= radius)?.owner;
        if (base.captureBy !== owner) { base.captureBy = owner; base.capture = 0; }
        base.capture += dt / CAPTURE_SECONDS;
        if (base.capture >= 1) {
          const oldOwner = base.owner;
          base.owner = base.captureBy;
          base.capture = 0;
          base.captureBy = 0;
          this.onBaseCaptured(base, oldOwner);
        }
      } else {
        // Contested or abandoned — the assault loses its grip.
        base.capture = Math.max(0, base.capture - dt / (CAPTURE_SECONDS * 0.6));
        if (base.capture <= 0) base.captureBy = 0;
      }
    }
  }

  // Losing a key position shook the troops who could see it happen; distant
  // brigades heard about it hours later, if at all.
  onBaseCaptured(base, oldOwner) {
    const reach = this.mToPx(COMMANDER_AURA_M * 2.2);
    for (const u of this.groups) {
      if (u.count <= 0) continue;
      const d = Math.hypot(u.x - base.x, u.y - base.y);
      if (d > reach) continue;
      const falloff = 1 - d / reach;
      if (u.owner === base.owner) u.morale = Math.min(100, u.morale + 14 * falloff);
      else if (u.owner === oldOwner) u.morale = Math.max(0, u.morale - 16 * falloff);
    }
  }

  cleanupDead(dt) {
    for (let i = this.groups.length - 1; i >= 0; i--) {
      const dead = this.groups[i];
      if (isNaN(dead.count)) dead.count = 0;
      if (dead.count > 0) continue;

      // The death of a general was felt across the whole line — Jackson at
      // Chancellorsville, Reynolds on the first day at Gettysburg.
      if (dead.unitType === 'commander') {
        const reach = this.getCommanderAura() * 1.5;
        for (const g of this.groups) {
          if (g.owner === dead.owner && g.id !== dead.id) {
            const d = Math.hypot(g.x - dead.x, g.y - dead.y);
            if (d < reach) {
              const falloff = 1 - d / reach;
              g.morale = Math.max(0, g.morale - 40 * falloff);
            }
          }
        }
      } else {
        // Watching the regiment on your flank go to pieces is contagious.
        const reach = this.mToPx(500);
        for (const g of this.groups) {
          if (g.owner !== dead.owner || g.id === dead.id) continue;
          const d = Math.hypot(g.x - dead.x, g.y - dead.y);
          if (d < reach) g.morale = Math.max(0, g.morale - 12 * (1 - d / reach));
        }
      }

      this.dyingGroups.push({ ...dead, fadeTimer: 1.0 });
      this.selectedGroupIds.delete(dead.id);
      this.contacts[1].delete(dead.id);
      this.contacts[2].delete(dead.id);
      this.groups.splice(i, 1);
    }

    this.groups = this.groups.filter(g => g.count > 0);

    for (let i = this.dyingGroups.length - 1; i >= 0; i--) {
      this.dyingGroups[i].fadeTimer -= dt * 0.8;
      if (this.dyingGroups[i].fadeTimer <= 0) this.dyingGroups.splice(i, 1);
    }
  }

  // ─── Morale, ammunition, rally and facing ────────────────────
  updateMoraleAndFacing(dt) {
    const captureRadius = this.mToPx(CAPTURE_M);
    const aura = this.getCommanderAura();

    for (const g of this.groups) {
      if (g.count <= 0) continue;
      g.inMelee = false;

      let nearestFlag = null;
      let minDist = Infinity;
      let atFlag = false;
      for (const base of this.bases) {
        if (base.owner !== g.owner) continue;
        const dist = Math.hypot(g.x - base.x, g.y - base.y);
        if (dist < minDist) { minDist = dist; nearestFlag = base; }
        if (dist < captureRadius) atFlag = true;
      }

      // ── Ammunition ──
      // Ordnance wagons parked with the trains; a regiment that shot itself
      // out had to go back for cartridges. Scavenging from the dead and the
      // wounded's boxes keeps a unit in the fight, but never keeps up with
      // the rate it is burning powder — the only real cure is the rear.
      if (g.contact > 0) g.contact -= dt;
      if (g.unitType !== 'commander' && g.ammo < AMMO_CAPACITY) {
        if (atFlag) g.ammo = Math.min(AMMO_CAPACITY, g.ammo + 4 * dt);
        else if (g.contact <= 0) g.ammo = Math.min(AMMO_CAPACITY, g.ammo + 0.45 * dt);
      }

      // ── Morale recovery ──
      if (atFlag) {
        g.morale = Math.min(100, g.morale + 14 * dt);
      } else if (g.underFire <= 0 && !g.isEngaged) {
        // Out of contact, officers dress the ranks and men come back to
        // their colours. Broken units re-form faster once they are clear.
        g.morale = Math.min(100, g.morale + (g.isBroken ? 4.5 : 2.4) * dt);
      }

      // ── Commander's presence ──
      if (g.unitType !== 'commander') {
        for (const cmd of this.groups) {
          if (cmd.unitType !== 'commander' || cmd.owner !== g.owner || cmd.count <= 0) continue;
          const cmdDist = Math.hypot(g.x - cmd.x, g.y - cmd.y);
          if (cmdDist >= aura) continue;
          const falloff = 1 - cmdDist / aura;
          if (cmd.isBroken || cmd.morale < 30) {
            g.morale = Math.max(0, g.morale - 15 * falloff * dt);
          } else {
            // A general riding the line steadies it — and can rally men who
            // have already run.
            g.morale = Math.min(100, g.morale + (g.isBroken ? 12 : 7) * falloff * dt);
          }
          cmd.isEngaged = true;
        }
      }

      g.morale = Math.max(0, Math.min(100, g.morale));

      // ── Break and rally ──
      if (g.morale < 30 && !g.isBroken) {
        g.isBroken = true;
        g.path = [];
        this.selectedGroupIds.delete(g.id);
      }
      if (g.morale > 55 && g.isBroken) {
        g.isBroken = false;
        g.path = [];
      }

      // Routed men make for the rear and the nearest friendly colours.
      if (g.isBroken && nearestFlag && (!g.path || g.path.length === 0)) {
        g.path = [this._wp(nearestFlag.x, nearestFlag.y)];
      }

      // Stationary units face the nearest enemy they can actually see.
      if (!g.isMoving && !g.isBroken) {
        let closestEnemy = null;
        let closestDist = Infinity;
        for (const e of this.groups) {
          if (e.owner === g.owner || e.count <= 0) continue;
          if (!this.isVisibleTo(e, g.owner)) continue;
          const dist = Math.hypot(e.x - g.x, e.y - g.y);
          if (dist < closestDist) { closestDist = dist; closestEnemy = e; }
        }

        const faceRange = Math.max(this.getEffectiveRange(g), this.mToPx(400));
        if (closestEnemy && (closestDist < faceRange ||
            (g.unitType === 'commander' && closestDist < aura))) {
          const targetAngle = Math.atan2(closestEnemy.y - g.y, closestEnemy.x - g.x);
          let diff = targetAngle - g.angle;
          while (diff <= -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          g.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.4 * dt);
        }
      }
    }
  }

  // ─── Volley effects (visual data produced by the engine) ─────
  // Generated once, at the instant of firing, so a volley reads as one
  // crashing discharge instead of random per-frame noise.
  spawnVolleyEffect(g, target) {
    const dx = target.x - g.x, dy = target.y - g.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;      // toward the target
    const px = -uy, py = ux;                   // along the firing line

    const isCannon = g.unitType === 'cannon';
    // The volley is drawn on the unit's real firing face.
    const frontage = this.getFrontagePx(g);
    const depth = this.getDepthPx(g);

    // Each flash stands for a company's worth of muskets, or for a gun.
    const flashCount = isCannon
      ? Math.max(2, Math.min(6, Math.round(frontage / 30)))
      : Math.max(4, Math.min(12, Math.round(frontage / 26)));

    // Flame is sized off the depth of the formation, so it always sits in
    // proportion to the line that made it, at any zoom.
    const flame = Math.max(1.5, depth * (isCannon ? 0.42 : 0.26));
    const muzzleOffset = depth * 0.5 + flame * 0.5;
    const scale = Math.max(0.5, flame / 2.4);

    const flashes = [];
    for (let i = 0; i < flashCount; i++) {
      const t = flashCount === 1 ? 0 : (i / (flashCount - 1) - 0.5);
      const along = t * frontage * 0.88 + (Math.random() - 0.5) * frontage * 0.04;
      flashes.push({
        x: g.x + px * along + ux * muzzleOffset,
        y: g.y + py * along + uy * muzzleOffset,
        // A volley rolls down the line from the right of the company — it is
        // never truly simultaneous, and at this time compression that roll is
        // what makes it read as a volley rather than a flicker.
        delay: (t + 0.5) * (isCannon ? 0.05 : 0.13),
        size: flame * (isCannon ? 1 : 0.75 + Math.random() * 0.45),
        len: flame * (isCannon ? 4.5 : 2.6 + Math.random()),
        spread: (Math.random() - 0.5) * (isCannon ? 0.05 : 0.16),
      });
    }

    const puffs = [];
    const puffCount = isCannon ? 3 : Math.max(2, Math.round(flashCount / 2));
    const puffR = depth * (isCannon ? 1.4 : 0.9);
    for (let i = 0; i < puffCount; i++) {
      const t = puffCount === 1 ? 0 : (i / (puffCount - 1) - 0.5);
      const along = t * frontage * 0.9;
      const sx = g.x + px * along + ux * muzzleOffset * 1.25;
      const sy = g.y + py * along + uy * muzzleOffset * 1.25;
      puffs.push({ x: sx, y: sy, r: puffR, seed: Math.random() });
      this.spawnSmoke(sx, sy, puffR, isCannon ? 0.3 : 0.18);
    }

    this.effects.push({
      id: ++this.effectIdCounter,
      kind: isCannon ? 'cannon' : 'musket',
      owner: g.owner,
      x: g.x, y: g.y,
      ux, uy, px, py,
      frontage,
      depth,
      scale,
      tx: target.x, ty: target.y,
      dist,
      flashes,
      puffs,
      t: 0,
      life: isCannon ? 1.5 : 1.1,
    });

    if (this.effects.length > 90) this.effects.splice(0, this.effects.length - 90);
  }

  spawnImpactEffect(target, shooter, severity) {
    const dx = target.x - shooter.x, dy = target.y - shooter.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const scale = Math.max(0.55, Math.min(1.6, this.mToPx(250) / 34));
    const n = Math.max(2, Math.min(7, Math.round(severity * 220)));
    const spurts = [];
    for (let i = 0; i < n; i++) {
      spurts.push({
        ox: (Math.random() - 0.5) * 22 * scale,
        oy: (Math.random() - 0.5) * 12 * scale,
        r: (1.4 + Math.random() * 2.2) * scale,
        delay: Math.random() * 0.12,
      });
    }
    this.effects.push({
      id: ++this.effectIdCounter,
      kind: 'impact',
      owner: target.owner,
      x: target.x - ux * 3, y: target.y - uy * 3,
      spurts,
      severity,
      t: 0,
      life: 0.5,
    });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      if (e.t >= e.life) this.effects.splice(i, 1);
    }
  }

  getGroupPower(group) {
    if (!group || isNaN(group.count) || group.count < 0) return 0.1;
    const mult = { infantry: 1.0, cavalry: 0.8, cannon: 1.5 };
    const basePower = group.count * (mult[group.unitType] || 1.0);
    const moraleFactor = Math.max(0.1, group.morale / 100);
    return Math.max(0.1, basePower * moraleFactor);
  }

  // Create a waypoint with geo-coordinates for pan-safe reprojection
  _wp(x, y) {
    const wp = { x, y };
    if (this.pixelToLatLng) {
      const loc = this.pixelToLatLng(x, y);
      if (loc) { wp.lat = loc.lat; wp.lng = loc.lng; }
    }
    return wp;
  }

  redirectGroup(groupId, targetX, targetY) {
    const g = this.groups.find(gr => gr.id === groupId);
    if (g) {
      g.path = [this._wp(targetX, targetY)];
    }
  }

  orderPath(groupIds, pathPoints) {
    const count = groupIds.length;
    groupIds.forEach((id) => {
      const g = this.groups.find(gr => gr.id === id);
      if (!g) return;
      // Broken troops do not take orders; they have to be rallied first.
      if (g.isBroken) return;
      // Drop leading waypoints that are near the unit (avoids backward movement)
      let startIdx = 0;
      while (startIdx < pathPoints.length - 1 &&
             Math.hypot(pathPoints[startIdx].x - g.x, pathPoints[startIdx].y - g.y) < 30) {
        startIdx++;
      }
      const trimmed = pathPoints.slice(startIdx);
      const spread = count > 1 ? 6 : 0;
      g.path = trimmed.map(p => {
        const px = p.x + (Math.random() * spread * 2 - spread);
        const py = p.y + (Math.random() * spread * 2 - spread);
        return this._wp(px, py);
      });
    });
  }

  setSelection(ids) {
    this.selectedGroupIds = new Set(ids);
  }

  toggleSelection(id) {
    if (this.selectedGroupIds.has(id)) {
      this.selectedGroupIds.delete(id);
    } else {
      this.selectedGroupIds.add(id);
    }
  }

  deselectAll() { this.selectedGroupIds.clear(); }

  // ─── AI ──────────────────────────────────────────────────────
  // The Confederate command fights the battle it can see. It reacts to
  // sightings — current and remembered — not to perfect knowledge of the
  // Union order of battle.
  updateAI() {
    const aiGroups = this.groups.filter(g => g.owner === 2 && g.count > 0 && !g.isBroken);
    const enemyBases = this.bases.filter(b => b.owner === 1);
    const friendlyBases = this.bases.filter(b => b.owner === 2);

    // What CSA staff believes about Union positions.
    const known = [];
    for (const rec of this.contacts[2].values()) {
      const live = this.groups.find(g => g.id === rec.id && g.count > 0);
      const fresh = live && live.visibleTo2;
      known.push({
        x: fresh ? live.x : rec.x,
        y: fresh ? live.y : rec.y,
        count: fresh ? live.count : rec.count,
        unitType: rec.unitType,
        morale: fresh ? live.morale : 100,
        isBroken: fresh ? live.isBroken : false,
        fresh,
        age: rec.age,
      });
    }

    // ── Posture ──
    // A commander who knows he is outnumbered does not walk into the other
    // fellow's fire. Lee stood on the defensive at Antietam and Fredericksburg
    // and made the Federals come to him; the AI does the same, judging only by
    // what its own scouts have actually reported.
    const observed = known.reduce((s, e) => s + e.count, 0);
    const myStrength = this.sideStrength(2);
    const onDefensive = observed > myStrength * 1.1;

    for (const g of aiGroups) {
      if (g.unitType === 'commander') {
        // A general keeps behind his line, within reach of his brigades.
        const aura = this.getCommanderAura();
        const nearby = aiGroups.filter(a => a.id !== g.id && Math.hypot(a.x - g.x, a.y - g.y) < aura);
        if (nearby.length < 2 && aiGroups.length > 1) {
          const cx = aiGroups.reduce((s, a) => s + a.x, 0) / aiGroups.length;
          const cy = aiGroups.reduce((s, a) => s + a.y, 0) / aiGroups.length;
          g.path = [this._wp(cx + (Math.random() * 40 - 20), cy + (Math.random() * 40 - 20))];
        } else {
          g.path = [];
        }
        continue;
      }

      // Shot out — fall back on the trains rather than stand and be shot at.
      if (g.ammo < 6 && friendlyBases.length > 0) {
        const depot = friendlyBases.reduce((best, b) =>
          Math.hypot(b.x - g.x, b.y - g.y) < Math.hypot(best.x - g.x, best.y - g.y) ? b : best);
        g.path = [this._wp(depot.x, depot.y)];
        continue;
      }

      const range = this.getEffectiveRange(g);
      let nearest = null, nearestDist = Infinity;
      let inRange = null;
      for (const e of known) {
        const d = Math.hypot(e.x - g.x, e.y - g.y);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
        if (e.fresh && d < range && (!inRange || e.count < inRange.count)) inRange = e;
      }

      // ── ARTILLERY: seek the high ground, unlimber, and stay there ──
      if (g.unitType === 'cannon') {
        if (inRange) { g.path = []; continue; }
        if (nearest) {
          const hill = this.findNearbyHill(g, this.mToPx(700));
          if (hill && Math.hypot(hill.x - g.x, hill.y - g.y) > this.mToPx(120)) {
            g.path = [this._wp(hill.x, hill.y)];
          } else if (nearestDist > range * 1.05) {
            const step = nearestDist - range * 0.8;
            g.path = [this._wp(g.x + (nearest.x - g.x) / nearestDist * step,
                               g.y + (nearest.y - g.y) / nearestDist * step)];
          } else {
            g.path = [];
          }
        }
        continue;
      }

      // ── CAVALRY: screen, scout, and ride down what is already beaten ──
      if (g.unitType === 'cavalry') {
        // Pursuit of a broken command was the one charge that always paid.
        const beaten = known.filter(e => e.fresh && (e.isBroken || e.morale < 35));
        if (beaten.length > 0) {
          const t = beaten.reduce((best, e) =>
            Math.hypot(e.x - g.x, e.y - g.y) < Math.hypot(best.x - g.x, best.y - g.y) ? e : best);
          g.path = [this._wp(t.x, t.y)];
          continue;
        }

        // Unsupported guns are fair game.
        const guns = known.filter(e => e.fresh && e.unitType === 'cannon' &&
          Math.hypot(e.x - g.x, e.y - g.y) < this.mToPx(1400));
        if (guns.length > 0) {
          const t = guns[0];
          const angle = Math.atan2(t.y - g.y, t.x - g.x);
          const flank = angle + (Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3);
          const d = Math.hypot(t.x - g.x, t.y - g.y);
          g.path = [
            this._wp(g.x + Math.cos(flank) * d * 0.6, g.y + Math.sin(flank) * d * 0.6),
            this._wp(t.x + (Math.random() * 20 - 10), t.y + (Math.random() * 20 - 10)),
          ];
          continue;
        }

        // Otherwise ride wide of the flanks, watching the roads. Cavalry did
        // not ride into formed infantry, and neither does this AI.
        if (nearest) {
          const angle = Math.atan2(nearest.y - g.y, nearest.x - g.x);
          const wide = angle + (g.id % 2 === 0 ? Math.PI / 2 : -Math.PI / 2);
          const standOff = Math.max(this.mToPx(500), nearestDist * 0.5);
          g.path = [this._wp(
            nearest.x + Math.cos(wide) * standOff,
            nearest.y + Math.sin(wide) * standOff,
          )];
        } else if (enemyBases.length > 0) {
          const target = enemyBases[g.id % enemyBases.length];
          g.path = [this._wp(target.x + (Math.random() * 100 - 50), target.y + (Math.random() * 60 - 30))];
        }
        continue;
      }

      // ── INFANTRY ──
      if (inRange) {
        // Enemy in killing range — stand and fire. Nothing is gained by
        // walking further into it.
        g.path = [];
      } else if (nearest && onDefensive) {
        // Outnumbered: take the best ground within reach, face the threat,
        // and let him come. Only move if the position is worth the walk.
        const cover = this.findNearbyCover(g, this.mToPx(500), nearest.x, nearest.y);
        const here = this.getTerrainAt(g.x, g.y).defense;
        if (cover && cover.defense > here + 0.25) {
          g.path = [this._wp(cover.x, cover.y)];
        } else {
          g.path = [];
        }
      } else if (nearest) {
        if (nearestDist > range * 1.05) {
          // Attacking: go for the exposed end of his line rather than butting
          // into the centre of it.
          const aim = this.pickFlankApproach(g, known) || nearest;
          const aimDist = Math.hypot(aim.x - g.x, aim.y - g.y) || 1;
          const advance = Math.max(0, aimDist - range * 0.8);
          g.path = [this._wp(
            g.x + (aim.x - g.x) / aimDist * advance + (Math.random() * 20 - 10),
            g.y + (aim.y - g.y) / aimDist * advance + (Math.random() * 20 - 10),
          )];
        } else {
          g.path = [];
        }
      } else if (enemyBases.length > 0) {
        let nearestBase = null, baseDist = Infinity;
        for (const b of enemyBases) {
          const d = Math.hypot(b.x - g.x, b.y - g.y);
          if (d < baseDist) { baseDist = d; nearestBase = b; }
        }
        if (nearestBase) {
          g.path = [this._wp(nearestBase.x + (Math.random() * 60 - 30), nearestBase.y + (Math.random() * 40 - 20))];
        }
      }
    }

    // ── Hold the ground we already have ──
    const captureRadius = this.mToPx(CAPTURE_M);
    for (const base of friendlyBases) {
      const threats = known.filter(e => e.fresh &&
        Math.hypot(e.x - base.x, e.y - base.y) < captureRadius * 2.5);
      if (threats.length === 0) continue;
      const defenders = aiGroups.filter(g =>
        g.unitType === 'infantry' &&
        (!g.path || g.path.length === 0) &&
        Math.hypot(g.x - base.x, g.y - base.y) < this.mToPx(1600)
      ).slice(0, 2);
      for (const d of defenders) {
        const threat = threats[0];
        const range = this.getEffectiveRange(d);
        const dist = Math.hypot(threat.x - d.x, threat.y - d.y);
        if (dist > range) {
          const advance = dist - range * 0.8;
          d.path = [this._wp(d.x + (threat.x - d.x) / dist * advance,
                             d.y + (threat.y - d.y) / dist * advance)];
        }
      }
    }
  }

  // The best bit of cover within reach that still faces the threat — a wall,
  // a sunken lane, a belt of timber, a crest. Ground behind the unit, away
  // from the enemy, is preferred: you do not advance to go on the defensive.
  findNearbyCover(g, searchRadius, towardX, towardY) {
    const tx = towardX - g.x, ty = towardY - g.y;
    const tLen = Math.hypot(tx, ty) || 1;
    const step = Math.max(14, searchRadius / 5);
    let best = null, bestScore = -Infinity;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      for (let r = step; r <= searchRadius; r += step) {
        const x = g.x + Math.cos(a) * r;
        const y = g.y + Math.sin(a) * r;
        if (x < 15 || y < 15 || x > this.mapWidth - 15 || y > this.mapHeight - 15) continue;
        const t = this.getTerrainAt(x, y);
        if (!t.passable) continue;
        // Dot product against the bearing to the enemy: negative means the
        // position is to our rear, which is where a defensive line belongs.
        const facing = (Math.cos(a) * tx + Math.sin(a) * ty) / tLen;
        const score = t.defense * 2 + (t.label === 'High Ground' ? 1.2 : 0)
          - facing * 0.9 - (r / searchRadius) * 0.8;
        if (score > bestScore) { bestScore = score; best = { x, y, defense: t.defense }; }
      }
    }
    return best;
  }

  // The weakest-supported end of the enemy line — the point Jackson looked for
  // on every field he fought.
  pickFlankApproach(g, known) {
    const fresh = known.filter(e => e.fresh);
    if (fresh.length < 2) return null;
    const neighbourhood = this.mToPx(700);
    let best = null, bestScore = Infinity;
    for (const e of fresh) {
      const support = fresh.reduce((s, o) =>
        s + (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < neighbourhood ? o.count : 0), 0);
      // Prefer an exposed unit that is also not far out of our way.
      const score = support + e.count * 0.5 + Math.hypot(e.x - g.x, e.y - g.y) * 1.5;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // Nearest patch of commanding ground within reach — where the guns belong.
  findNearbyHill(g, searchRadius) {
    const step = Math.max(18, searchRadius / 6);
    let best = null, bestDist = Infinity;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      for (let r = step; r <= searchRadius; r += step) {
        const x = g.x + Math.cos(a) * r;
        const y = g.y + Math.sin(a) * r;
        if (x < 10 || y < 10 || x > this.mapWidth - 10 || y > this.mapHeight - 10) continue;
        if (this.getTerrainAt(x, y).label !== 'High Ground') continue;
        if (r < bestDist) { bestDist = r; best = { x, y }; }
      }
    }
    return best;
  }

  sideStrength(owner) {
    return this.groups
      .filter(g => g.owner === owner && g.unitType !== 'commander')
      .reduce((s, g) => s + g.count, 0);
  }

  // Civil War battles ended when an army quit the field, not when the last
  // man fell. A command that has lost its positions and better than half its
  // strength has been beaten, whatever is left standing.
  checkVictory() {
    // No battle in progress — an empty field is not a victory.
    if (!this.running || this.groups.length === 0) return 0;

    const has1 = this.groups.some(g => g.owner === 1);
    const has2 = this.groups.some(g => g.owner === 2);
    if (!has2) return 1;
    if (!has1) return 2;

    const flags1 = this.bases.filter(b => b.owner === 1).length;
    const flags2 = this.bases.filter(b => b.owner === 2).length;
    const frac1 = this.sideStrength(1) / this.startStrength[1];
    const frac2 = this.sideStrength(2) / this.startStrength[2];

    const routed = (owner) => {
      const units = this.groups.filter(g => g.owner === owner && g.unitType !== 'commander');
      return units.length > 0 && units.every(g => g.isBroken);
    };

    if ((flags2 === 0 && frac2 < 0.45) || frac2 < 0.28 || routed(2)) return 1;
    if ((flags1 === 0 && frac1 < 0.45) || frac1 < 0.28 || routed(1)) return 2;
    return 0;
  }
}
