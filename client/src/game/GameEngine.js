import { TERRAIN, FORTS, STARTING_UNITS, MAP_WIDTH, MAP_HEIGHT } from './MapData.js';
// Note: GEO_TERRAIN import removed — terrain is now per-battlefield via setGeoTerrain()

export class GameEngine {
  constructor() {
    this.bases = [];
    this.groups = [];
    this.dyingGroups = [];
    this.groupIdCounter = 0;
    this.aiTimer = 0;
    this.selectedGroupIds = new Set();
    this.mapWidth = 1600;
    this.mapHeight = 1000;
    this.running = false;
  }

  setProjections(latLngToPixel, pixelToLatLng) {
    this.latLngToPixel = latLngToPixel;
    this.pixelToLatLng = pixelToLatLng;
  }

  setGeoTerrain(geoTerrain) {
    this.geoTerrain = geoTerrain;
  }

  // Init from a battlefield definition with pixel-converted coordinates
  initFromBattlefield(forts, units, mapWidth, mapHeight, geoTerrain) {
    this.mapWidth = mapWidth || 1600;
    this.mapHeight = mapHeight || 1000;
    this.geoTerrain = geoTerrain || null;
    this.bases = forts.map(f => ({
      id: f.id, x: f.x, y: f.y,
      lat: f.lat, lng: f.lng,
      owner: f.owner,
      label: f.label,
    }));
    this.groups = [];
    this.dyingGroups = [];
    this.groupIdCounter = 0;
    this.aiTimer = 0;
    this.time = 0;
    this.selectedGroupIds = new Set();

    for (const u of units) {
      this.groups.push({
        id: ++this.groupIdCounter,
        owner: u.owner,
        x: u.x, y: u.y,
        lat: u.lat, lng: u.lng,          // ← store for reprojection on map move
        path: [],
        count: u.count,
        unitType: u.unitType,
        speed: this.getBaseSpeed(u.unitType),
        angle: 0,
        morale: 100,
        isBroken: false,
      });
    }

    // Set initial combat facing so troops spawn already oriented toward the enemy
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
    // Uses imports from MapData.js
    this.mapWidth = MAP_WIDTH;
    this.mapHeight = MAP_HEIGHT;
    this.bases = FORTS.map(f => ({
      id: f.id, x: f.x, y: f.y,
      owner: f.owner,
      label: f.label,
    }));
    this.groups = [];
    this.dyingGroups = [];
    this.groupIdCounter = 0;
    this.aiTimer = 0;
    this.time = 0;
    this.selectedGroupIds = new Set();

    for (const u of STARTING_UNITS) {
      this.groups.push({
        id: ++this.groupIdCounter,
        owner: u.owner,
        x: u.x, y: u.y,
        path: [],
        count: u.count,
        unitType: u.unitType,
        speed: this.getBaseSpeed(u.unitType),
        angle: 0,
        morale: 100,
        isBroken: false,
      });
    }

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

  // Re-project all unit/base positions after map pan or zoom
  // latLngToPixel: (lat, lng) => { x, y }  — uses live Leaflet container coords
  reprojectFromLatLng(latLngToPixel) {
    this.latLngToPixel = latLngToPixel;
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
  }

  // Dynamic speed based on map scale.
  // Historical marching speeds: Infantry ~2.5 mph (1.1 m/s), Cavalry ~5 mph (2.2 m/s), Artillery ~2 mph (0.9 m/s).
  // Time scale: 1 real second = 5 game minutes (300x time acceleration).
  // GameEngine dt is in real seconds.
  getBaseSpeed(unitType, currentZoom, centerLat) {
    if (!currentZoom || !centerLat) {
      // Fallback pixel speeds if map info not yet loaded
      return { infantry: 11, cavalry: 22, cannon: 7, commander: 17 }[unitType] || 11;
    }

    // Leaflet formula for meters per pixel at the equator is: 40075016.686 / (256 * 2^zoom)
    // Adjust for latitude: metersPerPixel = (cos(lat * pi/180) * 40075016.686) / (256 * 2^zoom)
    const metersPerPixel = (Math.cos(centerLat * Math.PI / 180) * 40075016.686) / (256 * Math.pow(2, currentZoom));
    
    // Base speeds in meters per real-world second (m/s)
    const baseMps = {
      infantry: 1.1,   // ~2.5 mph
      cavalry: 2.2,    // ~5.0 mph
      cannon: 0.8,     // ~1.8 mph
      commander: 1.8   // ~4.0 mph
    }[unitType] || 1.1;

    const TIME_SCALE = 75; // 1 IRL second = 1.25 game minutes
    const gameMps = baseMps * TIME_SCALE;
    
    // Return pixels per second
    return gameMps / metersPerPixel;
  }

  getRange(unitType) {
    return { infantry: 80, cavalry: 70, cannon: 260, commander: 0 }[unitType] || 70;
  }

  // Sight range for fog-of-war (how far each unit can DETECT enemies)
  getSightRange(unitType) {
    return { infantry: 160, cavalry: 320, cannon: 140, commander: 220 }[unitType] || 160;
  }

  // Morale aura radius for commander
  static COMMANDER_AURA = 140;

  getTerrainAt(x, y) {
    // Determine lat/lng from Cartesian map pixels
    if (!this.geoTerrain || !this.geoTerrain.features || !this.pixelToLatLng) {
      return TERRAIN.grass;
    }

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
    // Cannons on hills get massive range; cannons in woods are nearly useless
    const mult = terrain.label === 'High Ground' ? (isCannon ? 1.8 : 1.35)
      : terrain.label === 'Open Field' ? 1.12
      : terrain.label === 'Woods' || terrain.label === 'Forest' ? (isCannon ? 0.06 : 0.3)
      : terrain.label === 'Building' ? 0.4
      : terrain.label === 'Marsh' ? (isCannon ? 0.15 : 0.6)
      : terrain.label === 'Creek' || terrain.label === 'River' ? (isCannon ? 0.08 : 0.7)
      : terrain.label === 'Sunken Road' ? (isCannon ? 0.08 : 0.65)
      : 1.0;
    return base * mult;
  }

  // Compute which enemy groups are visible to a given owner
  computeVisibility(owner) {
    const friendly = this.groups.filter(g => g.owner === owner && g.count > 0);
    const enemies  = this.groups.filter(g => g.owner !== owner && g.count > 0);
    for (const e of enemies) {
      // Firing units reveal themselves regardless of fog
      if (e.fireTimer > 0) {
        e.visible = true;
        continue;
      }
      if (e.visible) continue; // Already visible from other owner's calculation
      e.visible = friendly.some(f => {
        let sight = this.getSightRange(f.unitType);
        
        // Terrain visibility modifiers for the OBSERVER
        const fTerrain = this.getTerrainAt(f.x, f.y);
        // High ground gives significant visibility boost
        if (fTerrain.label === 'High Ground') sight *= 1.5;
        // Cannot see far out of woods/buildings
        if (fTerrain.label === 'Woods') sight *= 0.4;
        if (fTerrain.label === 'Building') sight *= 0.5;
        // Low areas reduce visibility
        if (fTerrain.label === 'Marsh') sight *= 0.6;
        if (fTerrain.label === 'Creek' || fTerrain.label === 'Sunken Road') sight *= 0.65;

        // Terrain visibility modifiers for the TARGET
        const eTerrain = this.getTerrainAt(e.x, e.y);
        // Targets hiding in woods/buildings are harder to spot
        if (eTerrain.label === 'Woods') sight *= 0.5;
        if (eTerrain.label === 'Building') sight *= 0.6;
        // Targets in low areas are harder to see
        if (eTerrain.label === 'Marsh' || eTerrain.label === 'Sunken Road') sight *= 0.7;

        return Math.hypot(f.x - e.x, f.y - e.y) < sight;
      });
    }
  }

  getBase(id) {
    return this.bases.find(b => b.id === id);
  }

  update(deltaMs) {
    if (!this.running) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.time = (this.time || 0) + deltaMs;

    // Reset visual engagement state
    for (const g of this.groups) {
      g.isEngaged = false;
      g.targetId = null;
      g.justFired = false;
      if (g.fireTimer > 0) g.fireTimer -= dt;
    }

    // AI
    this.aiTimer += dt;
    if (this.aiTimer > 2.0) {
      this.aiTimer = 0;
      this.updateAI();
    }


    // Compute fog-of-war visibility BEFORE movement and combat
    // (Reset visibility first so it's fresh each frame)
    for (const g of this.groups) g.visible = (g.owner === 1); // player units always visible to player
    this.computeVisibility(1);
    this.computeVisibility(2);

    // Move groups
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

      if (dist < 8) {
        g.path.shift();
        continue;
      }

      const terrain = this.getTerrainAt(g.x, g.y);
      if (!terrain.passable) {
        g.x += (dx / dist) * 4;
        g.y += (dy / dist) * 4;
        continue;
      }

      // Determine map scale context (or fallback to z14 / Antietam lat)
      const currentZoom = this.currentZoom || 14;
      const centerLat = this.centerLat || 39.46;
      // Calculate speed dynamically based on map properties
      const baseSpeedAndScale = this.getBaseSpeed(g.unitType, currentZoom, centerLat);
      const effectiveSpeed = baseSpeedAndScale * terrain.speed;
      const moveDist = effectiveSpeed * dt;

      // Smooth rotation: low-pass filter toward movement direction
      let targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - g.angle;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      // If the movement destination is behind the unit (>90 degrees), backpedal!
      // The unit faces the opposite direction of its movement vector.
      if (Math.abs(diff) > Math.PI / 2) {
          targetAngle += Math.PI;
          diff = targetAngle - g.angle;
          while (diff <= -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
      }
      
      // Slower turn speed so rotation looks ponderous and deliberate (0.4 rad/s ~ 23 degrees per real second)
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
    }

    // Soft Collision / Separation (prevent overlapping / passing through)
    const MIN_DIST = 26; 
    for (let i = 0; i < this.groups.length; i++) {
        const a = this.groups[i];
        for (let j = i + 1; j < this.groups.length; j++) {
            const b = this.groups[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);

            // If exactly on top, add jitter
            if (dist < 0.1) {
                a.x += Math.random() - 0.5;
                a.y += Math.random() - 0.5;
                continue;
            }

            if (dist < MIN_DIST) {
                const overlap = MIN_DIST - dist;
                // Soft separation for allies (they can squeeze slightly), rigid for enemies
                const force = (a.owner === b.owner) ? 0.3 : 0.8; 
                const pushX = (dx / dist) * overlap * force;
                const pushY = (dy / dist) * overlap * force;

                a.x -= pushX * 0.5;
                a.y -= pushY * 0.5;
                b.x += pushX * 0.5;
                b.y += pushY * 0.5;
            }
        }
    }

    // Group vs group combat — War of Dots 1:1 Mutual Annihilation (Constant frontal engagement rate)
    const ENGAGE_RATE = 2.0; // troops per second (slowed for longer battles)
    for (let i = 0; i < this.groups.length; i++) {
      const a = this.groups[i];
      if (a.count <= 0) continue;
      for (let j = i + 1; j < this.groups.length; j++) {
        const b = this.groups[j];
        if (b.count <= 0 || a.owner === b.owner) continue;

        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const aRange = this.getEffectiveRange(a);
        const bRange = this.getEffectiveRange(b);

        const aTerrain = this.getTerrainAt(a.x, a.y);
        const bTerrain = this.getTerrainAt(b.x, b.y);

        // Stationary units are far more effective than moving ones
        const aAcc = a.isMoving ? 0.55 : 1.2;
        const bAcc = b.isMoving ? 0.55 : 1.2;

        const aMorale = Math.max(0.1, (a.morale || 100) / 100);
        const bMorale = Math.max(0.1, (b.morale || 100) / 100);

        // Flanking: compare attacker position vs defender facing angle
        // 1.0 = frontal attack, up to 1.8 = rear attack
        const flankMult = (attacker, defender) => {
          const angleToAttacker = Math.atan2(attacker.y - defender.y, attacker.x - defender.x);
          let diff = angleToAttacker - (defender.angle || 0);
          while (diff <= -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          // diff=0 means attacker is directly in front, PI means directly behind
          const behind = Math.abs(diff) / Math.PI; // 0 = front, 1 = rear
          return 1.0 + behind * 0.8; // 1.0 front → 1.8 rear
        };

        // Facing bonus: attacker deals more when directly facing the target (not turned away)
        const facingMult = (attacker, target) => {
          const angleToTarget = Math.atan2(target.y - attacker.y, target.x - attacker.x);
          let diff = angleToTarget - (attacker.angle || 0);
          while (diff <= -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          // diff=0 means perfectly facing target
          const alignment = 1.0 - Math.abs(diff) / Math.PI; // 1 = facing, 0 = back turned
          return 0.6 + alignment * 0.4; // 0.6 if back turned → 1.0 if facing
        };

        const aFlank = flankMult(a, b); // bonus for a attacking b's flank
        const aFacing = facingMult(a, b); // bonus for a facing toward b
        const bFlank = flankMult(b, a);
        const bFacing = facingMult(b, a);

        const aCanFire = !a.isBroken &&
          (a.unitType !== 'cannon' ? !a.isMoving
            : (!a.isMoving && (this.time - (a.stopTime || 0) >= 3000)));
        const bCanFire = !b.isBroken &&
          (b.unitType !== 'cannon' ? !b.isMoving
            : (!b.isMoving && (this.time - (b.stopTime || 0) >= 3000)));

        const typeMult = { infantry: 1.0, cavalry: 0.85, cannon: 1.3, commander: 0 };

        // Cannons are much less effective against moving targets
        const cannonVsMoving = (attacker, target) =>
          (attacker.unitType === 'cannon' && target.isMoving) ? 0.2 : 1.0;

        // Cannon accuracy drops off at longer ranges (1.0 at close, 0.3 at max range)
        const cannonRangeFalloff = (attacker, range) =>
          attacker.unitType === 'cannon' ? Math.max(0.3, 1.0 - 0.7 * (dist / range)) : 1.0;

        // Also require enemy to be visible (within sight range of any friendly)
        const aCanSee = this.groups.filter(f => f.owner === a.owner)
          .some(f => Math.hypot(f.x - b.x, f.y - b.y) < this.getSightRange(f.unitType));
        const bCanSee = this.groups.filter(f => f.owner === b.owner)
          .some(f => Math.hypot(f.x - a.x, f.y - a.y) < this.getSightRange(f.unitType));

        // Hill cannons shoot over woods — negate target's woods defense
        const aIgnoresWoodsDef = a.unitType === 'cannon' && aTerrain.label === 'High Ground'
          && (bTerrain.label === 'Woods' || bTerrain.label === 'Forest');
        const bIgnoresWoodsDef = b.unitType === 'cannon' && bTerrain.label === 'High Ground'
          && (aTerrain.label === 'Woods' || aTerrain.label === 'Forest');

        if (aCanFire && aCanSee && dist < aRange) {
          const defB = aIgnoresWoodsDef ? 1.0 : bTerrain.defense;
          const aDps = ENGAGE_RATE * aAcc * aFacing * aFlank * aTerrain.offense * (1 / defB) * aMorale * (typeMult[a.unitType] || 1) * cannonVsMoving(a, b) * cannonRangeFalloff(a, aRange);
          b.count -= aDps * dt;
          b.morale -= 3 * dt;  // b is under fire
          a.isEngaged = true;
          a.targetId = b.id;
          if (!a.lastFired || this.time - a.lastFired > 4000 + Math.random() * 3000) {
            a.lastFired = this.time;
            a.justFired = true;
            a.fireTimer = 0.3; // Volley flash duration (300ms)
          }
        }
        if (bCanFire && bCanSee && dist < bRange) {
          const defA = bIgnoresWoodsDef ? 1.0 : aTerrain.defense;
          const bDps = ENGAGE_RATE * bAcc * bFacing * bFlank * bTerrain.offense * (1 / defA) * bMorale * (typeMult[b.unitType] || 1) * cannonVsMoving(b, a) * cannonRangeFalloff(b, bRange);
          a.count -= bDps * dt;
          a.morale -= 3 * dt;  // a is under fire
          b.isEngaged = true;
          b.targetId = a.id;
          if (!b.lastFired || this.time - b.lastFired > 4000 + Math.random() * 3000) {
            b.lastFired = this.time;
            b.justFired = true;
            b.fireTimer = 0.3; // Volley flash duration (300ms)
          }
        }

        if (a.count <= 0) break;
      }
    }


    // Groups attacking enemy forts nearby (1:1 War of Dots Sieges)
    for (const g of this.groups) {
      if (g.count <= 0) continue;
      for (const base of this.bases) {
        if (base.owner === g.owner) continue;
        const dist = Math.hypot(g.x - base.x, g.y - base.y);
        if (dist < 42) {
          // Capture the flag instantly
          const oldOwner = base.owner;
          base.owner = g.owner;

          // Morale boost for all capturer's units, morale hit for all defender's units
          for (const u of this.groups) {
            if (u.count <= 0) continue;
            if (u.owner === g.owner) {
              u.morale = Math.min(100, u.morale + 20);
            } else if (u.owner === oldOwner) {
              u.morale = Math.max(0, u.morale - 20);
            }
          }
        }
      }
    }

    // Clean up dead groups — commander death triggers morale shockwave
    // NOTE: this must run BEFORE filter, so shockwave sees dead units
    for (let i = this.groups.length - 1; i >= 0; i--) {
      const dead = this.groups[i];
      if (dead.count <= 0) {
        if (dead.unitType === 'commander') {
          for (const g of this.groups) {
            if (g.owner === dead.owner && g.id !== dead.id) {
              const d = Math.hypot(g.x - dead.x, g.y - dead.y);
              if (d < GameEngine.COMMANDER_AURA * 1.5) {
                const falloff = 1 - d / (GameEngine.COMMANDER_AURA * 1.5);
                g.morale = Math.max(0, g.morale - 40 * falloff);
              }
            }
          }
        }
        // Add to dying list for fade-out animation
        this.dyingGroups.push({ ...dead, fadeTimer: 1.0 });
        this.selectedGroupIds.delete(dead.id);
        this.groups.splice(i, 1);
      }
    }

    // Remove groups with 0 count (done AFTER shockwave so commanders trigger it)
    this.groups = this.groups.filter(g => g.count > 0);

    // Tick dying group fade-out timers
    for (let i = this.dyingGroups.length - 1; i >= 0; i--) {
      this.dyingGroups[i].fadeTimer -= dt * 0.8;
      if (this.dyingGroups[i].fadeTimer <= 0) {
        this.dyingGroups.splice(i, 1);
      }
    }

    // Process Morale & Retreats
    for (const g of this.groups) {
        if (g.count <= 0) continue;
        
        let nearFlag = false;
        let nearestFlag = null;
        let minDist = Infinity;
        
        for (const base of this.bases) {
            if (base.owner === g.owner) {
                const dist = Math.hypot(g.x - base.x, g.y - base.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestFlag = base;
                }
                if (dist < 70) nearFlag = true;
            }
        }
        
        if (nearFlag) {
            g.morale = Math.min(100, g.morale + 30 * dt);
        }

        // Commander aura: nearby friendly commanders boost morale (or penalize if broken)
        if (g.unitType !== 'commander') {
          for (const cmd of this.groups) {
            if (cmd.unitType === 'commander' && cmd.owner === g.owner && cmd.count > 0) {
              const cmdDist = Math.hypot(g.x - cmd.x, g.y - cmd.y);
              if (cmdDist < GameEngine.COMMANDER_AURA) {
                const falloff = 1 - cmdDist / GameEngine.COMMANDER_AURA;
                if (cmd.isBroken || cmd.morale < 30) {
                  // Panicking commander drains nearby morale
                  g.morale = Math.max(0, g.morale - 15 * falloff * dt);
                } else {
                  g.morale = Math.min(100, g.morale + 20 * falloff * dt);
                }
                cmd.isEngaged = true;
              }
            }
          }
        }

        // Break logic
        if (g.morale < 25 && !g.isBroken) {
            g.isBroken = true;
            this.selectedGroupIds.delete(g.id); // Deselect when broken
        }
        // Rally logic
        if (g.morale > 80 && g.isBroken) {
            g.isBroken = false;
        }
        
        if (g.isBroken && nearestFlag) {
            // Override path to run to nearest friendly flag
            g.path = [this._wp(nearestFlag.x, nearestFlag.y)];
        }

        // Stationary units face nearest enemy within firing range (facing matters for combat)
        if (!g.isMoving && g.count > 0 && !g.isBroken) {
            let targetAngle = g.angle;
            
            // Find the closest visible enemy
            let closestEnemy = null;
            let closestDist = Infinity;
            
            for (const e of this.groups) {
                if (e.owner !== g.owner && e.count > 0 && e.visible) {
                    const dist = Math.hypot(e.x - g.x, e.y - g.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = e;
                    }
                }
            }

            // Auto-rotate toward nearest enemy within effective range (or commander aura)
            const faceRange = this.getEffectiveRange(g);
            if (closestEnemy && (closestDist < faceRange || (g.unitType === 'commander' && closestDist < GameEngine.COMMANDER_AURA * 2))) {
                targetAngle = Math.atan2(closestEnemy.y - g.y, closestEnemy.x - g.x);
            }

            // Smooth rotation toward enemy (if applicable)
            if (targetAngle !== g.angle) {
                let diff = targetAngle - g.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                g.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.4 * dt);
            }
        }
    }

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
    groupIds.forEach(id => {
      const g = this.groups.find(gr => gr.id === id);
      if (g) {
         // Drop leading waypoints that are near the unit (avoids backward movement)
         let startIdx = 0;
         while (startIdx < pathPoints.length - 1 &&
                Math.hypot(pathPoints[startIdx].x - g.x, pathPoints[startIdx].y - g.y) < 30) {
           startIdx++;
         }
         const trimmed = pathPoints.slice(startIdx);
         // Create a noisy clone of the path to avoid pure grouping overlap
         g.path = trimmed.map(p => {
           const px = p.x + (Math.random() * 20 - 10);
           const py = p.y + (Math.random() * 20 - 10);
           return this._wp(px, py);
         });
      }
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

  updateAI() {
    const aiGroups = this.groups.filter(g => g.owner === 2 && g.count > 0 && !g.isBroken);
    const enemyGroups = this.groups.filter(g => g.owner === 1 && g.count > 0);
    const enemyBases = this.bases.filter(b => b.owner === 1);
    const friendlyBases = this.bases.filter(b => b.owner === 2);

    for (const g of aiGroups) {
      if (g.unitType === 'commander') {
        // Commander stays behind the front line near friendly units
        const nearby = aiGroups.filter(a => a.id !== g.id && Math.hypot(a.x - g.x, a.y - g.y) < GameEngine.COMMANDER_AURA * 1.5);
        if (nearby.length < 2 && aiGroups.length > 1) {
          // Move toward center mass of friendly units
          const cx = aiGroups.reduce((s, a) => s + a.x, 0) / aiGroups.length;
          const cy = aiGroups.reduce((s, a) => s + a.y, 0) / aiGroups.length;
          g.path = [this._wp(cx + (Math.random() * 40 - 20), cy + (Math.random() * 40 - 20))];
        } else {
          g.path = [];
        }
        continue;
      }

      // Find nearest visible enemy
      let nearestEnemy = null;
      let nearestDist = Infinity;
      for (const e of enemyGroups) {
        const d = Math.hypot(e.x - g.x, e.y - g.y);
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
      }

      // Find weakest enemy in range (focus fire)
      const range = this.getEffectiveRange(g);
      let weakestInRange = null;
      let weakestCount = Infinity;
      for (const e of enemyGroups) {
        const d = Math.hypot(e.x - g.x, e.y - g.y);
        if (d < range && e.count < weakestCount) {
          weakestCount = e.count;
          weakestInRange = e;
        }
      }

      // ── CANNON: position at max range and hold ──
      if (g.unitType === 'cannon') {
        if (weakestInRange) {
          // Already in range — STOP and fire
          g.path = [];
        } else if (nearestEnemy) {
          // Advance to cannon range, but stop short
          const stopDist = Math.min(range * 0.85, nearestDist - 20);
          if (nearestDist > range * 1.1) {
            const dx = nearestEnemy.x - g.x;
            const dy = nearestEnemy.y - g.y;
            const tx = g.x + (dx / nearestDist) * stopDist;
            const ty = g.y + (dy / nearestDist) * stopDist;
            g.path = [this._wp(tx, ty)];
          } else {
            g.path = [];
          }
        }
        continue;
      }

      // ── CAVALRY: flank, charge weak/broken units, or harass artillery ──
      if (g.unitType === 'cavalry') {
        // Priority 1: charge broken/routing enemy units
        let brokenTarget = null;
        let brokenDist = Infinity;
        for (const e of enemyGroups) {
          if (e.isBroken || e.morale < 30) {
            const d = Math.hypot(e.x - g.x, e.y - g.y);
            if (d < brokenDist) { brokenDist = d; brokenTarget = e; }
          }
        }
        if (brokenTarget) {
          g.path = [this._wp(brokenTarget.x, brokenTarget.y)];
          continue;
        }

        // Priority 2: attack enemy cannon
        let cannonTarget = null;
        let cannonDist = Infinity;
        for (const e of enemyGroups) {
          if (e.unitType === 'cannon') {
            const d = Math.hypot(e.x - g.x, e.y - g.y);
            if (d < cannonDist) { cannonDist = d; cannonTarget = e; }
          }
        }
        if (cannonTarget && cannonDist < 400) {
          // Flank around to attack from the side/rear
          const angle = Math.atan2(cannonTarget.y - g.y, cannonTarget.x - g.x);
          const flankAngle = angle + (Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3);
          const approachDist = Math.max(cannonDist - 30, 50);
          g.path = [
            this._wp(g.x + Math.cos(flankAngle) * approachDist * 0.6, g.y + Math.sin(flankAngle) * approachDist * 0.6),
            this._wp(cannonTarget.x + (Math.random() * 20 - 10), cannonTarget.y + (Math.random() * 20 - 10))
          ];
          continue;
        }

        // Priority 3: flank nearest enemy infantry from the side
        if (nearestEnemy && nearestDist < 350) {
          const angle = Math.atan2(nearestEnemy.y - g.y, nearestEnemy.x - g.x);
          const flankAngle = angle + (Math.random() > 0.5 ? Math.PI / 2.5 : -Math.PI / 2.5);
          g.path = [
            this._wp(g.x + Math.cos(flankAngle) * nearestDist * 0.7, g.y + Math.sin(flankAngle) * nearestDist * 0.7),
            this._wp(nearestEnemy.x + (Math.random() * 20 - 10), nearestEnemy.y + (Math.random() * 20 - 10))
          ];
          continue;
        }

        // Fallback: advance toward enemy base
        if (enemyBases.length > 0) {
          const target = enemyBases[Math.floor(Math.random() * enemyBases.length)];
          g.path = [this._wp(target.x + (Math.random() * 100 - 50), target.y + (Math.random() * 60 - 30))];
        }
        continue;
      }

      // ── INFANTRY: advance to effective range, then HOLD and fire ──
      if (weakestInRange) {
        // Enemy in range — STOP MOVING and fire
        g.path = [];
      } else if (nearestEnemy) {
        // Advance toward enemy but stop at effective range
        if (nearestDist > range * 1.05) {
          const dx = nearestEnemy.x - g.x;
          const dy = nearestEnemy.y - g.y;
          // Stop at ~90% of range to ensure we're in firing distance
          const advanceDist = nearestDist - range * 0.85;
          const tx = g.x + (dx / nearestDist) * advanceDist;
          const ty = g.y + (dy / nearestDist) * advanceDist;
          g.path = [this._wp(tx + (Math.random() * 20 - 10), ty + (Math.random() * 20 - 10))];
        } else {
          // Within range — hold position
          g.path = [];
        }
      } else if (enemyBases.length > 0) {
        // No visible enemy — advance toward nearest enemy base
        let nearestBase = null;
        let baseDist = Infinity;
        for (const b of enemyBases) {
          const d = Math.hypot(b.x - g.x, b.y - g.y);
          if (d < baseDist) { baseDist = d; nearestBase = b; }
        }
        if (nearestBase) {
          g.path = [this._wp(nearestBase.x + (Math.random() * 60 - 30), nearestBase.y + (Math.random() * 40 - 20))];
        }
      }
    }

    // ── Defend threatened bases ──
    for (const base of friendlyBases) {
      const threats = enemyGroups.filter(e => Math.hypot(e.x - base.x, e.y - base.y) < 120);
      if (threats.length > 0) {
        // Send 1-2 nearby idle infantry to defend
        const defenders = aiGroups.filter(g =>
          g.unitType === 'infantry' &&
          (!g.path || g.path.length === 0) &&
          Math.hypot(g.x - base.x, g.y - base.y) < 300
        ).slice(0, 2);
        for (const d of defenders) {
          const threat = threats[0];
          const range = this.getEffectiveRange(d);
          const dist = Math.hypot(threat.x - d.x, threat.y - d.y);
          if (dist > range) {
            const dx = threat.x - d.x;
            const dy = threat.y - d.y;
            const advanceDist = dist - range * 0.85;
            d.path = [this._wp(d.x + (dx / dist) * advanceDist, d.y + (dy / dist) * advanceDist)];
          }
        }
      }
    }
  }

  checkVictory() {
    const owners = new Set(this.bases.map(b => b.owner).filter(o => o !== 0));
    const hasPlayer = owners.has(1);
    const hasEnemy = owners.has(2);
    if (!hasEnemy && this.groups.filter(g => g.owner === 2).length === 0) return 1;
    if (!hasPlayer && this.groups.filter(g => g.owner === 1).length === 0) return 2;
    return 0;
  }
}
