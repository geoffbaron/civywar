import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameEngine } from './game/GameEngine';
import { TERRAIN } from './game/MapData';
import { BATTLEFIELDS, TILE_LAYERS } from './game/BattlefieldMaps';
import MapBackground from './game/MapBackground';
import TraceTool from './game/TraceTool';
import { soundManager } from './game/SoundManager';
import './index.css';

// Init sound on first user interaction
let soundInited = false;
const initSound = () => {
  if (!soundInited) {
    soundInited = true;
    soundManager.init();
  }
  soundManager.resume();
};

const engine = new GameEngine();

// Round a closed ray-cast outline into a smooth curve. A sightline does not
// end in a razor-straight facet, and the eye reads a soft horizon far better
// than a polygon.
const smoothClosedPath = (pts) => {
  const n = pts.length;
  if (n < 3) return '';
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (v) => v.toFixed(1);
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${f(start[0])},${f(start[1])}`;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const m = mid(cur, pts[(i + 1) % n]);
    d += ` Q${f(cur[0])},${f(cur[1])} ${f(m[0])},${f(m[1])}`;
  }
  return d + 'Z';
};

// Debug handle for inspecting a running battle from the console.
if (typeof window !== 'undefined') window.DBG = { engine };

const FORT_HIT = 24;

// Realistic mode uses formation blocks in data; expand them into many smaller units
// so the battlefield reads more like an order-of-battle map.
const FORMATION_OFFSETS = [
  [0, 0],
  [-1, 0], [1, 0],
  [-2, 0], [2, 0],
  [-1, 1], [1, 1],
  [-1, -1], [1, -1],
  [-2, 1], [2, 1],
  [-2, -1], [2, -1],
  [-3, 0], [3, 0],
  [0, 1], [0, -1],
  [-3, 1], [3, 1],
  [-3, -1], [3, -1],
];

// Approximate engaged strengths by battle day (used for realistic-mode side ratios).
const REALISTIC_DAY_STRENGTH = {
  day1: { 1: 22000, 2: 27000 },
  day2: { 1: 78000, 2: 65000 },
  day3: { 1: 72000, 2: 50000 },
};

// Render only ~25% of potential formation icons for performance/readability.
const REALISTIC_ICON_DENSITY = 0.25;

const scaleRealisticPhaseCounts = (units, phaseKey) => {
  const dayStrength = REALISTIC_DAY_STRENGTH[phaseKey];
  if (!dayStrength) return units;

  const sideTargets = { ...dayStrength };

  const sideCurrent = { 1: 0, 2: 0 };
  for (const u of units) {
    if (u.unitType !== 'commander') sideCurrent[u.owner] += u.count;
  }

  const sideScale = {
    1: sideCurrent[1] > 0 ? sideTargets[1] / sideCurrent[1] : 1,
    2: sideCurrent[2] > 0 ? sideTargets[2] / sideCurrent[2] : 1,
  };

  return units.map((u) =>
    u.unitType === 'commander' ? u : { ...u, count: Math.max(120, u.count * sideScale[u.owner]) }
  );
};

const splitFormationUnits = (units, enabled, phaseKey) => {
  if (!enabled) return units;

  const scaledUnits = scaleRealisticPhaseCounts(units, phaseKey);

  return scaledUnits.flatMap((u) => {
    if (u.unitType === 'commander' || u.count <= 0) return [u];

    const day2 = phaseKey === 'day2';
    const day3 = phaseKey === 'day3';
    const isUnion = u.owner === 1;

    const chunkSize =
      u.unitType === 'infantry' ? (day2 || day3 ? (isUnion ? 24 : 20) : (isUnion ? 22 : 18))
      : u.unitType === 'cavalry' ? (isUnion ? 16 : 13)
      : (day2 || day3 ? 12 : 10);

    const spacing =
      u.unitType === 'infantry' ? (day2 ? 0.00042 : 0.00045)
      : u.unitType === 'cavalry' ? 0.00055
      : (day2 || day3 ? 0.00036 : 0.00040);

    const depth =
      u.unitType === 'infantry' ? (day2 ? 0.00022 : 0.00026)
      : u.unitType === 'cavalry' ? 0.00026
      : (day2 || day3 ? 0.00015 : 0.00019);

    const maxSubUnits =
      u.unitType === 'infantry' ? (day2 || day3 ? (isUnion ? 8 : 10) : (isUnion ? 7 : 9))
      : u.unitType === 'cavalry' ? 4
      : 5;

    const minGroupSize = u.unitType === 'infantry' ? 14 : u.unitType === 'cavalry' ? 10 : 8;
    const byChunk = Math.ceil(u.count / chunkSize);
    const byMinSize = Math.floor(u.count / minGroupSize);
    const baseN = Math.max(1, Math.min(maxSubUnits, byChunk, Math.max(1, byMinSize)));
    const n = Math.max(1, Math.ceil(baseN * REALISTIC_ICON_DENSITY));
    if (n === 1) return [u];

    const per = u.count / n;
    const eastWestSign = u.owner === 1 ? -1 : 1;

    return Array.from({ length: n }, (_, i) => {
      const [ox, oy] = FORMATION_OFFSETS[i] || [i - Math.floor(n / 2), 0];
      return {
        ...u,
        count: per,
        // Bias formations to broad east-west lines facing the enemy.
        lng: u.lng + ox * spacing,
        lat: u.lat + oy * depth + ox * spacing * 0.18 * eastWestSign,
      };
    });
  });
};

function App() {
  const [gameState, setGameState] = useState({ bases: [], groups: [], dyingGroups: [], effects: [], smoke: [], contacts: [], selectedGroupId: null });
  const [dragState, setDragState] = useState(null);
  const [victory, setVictory] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [hoverUnit, setHoverUnit] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [currentBattle, setCurrentBattle] = useState('antietam');
  const [realisticMode, setRealisticMode] = useState(false);
  const [realisticPhase, setRealisticPhase] = useState('day1');
  const [showBriefing, setShowBriefing] = useState(false);
  const [tileLayer, setTileLayer] = useState('lines');
  const [mapStyle, setMapStyle] = useState('vintage');
  const [mapInfo, setMapInfo] = useState(null); // { latLngToPixel, width, height }
  const [mapWidth, setMapWidth] = useState(1200);
  const [mapHeight, setMapHeight] = useState(800);
  
  // Dev tool to visually align GeoJSON traces with base map
  const [terrainOffset, setTerrainOffset] = useState({ lat: 0, lng: 0, scaleLat: 1.0, scaleLng: 1.0 });
  const [showTraceTool, setShowTraceTool] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0); // 0 = not showing

  const requestRef = useRef();
  const svgRef = useRef();
  const currentBattleRef = useRef(currentBattle);
  currentBattleRef.current = currentBattle;
  const realisticModeRef = useRef(realisticMode);
  realisticModeRef.current = realisticMode;
  const realisticPhaseRef = useRef(realisticPhase);
  realisticPhaseRef.current = realisticPhase;
  // Live Leaflet references — used for reproject on pan/zoom
  const latLngToPixelRef = useRef(null);
  const pixelToLatLngRef = useRef(null);
  const mapInstanceRef    = useRef(null);
  const [isPanMode, setIsPanMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1); // Scale units based on zoom
  const refZoomRef = useRef(16); // Reference zoom level — updated on map ready
  const [showTacticalOverlay, setShowTacticalOverlay] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  // Compute live transformed map data for calibration
  const transformedGeoTerrain = useMemo(() => {
    const bf = BATTLEFIELDS[currentBattle];
    if (!bf || !bf.geoTerrain) return null;
    if (terrainOffset.lat === 0 && terrainOffset.lng === 0 && terrainOffset.scaleLat === 1 && terrainOffset.scaleLng === 1) {
      return bf.geoTerrain;
    }
    const centerLat = bf.center[0];
    const centerLng = bf.center[1];
    const geoData = JSON.parse(JSON.stringify(bf.geoTerrain));
    const transformPt = (pt) => {
      pt[0] = centerLng + (pt[0] - centerLng) * terrainOffset.scaleLng + terrainOffset.lng;
      pt[1] = centerLat + (pt[1] - centerLat) * terrainOffset.scaleLat + terrainOffset.lat;
    };
    geoData.features.forEach(f => {
      if (f.geometry.type === 'Polygon') {
        f.geometry.coordinates.forEach(ring => ring.forEach(transformPt));
      } else if (f.geometry.type === 'MultiPolygon') {
        f.geometry.coordinates.forEach(poly => poly.forEach(ring => ring.forEach(transformPt)));
      }
    });
    return geoData;
  }, [currentBattle, terrainOffset]);

  // Keep engine sync'd with live terrain calibration
  useEffect(() => {
    engine.geoTerrain = transformedGeoTerrain;
  }, [transformedGeoTerrain]);

  // Re-init battlefield when realistic mode or phase changes
  useEffect(() => {
    const bf = BATTLEFIELDS[currentBattle];
    if (!bf || !latLngToPixelRef.current) return;
    const phase = realisticMode && bf.realisticPhases ? bf.realisticPhases[realisticPhase] : null;
    const activeForts = phase ? phase.forts : bf.forts;
    const activeUnits = phase
      ? splitFormationUnits(phase.units, realisticMode, realisticPhase)
      : bf.units;
    const forts = activeForts.map(f => ({ ...f, ...latLngToPixelRef.current(f.lat, f.lng) }));
    const units = activeUnits.map(u => ({ ...u, ...latLngToPixelRef.current(u.lat, u.lng) }));
    engine.initFromBattlefield(forts, units, mapWidth, mapHeight, transformedGeoTerrain);
    engine.running = false;
    setGameStarted(false);
    setVictory(0);
  }, [realisticMode, realisticPhase]);

  // Realistic mode should never start on a blank basemap.
  useEffect(() => {
    if (realisticMode && tileLayer === 'none') {
      setTileLayer('lines');
    }
  }, [realisticMode, tileLayer]);

  // Initialize game when map is ready — uses ref to always get latest battle
  const onMapReady = useCallback((info) => {
    setMapInfo(info);
    setMapWidth(info.width);
    setMapHeight(info.height);
    // Store live Leaflet projection functions
    latLngToPixelRef.current = info.latLngToPixel;
    pixelToLatLngRef.current = info.pixelToLatLng;
    mapInstanceRef.current   = info.map;
    if (typeof window !== 'undefined') window.DBG.map = info.map;

    engine.setProjections(info.latLngToPixel, info.pixelToLatLng);
    refZoomRef.current = info.refZoom;

    // If map is being destroyed (null projections), just clear refs
    if (!info.latLngToPixel || !info.map) return;

    const bf = BATTLEFIELDS[currentBattleRef.current];
    if (!bf) return;

    try {
      // Use realistic phase data if in realistic mode and the battlefield supports it
      const phase = realisticModeRef.current && bf.realisticPhases
        ? bf.realisticPhases[realisticPhaseRef.current]
        : null;
      const activeForts = phase ? phase.forts : bf.forts;
      const activeUnits = phase
        ? splitFormationUnits(phase.units, realisticModeRef.current, realisticPhaseRef.current)
        : bf.units;

      const forts = activeForts.map(f => ({ ...f, ...info.latLngToPixel(f.lat, f.lng) }));
      const units = activeUnits.map(u => ({ ...u, ...info.latLngToPixel(u.lat, u.lng) }));
      engine.currentZoom = info.refZoom;
      engine.centerLat = info.refCenter.lat;
      engine.initFromBattlefield(forts, units, info.width, info.height, transformedGeoTerrain);
      engine.running = false;
      setGameStarted(false);
      setVictory(0);
    } catch (e) {
      console.warn('Map init error:', e);
    }
  }, []);

  // Reproject all units when map pans or zooms
  const onMapMove = useCallback(() => {
    if (latLngToPixelRef.current && mapInstanceRef.current) {
      engine.reprojectFromLatLng(latLngToPixelRef.current);
      // Base zoom is 14. Scale unit visulization by zoom delta.
      const z = mapInstanceRef.current.getZoom();
      engine.currentZoom = z;
      engine.centerLat = mapInstanceRef.current.getCenter().lat;
      setZoomScale(Math.pow(2, z - refZoomRef.current));
    }
  }, []);

  // Keyboard Map Panning (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!mapInstanceRef.current) return;
      
      const PAN_AMOUNT = 40;
      let dx = 0, dy = 0;
      
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': dy = -PAN_AMOUNT; break;
        case 'KeyS': case 'ArrowDown': dy = PAN_AMOUNT; break;
        case 'KeyA': case 'ArrowLeft': dx = -PAN_AMOUNT; break;
        case 'KeyD': case 'ArrowRight': dx = PAN_AMOUNT; break;
        default: return; // ignore other keys
      }
      
      e.preventDefault();
      mapInstanceRef.current.panBy([dx, dy]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Terrain Calibration (Shift + Alt + Arrows)
  useEffect(() => {
    const handleCalibrate = (e) => {
      if (e.shiftKey && e.altKey) {
        const transStep = 0.0002;
        const scaleStep = 0.005;
        setTerrainOffset(prev => {
          let { lat, lng, scaleLat, scaleLng } = prev;
          // Translation
          if (e.code === 'ArrowUp') lat += transStep;
          if (e.code === 'ArrowDown') lat -= transStep;
          if (e.code === 'ArrowLeft') lng -= transStep;
          if (e.code === 'ArrowRight') lng += transStep;
          // Scaling
          if (e.code === 'KeyW') scaleLat += scaleStep;
          if (e.code === 'KeyS') scaleLat -= scaleStep;
          if (e.code === 'KeyD') scaleLng += scaleStep;
          if (e.code === 'KeyA') scaleLng -= scaleStep;
          
          if (lat !== prev.lat || lng !== prev.lng || scaleLat !== prev.scaleLat || scaleLng !== prev.scaleLng) {
            console.log(`[Calibration] offset: { lat: ${lat.toFixed(5)}, lng: ${lng.toFixed(5)}, scaleLat: ${scaleLat.toFixed(3)}, scaleLng: ${scaleLng.toFixed(3)} }`);
          }
          return { lat, lng, scaleLat, scaleLng };
        });
      }
    };
    window.addEventListener('keydown', handleCalibrate);
    return () => window.removeEventListener('keydown', handleCalibrate);
  }, []);

  // Spacebar = temporary pan mode (SVG becomes transparent so Leaflet receives drags)
  useEffect(() => {
    const down = (e) => { if (e.code === 'Space') { e.preventDefault(); setIsPanMode(true);  } };
    const up   = (e) => { if (e.code === 'Space') setIsPanMode(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    const animate = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      engine.update(delta);
      
      // Play context-appropriate sound effects
      let playedAudio = 0;
      let engagedCount = 0;
      let playedMelee = 0;
      engine.groups.forEach(g => {
        if (g.isEngaged) engagedCount++;
        if (g.justFired && playedAudio < 4) {
          soundManager.playCombat(g.unitType, g.x, g.y, mapWidth / 2, mapHeight / 2);
          playedAudio++;
        }
        if (g.isEngaged && playedMelee < 2) {
          soundManager.playMelee(g.x, g.y, mapWidth / 2, mapHeight / 2);
          playedMelee++;
        }
      });

      // Update sound intensity based on how many units are fighting
      if (soundInited) {
        soundManager.updateIntensity(engagedCount, engine.groups.length);
        if (engagedCount > 0) {
          soundManager.startLoop('drums');
        } else {
          soundManager.stopLoop('drums');
        }
      }

      setGameState({
        bases: engine.bases.map(b => ({ ...b })),
        groups: engine.groups.map(g => ({ ...g })),
        dyingGroups: engine.dyingGroups.map(g => ({ ...g })),
        effects: engine.effects,
        smoke: engine.smoke,
        // Enemy positions last reported by our scouts, still on the staff map
        // even though nobody has eyes on them now.
        contacts: Array.from(engine.contacts[1].values())
          .filter(c => !engine.groups.some(g => g.id === c.id && g.visibleTo1)),
        selectedGroupIds: new Set(engine.selectedGroupIds),
      });
      const v = engine.checkVictory();
      if (v && !victory) {
        setVictory(v);
        soundManager.playVictory();
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [victory]);

  const getSvgPos = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    }
    // Fallback
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (mapWidth / rect.width),
      y: (e.clientY - rect.top) * (mapHeight / rect.height),
    };
  }, []);

  const findFortAt = useCallback((x, y) =>
    engine.bases.find(b => Math.hypot(b.x - x, b.y - y) < FORT_HIT), []);


  const onMouseDown = (e) => {
    initSound(); // Init audio on first interaction
    if (victory || e.target.closest('.sidebar')) return;

    // Middle-click (1) or Right-click (2) initiates map panning
    if (e.button === 1 || e.button === 2) {
      setDragState({ type: 'pan', lastX: e.clientX, lastY: e.clientY, distance: 0 });
      return;
    }

    const pos = getSvgPos(e);
    if (!pos) return;

    // Check if clicked directly on a player unit — find closest within hit radius
    let clickedGroup = null;
    let closestDist = Infinity;
    for (const g of engine.groups) {
      if (g.owner === 1) {
        // Generous grab radius around the unit's own footprint.
        const hitRadius = Math.max(18, engine.getFrontagePx(g) * 0.7);
        const dist = Math.hypot(pos.x - g.x, pos.y - g.y);
        if (dist <= hitRadius && dist < closestDist) {
          closestDist = dist;
          clickedGroup = g;
        }
      }
    }

    if (clickedGroup) {
      // If unit isn't selected (and we aren't multi-selecting), select only it
      if (!e.shiftKey && !engine.selectedGroupIds.has(clickedGroup.id)) {
        engine.deselectAll();
      }
      engine.selectedGroupIds.add(clickedGroup.id);
      
      // Immediately start drawing a path
      setDragState({ type: 'path', startX: pos.x, startY: pos.y, points: [pos], lastPointTime: performance.now() });
      return;
    }

    // Fallback: check if clicking nearby a selected unit to start a path
    for (const gid of engine.selectedGroupIds) {
      const g = engine.groups.find(gr => gr.id === gid);
      if (g) {
        const dist = Math.hypot(pos.x - g.x, pos.y - g.y);
        // Start a march by dragging from just outside the unit's footprint.
        if (dist <= Math.max(24, engine.getFrontagePx(g) * 0.9)) {
          setDragState({ type: 'path', startX: pos.x, startY: pos.y, points: [pos], lastPointTime: performance.now() });
          return;
        }
      }
    }

    if (!e.shiftKey) engine.deselectAll();
    setDragState({ type: 'box', startX: pos.x, startY: pos.y, mouseX: pos.x, mouseY: pos.y });
  };

  const onMouseMove = (e) => {
    if (dragState && dragState.type === 'pan') {
       const dx = dragState.lastX - e.clientX;
       const dy = dragState.lastY - e.clientY;
       const dist = Math.hypot(dx, dy);
       if (mapInstanceRef.current && dist > 0) {
           mapInstanceRef.current.panBy([dx, dy], { animate: false });
       }
       setDragState({ type: 'pan', lastX: e.clientX, lastY: e.clientY, distance: dragState.distance + dist });
       return;
    }

    const pos = getSvgPos(e);
    if (dragState) {
      if (dragState.type === 'path') {
        setDragState(prev => {
          if (!prev) return null;
          const last = prev.points[prev.points.length - 1];
          const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
          // Adaptive threshold: slow drawing captures more points for precision
          const now = performance.now();
          const elapsed = now - (prev.lastPointTime || now);
          const speed = elapsed > 0 ? dist / elapsed : 999; // px/ms
          // Slow movement (<0.3 px/ms) → threshold 8px; fast movement → up to 40px
          const threshold = Math.max(8, Math.min(40, speed * 80));
          if (dist > threshold) {
            return { ...prev, points: [...prev.points, pos], lastPointTime: now };
          }
          return prev;
        });
      } else {
        setDragState(prev => prev ? { ...prev, mouseX: pos.x, mouseY: pos.y } : null);
      }
    }
    // Unit hover — check if mouse is over any visible unit
    if (!dragState) {
      let foundUnit = null;
      for (const g of gameState.groups) {
        if (g.count <= 0) continue;
        if (g.owner !== 1 && !g.visible) continue; // fog of war
        const hitRadius = Math.max(14, engine.getFrontagePx(g) * 0.55);
        const dx = pos.x - g.x, dy = pos.y - g.y;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          foundUnit = g;
          break;
        }
      }
      if (foundUnit) {
        const terrain = engine.getTerrainAt(foundUnit.x, foundUnit.y);
        setHoverUnit({ group: foundUnit, x: pos.x, y: pos.y, terrain });
        setHoverInfo(null);
        return; // skip terrain hover when over a unit
      } else {
        if (hoverUnit) setHoverUnit(null);
      }
    }

    // Terrain hover when tactical overlay is visible and not dragging
    if (showTacticalOverlay && !dragState && pixelToLatLngRef.current && transformedGeoTerrain) {
      const loc = pixelToLatLngRef.current(pos.x, pos.y);
      if (loc) {
        let found = null;
        for (const feature of transformedGeoTerrain.features) {
          const geom = feature.geometry;
          let rings = [];
          if (geom.type === 'Polygon') rings = [geom.coordinates[0]];
          else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map(p => p[0]);
          else continue;
          for (const ring of rings) {
            let inside = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
              const xi = ring[i][0], yi = ring[i][1];
              const xj = ring[j][0], yj = ring[j][1];
              if (((yi > loc.lat) !== (yj > loc.lat)) &&
                  (loc.lng < (xj - xi) * (loc.lat - yi) / (yj - yi) + xi))
                inside = !inside;
            }
            if (inside) { found = feature; break; }
          }
          if (found) break;
        }
        if (found) {
          const t = TERRAIN[found.properties.type] || TERRAIN.grass;
          setHoverInfo({ x: pos.x, y: pos.y, terrain: t, featureLabel: found.properties.label });
        } else {
          if (hoverInfo) setHoverInfo(null);
        }
      }
    } else {
      if (hoverInfo) setHoverInfo(null);
    }
  };

  const onMouseUp = (e) => {
    if (!dragState) return;
    const pos = getSvgPos(e);

    if (dragState.type === 'path') {
      if (dragState.points.length >= 1) {
        // Append final position and tag all waypoints with lat/lng for reprojection
        const rawPts = [...dragState.points, pos];
        const allPts = rawPts.map(p => ({
          ...p,
          ...(pixelToLatLngRef.current ? pixelToLatLngRef.current(p.x, p.y) : {}),
        }));
        engine.orderPath(Array.from(engine.selectedGroupIds), allPts);
      }
    } else if (dragState.type === 'box') {
      const minX = Math.min(dragState.startX, dragState.mouseX);
      const maxX = Math.max(dragState.startX, dragState.mouseX);
      const minY = Math.min(dragState.startY, dragState.mouseY);
      const maxY = Math.max(dragState.startY, dragState.mouseY);
      const boxIds = [];
      engine.groups.forEach(g => {
        if (g.owner === 1 && g.x >= minX && g.x <= maxX && g.y >= minY && g.y <= maxY) {
          boxIds.push(g.id);
        }
      });
      if (boxIds.length > 0) {
         engine.setSelection(boxIds);
      }
    }
    if (dragState.type === 'pan') {
       // If it was a right-click and they barely moved the mouse, treat it as a move command
       if (e.button === 2 && dragState.distance < 5) {
          const pos = getSvgPos(e);
          if (engine.selectedGroupIds.size > 0) {
            engine.orderPath(Array.from(engine.selectedGroupIds), [pos]);
          }
       }
       setDragState(null);
       return;
    }

    setDragState(null);
  };

  const onContextMenu = (e) => {
    e.preventDefault(); // Prevent standard right-click menu
  };

  const startGame = () => {
    initSound();
    engine.running = true;
    setGameStarted(true);
  };
  const endGame = () => {
    engine.running = false;
    setGameStarted(false);
    setVictory(0);
    // Re-init the battlefield from scratch
    const bf = BATTLEFIELDS[currentBattleRef.current];
    if (bf && latLngToPixelRef.current) {
      const phase = realisticModeRef.current && bf.realisticPhases
        ? bf.realisticPhases[realisticPhaseRef.current]
        : null;
      const activeForts = phase ? phase.forts : bf.forts;
      const activeUnits = phase
        ? splitFormationUnits(phase.units, realisticModeRef.current, realisticPhaseRef.current)
        : bf.units;
      const forts = activeForts.map(f => ({ ...f, ...latLngToPixelRef.current(f.lat, f.lng) }));
      const units = activeUnits.map(u => ({ ...u, ...latLngToPixelRef.current(u.lat, u.lng) }));
      engine.initFromBattlefield(forts, units, mapWidth, mapHeight, transformedGeoTerrain);
    }
  };
  const restart = () => { endGame(); startGame(); };

  const ownerColor = (o) => o === 1 ? '#4a78bb' : o === 2 ? '#c03030' : '#888';
  const ownerColorBright = (o) => o === 1 ? '#6699dd' : o === 2 ? '#ee5555' : '#aaa';

  const sourceObj = dragState?.type === 'fort' ? engine.getBase(dragState.sourceId) : null;

  // Troop counts for HUD
  const countSide = (owner) => {
    const fld = gameState.groups.filter(g => g.owner === owner);
    const total = fld.reduce((s, g) => s + Math.ceil(g.count), 0);
    return {
      total,
      forts: gameState.bases.filter(b => b.owner === owner).length,
      inf: fld.filter(g => g.unitType === 'infantry').reduce((s, g) => s + Math.ceil(g.count), 0),
      cav: fld.filter(g => g.unitType === 'cavalry').reduce((s, g) => s + Math.ceil(g.count), 0),
      can: fld.filter(g => g.unitType === 'cannon').reduce((s, g) => s + Math.ceil(g.count), 0),
    };
  };
  const union = countSide(1);
  const confed = countSide(2);

  const activeBattlefield = useMemo(() => {
    const bf = BATTLEFIELDS[currentBattle];
    const phase = realisticMode && bf?.realisticPhases ? bf.realisticPhases[realisticPhase] : null;
    const mapView = phase?.mapView;
    return {
      ...bf,
      geoTerrain: transformedGeoTerrain,
      bounds: mapView?.bounds || bf.bounds,
      center: mapView?.center || bf.center,
      zoom: mapView?.zoom || bf.zoom,
    };
  }, [currentBattle, realisticMode, realisticPhase, transformedGeoTerrain]);

  return (
    <div className="app-wrapper" onContextMenu={onContextMenu}>
      <div className="sidebar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
           <h1>CIVY WAR 
             <button className="rules-toggle" onClick={() => setShowRules(true)} title="How to Play">?</button>
           </h1>
        </div>

        <div className="sidebar-scores" data-wt="scoreboard">
           <div className="score-box union">
             <h3>UNION</h3>
             <div className="score-total">{union.total}</div>
             <div className="score-details">
               {union.forts} flags<br />
               {union.inf}⚔ {union.cav}♞ {union.can}☉
             </div>
           </div>
           
           <div className="score-vs">VS</div>
           
           <div className="score-box confed">
             <h3>CSA</h3>
             <div className="score-total">{confed.total}</div>
             <div className="score-details">
               {confed.forts} flags<br />
               {confed.inf}⚔ {confed.cav}♞ {confed.can}☉
             </div>
           </div>
        </div>

        {/* Battle selector */}
        <div className="sidebar-section" data-wt="battle-selector">
          <label className="sidebar-label">Battle</label>
          <select className="sidebar-select" value={currentBattle}
            onChange={(e) => { setCurrentBattle(e.target.value); setRealisticMode(false); }}>
            {Object.entries(BATTLEFIELDS).map(([key, bf]) => (
              <option key={key} value={key}>{bf.name}</option>
            ))}
          </select>
          <div className="battle-info">
            {BATTLEFIELDS[currentBattle]?.date}
          </div>
        </div>

        {/* Realistic Mode — only shown when battlefield supports it */}
        {BATTLEFIELDS[currentBattle]?.realisticPhases && (
          <div className="sidebar-section realistic-mode-section">
            <label className="sidebar-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Mode</span>
            </label>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <button
                className={`mode-btn ${!realisticMode ? 'mode-btn-active' : ''}`}
                onClick={() => setRealisticMode(false)}
              >Standard</button>
              <button
                className={`mode-btn ${realisticMode ? 'mode-btn-active mode-btn-realistic' : ''}`}
                onClick={() => setRealisticMode(true)}
              >⚔ Realistic</button>
            </div>
            {realisticMode && (
              <>
                <label className="sidebar-label">Day / Phase</label>
                <select className="sidebar-select" value={realisticPhase}
                  onChange={(e) => setRealisticPhase(e.target.value)}>
                  {Object.entries(BATTLEFIELDS[currentBattle].realisticPhases).map(([key, phase]) => (
                    <option key={key} value={key}>{phase.name}</option>
                  ))}
                </select>
                <div className="battle-info" style={{ marginTop: 4 }}>
                  {BATTLEFIELDS[currentBattle].realisticPhases[realisticPhase]?.date}
                </div>
                <div className="battle-info" style={{ marginTop: 4, fontStyle: 'italic' }}>
                  {BATTLEFIELDS[currentBattle].realisticPhases[realisticPhase]?.description}
                </div>
                <button
                  className="briefing-btn"
                  onClick={() => setShowBriefing(true)}
                >📜 Commander's Briefing</button>
              </>
            )}
          </div>
        )}

        {/* Map style selector */}
        <div className="sidebar-section">
          <label className="sidebar-label">Map Tiles</label>
          <select className="sidebar-select" value={tileLayer}
            onChange={(e) => setTileLayer(e.target.value)}>
            <option value="none">None (Parchment)</option>
            {Object.entries(TILE_LAYERS).map(([key, tl]) => (
              <option key={key} value={key}>{tl.name}</option>
            ))}
          </select>
          <label className="sidebar-label" style={{marginTop: 6}}>Filter</label>
          <select className="sidebar-select" value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}>
            <option value="vintage">Vintage</option>
            <option value="warm">Warm</option>
            <option value="parchment">Parchment</option>
            <option value="dark">Dark</option>
            <option value="natural">Natural (no filter)</option>
          </select>
        </div>

        {/* Start / End Game */}
        <div className="sidebar-section" data-wt="start-btn" style={{ textAlign: 'center' }}>
          {!gameStarted ? (
            <>
              <button className="game-start-btn" onClick={startGame}>Start Battle</button>
              <button className="walkthrough-btn" onClick={() => setWalkthroughStep(1)}>How to Play</button>
            </>
          ) : (
            <button className="game-end-btn" onClick={endGame}>End Battle</button>
          )}
        </div>

        <div className="sidebar-footer" data-wt="controls-hint">
           <p><strong>Select:</strong> Left-click or Drag-box</p>
           <p><strong>Move:</strong> Drag from selected units</p>
           <button className="mute-btn" onClick={() => {
             initSound();
             const muted = soundManager.toggleMute();
             setIsMuted(muted);
           }}>
             {isMuted ? '🔇 Unmute' : '🔊 Sound On'}
           </button>
        </div>
      </div>

      <div className="game-container" data-wt="map-area">

      {/* Zoom + pan controls */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 4,
        pointerEvents: 'all',
      }} data-wt="map-controls">
        <button className="map-ctrl-btn" title="Zoom In"
          onClick={() => mapInstanceRef.current?.zoomIn(0.5)}>＋</button>
        <button className="map-ctrl-btn" title="Zoom Out"
          onClick={() => mapInstanceRef.current?.zoomOut(0.5)}>－</button>
        <button className="map-ctrl-btn" title="Hold Space to pan"
          style={{ opacity: isPanMode ? 1 : 0.55, background: isPanMode ? '#e8b84b' : undefined }}
          onMouseDown={() => setIsPanMode(true)}
          onMouseUp={() => setIsPanMode(false)}
          onMouseLeave={() => setIsPanMode(false)}>✋</button>
        <button className="map-ctrl-btn" title="Toggle Tactical Terrain Zones"
          style={{ opacity: showTacticalOverlay ? 1 : 0.55, background: showTacticalOverlay ? '#417a41' : undefined }}
          onClick={() => setShowTacticalOverlay(!showTacticalOverlay)}>🌲</button>
      </div>
      {isPanMode && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.55)', color: '#ffdd88',
          padding: '6px 14px', borderRadius: 8, fontSize: 13,
          pointerEvents: 'none', zIndex: 999,
        }}>Pan Mode — drag the map</div>
      )}

      {/* Leaflet map as background */}
      <MapBackground
        battlefield={activeBattlefield}
        tileLayer={tileLayer}
        mapStyle={mapStyle}
        showTacticalOverlay={showTacticalOverlay}
        onMapReady={onMapReady}
        onMapMove={onMapMove}
      />

      {/* Game SVG overlay */}
      <svg
        ref={svgRef}
        className="game-svg-overlay"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: isPanMode ? 'none' : 'all', cursor: isPanMode ? 'grab' : 'default' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onContextMenu={onContextMenu}
      >
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0.5" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="muzzle-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Dirty white powder smoke — warm, not grey */}
          <radialGradient id="smoke-grad">
            <stop offset="0%" stopColor="#faf7ee" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#ece7d8" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#ded8c6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#d4cdb8" stopOpacity="0" />
          </radialGradient>
          {/* Muzzle flash core: white-hot centre bleeding to powder orange */}
          <radialGradient id="flash-grad">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#ffe9a8" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ff9a2e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#e8641a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="blast-grad">
            <stop offset="0%" stopColor="#fffdf2" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffd067" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff8a1e" stopOpacity="0" />
          </radialGradient>
          {/* Arrowhead markers for PBS-style movement arrows — scale with zoom */}
          {/* (arrowheads now drawn manually as polygons for correct direction) */}
        </defs>

        {/* ── Fog of War ──
            The lit area is the actual shape of what our troops can see:
            rays cut short by timber, buildings and intervening crests, so
            woods and ridges throw genuine blind spots across the field. */}
        {(() => {
          const fg = gameState.groups.filter(g => g.owner === 1 && g.count > 0 && g.sight);
          if (!fg.length) return null;
          return (
            <>
              <defs>
                {fg.map(g => (
                  <radialGradient key={`rg-${g.id}`} id={`rg-${g.id}`}
                    cx={g.x} cy={g.y} r={g.sight.maxR} gradientUnits="userSpaceOnUse">
                    <stop offset="55%" stopColor="black" stopOpacity="1" />
                    <stop offset="82%" stopColor="black" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                  </radialGradient>
                ))}
                <filter id="fog-soft" x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
                <mask id="fog-mask">
                  <rect x={-mapWidth} y={-mapHeight} width={mapWidth * 3} height={mapHeight * 3} fill="white" />
                  <g filter="url(#fog-soft)">
                    {fg.map(g => (
                      <path key={`fm-${g.id}`} d={smoothClosedPath(g.sight.pts)}
                        fill={`url(#rg-${g.id})`} />
                    ))}
                  </g>
                </mask>
              </defs>
              <rect x={-mapWidth} y={-mapHeight} width={mapWidth * 3} height={mapHeight * 3}
                fill="rgba(14,11,7,0.52)" mask="url(#fog-mask)"
                pointerEvents="none" />
            </>
          );
        })()}

        {/* Last-known enemy positions — the pencil marks on the staff map.
            Scouts reported them; nobody has eyes on them now. */}
        {(gameState.contacts || []).map(c => {
          const fade = Math.max(0.12, 1 - c.age / 22);
          // Drawn at the frontage the unit had when it was last reported.
          const w = engine.getFrontagePx(c), h = engine.getDepthPx(c);
          return (
            <g key={`contact-${c.id}`} pointerEvents="none" opacity={fade * 0.65}>
              <rect x={c.x - w / 2} y={c.y - h / 2} width={w} height={h} rx={2}
                fill="none" stroke="#b8503c" strokeWidth={1.2} strokeDasharray="3 3" />
              <text x={c.x} y={c.y - h / 2 - 3} textAnchor="middle" fill="#c8705c"
                fontSize="8" fontFamily="'Georgia', serif" fontStyle="italic">
                last seen
              </text>
            </g>
          );
        })}



        {/* ── Powder smoke ──
            Black powder threw up enormous banks of white smoke that hung
            over the firing line and blinded both sides. It drifts, thickens
            where the fighting is hottest, and the engine treats it as a real
            obstruction to sight and fire — not just decoration. */}
        {(gameState.smoke || []).length > 0 && (
          <g pointerEvents="none">
            {gameState.smoke.map((s, i) => {
              const age = Math.min(1, s.t / s.life);
              const r = s.r0 + (s.r - s.r0) * (0.35 + age * 1.25);
              const alpha = (1 - age) * (1 - age) * (0.55 + s.density);
              if (alpha < 0.02) return null;
              const j = s.seed * 6 - 3;
              return (
                <g key={`smoke-${i}`} opacity={Math.min(0.9, alpha)}>
                  <circle cx={s.x} cy={s.y} r={r} fill="url(#smoke-grad)" />
                  <circle cx={s.x + j} cy={s.y - r * 0.28} r={r * 0.7} fill="url(#smoke-grad)" />
                  <circle cx={s.x - j * 0.7} cy={s.y + r * 0.2} r={r * 0.55} fill="url(#smoke-grad)" />
                </g>
              );
            })}
          </g>
        )}


        {/* Drag arrow from fort */}
        {dragState && sourceObj && (
          <>
            <line x1={sourceObj.x} y1={sourceObj.y} x2={dragState.mouseX} y2={dragState.mouseY}
              stroke="rgba(255,220,80,0.55)" strokeWidth={Math.max(1, 2.5 * zoomScale)} strokeDasharray={`${8 * zoomScale} ${5 * zoomScale}`}
              pointerEvents="none" />
            <circle cx={dragState.mouseX} cy={dragState.mouseY} r={7 * Math.max(0.5, zoomScale)}
              fill="rgba(255,220,80,0.2)" stroke="#ffdd55" strokeWidth={Math.max(0.5, 1.5 * zoomScale)}
              pointerEvents="none" />
          </>
        )}

        {/* Persistent faded movement arrows showing current orders */}
        {gameState.groups.filter(g => g.owner === 1 && g.path && g.path.length > 0 && g.count > 0).map(g => {
          const pts = [{ x: g.x, y: g.y }, ...g.path];
          if (pts.length < 2) return null;
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const color = 'rgba(58,123,213,0.15)';
          // Compute arrowhead direction from a longer segment for stability
          const last = pts[pts.length - 1];
          let dx = 0, dy = 0;
          // Walk backwards from the end to find a point far enough away for a stable angle
          for (let pi = pts.length - 2; pi >= 0; pi--) {
            dx = last.x - pts[pi].x;
            dy = last.y - pts[pi].y;
            if (Math.hypot(dx, dy) > 5) break;
          }
          const len = Math.hypot(dx, dy);
          if (len < 1) return (
            <path key={`order-${g.id}`} d={d}
              fill="none" stroke={color} strokeWidth={Math.max(1, 3 * zoomScale)}
              strokeLinecap="round" strokeLinejoin="round"
              pointerEvents="none" />
          );
          const ux = dx / len, uy = dy / len;
          const aw = Math.max(4, 7 * zoomScale);
          const ah = Math.max(6, 12 * zoomScale);
          const tip = last;
          const base1 = { x: tip.x - ux * ah + uy * aw, y: tip.y - uy * ah - ux * aw };
          const base2 = { x: tip.x - ux * ah - uy * aw, y: tip.y - uy * ah + ux * aw };
          return (
            <g key={`order-${g.id}`} pointerEvents="none">
              <path d={d}
                fill="none" stroke={color} strokeWidth={Math.max(1, 3 * zoomScale)}
                strokeLinecap="round" strokeLinejoin="round" />
              <polygon points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
                fill="rgba(58,123,213,0.35)" stroke="rgba(58,123,213,0.25)" strokeWidth={1} />
            </g>
          );
        })}

        {/* Freeform Path Drawing — bold PBS-style movement arrows */}
        {dragState?.type === 'path' && dragState.points.length > 1 && (() => {
          // Use color based on owner of selection
          const selIds = engine.selectedGroupIds;
          const firstSel = selIds.size > 0 ? gameState.groups.find(g => selIds.has(g.id)) : null;
          const isUnionDrag = !firstSel || firstSel.owner === 1;
          const arrowColor = isUnionDrag ? 'rgba(58,123,213,0.9)' : 'rgba(192,57,43,0.9)';
          const fillColor = isUnionDrag ? '#3a7bd5' : '#c0392b';
          const pts = dragState.points;
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          // Compute arrowhead direction from a longer segment for stability
          const last = pts[pts.length - 1];
          let dx = 0, dy = 0;
          for (let pi = pts.length - 2; pi >= 0; pi--) {
            dx = last.x - pts[pi].x;
            dy = last.y - pts[pi].y;
            if (Math.hypot(dx, dy) > 5) break;
          }
          const len = Math.hypot(dx, dy);
          const ux = len > 0 ? dx / len : 1, uy = len > 0 ? dy / len : 0;
          const aw = Math.max(4, 7 * zoomScale);
          const ah = Math.max(6, 12 * zoomScale);
          const tip = last;
          const base1 = { x: tip.x - ux * ah + uy * aw, y: tip.y - uy * ah - ux * aw };
          const base2 = { x: tip.x - ux * ah - uy * aw, y: tip.y - uy * ah + ux * aw };
          return (
            <g pointerEvents="none">
              <path d={d}
                fill="none" stroke={arrowColor} strokeWidth={Math.max(1, 4 * zoomScale)}
                strokeLinecap="round" strokeLinejoin="round" />
              <polygon points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
                fill={fillColor} stroke={fillColor} strokeWidth={1} />
            </g>
          );
        })()}

        {/* Selection Box */}
        {dragState?.type === 'box' && (
           <rect 
             x={Math.min(dragState.startX, dragState.mouseX)}
             y={Math.min(dragState.startY, dragState.mouseY)}
             width={Math.abs(dragState.mouseX - dragState.startX)}
             height={Math.abs(dragState.mouseY - dragState.startY)}
             fill="rgba(138, 172, 230, 0.2)"
             stroke="rgba(138, 172, 230, 0.8)"
             strokeWidth="1"
             pointerEvents="none"
           />
        )}

        {/* Fort flags — larger, clearer */}
        {gameState.bases.map(base => {
          const col = ownerColor(base.owner);
          const colBr = ownerColorBright(base.owner);
          const isSource = dragState?.type === 'fort' && dragState.sourceId === base.id;
          const poleH = 28;
          const flagW = 22;
          const flagH = 14;

          return (
            <g key={`b-${base.id}`} style={{ cursor: base.owner === 1 ? 'pointer' : 'default' }}>
              {/* Selection glow */}
              {isSource && (
                <circle cx={base.x} cy={base.y} r={30}
                  fill="none" stroke="#ffd700" strokeWidth={2.5} opacity={0.5}
                  filter="url(#glow)" />
              )}
              {/* Pole */}
              <line x1={base.x} y1={base.y + 12} x2={base.x} y2={base.y - poleH + 8}
                stroke="#8a7e6a" strokeWidth={2.5} strokeLinecap="round" />
              {/* Flag */}
              <path d={`M${base.x},${base.y - poleH + 8} L${base.x + flagW},${base.y - poleH + 8 + flagH / 2} L${base.x},${base.y - poleH + 8 + flagH} Z`}
                fill={col} stroke={colBr} strokeWidth={1} filter="url(#shadow)" />
              {/* Base marker dot */}
              <circle cx={base.x} cy={base.y + 12} r={4} fill="#6a6050" stroke="#444" strokeWidth={1} />
              {/* Contested — the position has to be occupied and held, not
                  just ridden past. An enemy still in the works stops the clock. */}
              {base.capture > 0 && (
                <>
                  <circle cx={base.x} cy={base.y + 12} r={13}
                    fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={3} />
                  <circle cx={base.x} cy={base.y + 12} r={13}
                    fill="none" stroke={ownerColorBright(base.captureBy)} strokeWidth={3}
                    strokeDasharray={`${Math.max(0, base.capture) * 81.7} 81.7`}
                    strokeLinecap="round"
                    transform={`rotate(-90, ${base.x}, ${base.y + 12})`} />
                </>
              )}
              {/* Label */}
              <text x={base.x} y={base.y + 30} textAnchor="middle" fill="#bbb"
                fontSize="9" fontFamily="'Georgia', serif" pointerEvents="none"
                opacity={0.75} letterSpacing="0.3">
                {base.label}
              </text>
            </g>
          );
        })}

        {/* Marching groups — bars sized by troop count, facing enemy */}
        {gameState.groups.map(group => {
          const isUnion = group.owner === 1;
          const isSelected = gameState.selectedGroupIds && gameState.selectedGroupIds.has(group.id);
          // Fog of war: hide enemy units outside friendly sight
          if (!isUnion && !group.visible) return null;


          // Facing: rendering uses the smoothly interpolated angle from GameEngine
          const angleDeg = ((group.angle || 0) * 180 / Math.PI) + 90;

          const colors = {
            infantry: isUnion ? '#3b6098' : '#a82525',
            cavalry:  isUnion ? '#4a88c0' : '#c04828',
            cannon:   isUnion ? '#2a406b' : '#7a1e1e',
            commander: isUnion ? '#d4a520' : '#b86020',
          };
          const outlines = {
            infantry: isUnion ? '#1e3560' : '#601010',
            cavalry:  isUnion ? '#2a5580' : '#752010',
            cannon:   isUnion ? '#152040' : '#400e0e',
            commander: isUnion ? '#8a6800' : '#7a3000',
          };

          // Commander — same bar/count/morale format as cavalry, but gold with aura ring
          if (group.unitType === 'commander') {
            const cw = engine.getFrontagePx(group), ch = engine.getDepthPx(group);
            const validCount = isNaN(group.count) ? 1 : Math.max(0, group.count);
            return (
              <g key={`group-${group.id}`}>
                {/* Aura ring */}
                 <circle cx={group.x} cy={group.y} r={engine.getCommanderAura()}
                  fill="none"
                  stroke={isUnion ? 'rgba(220,180,40,0.15)' : 'rgba(200,100,30,0.15)'}
                  strokeWidth={1.5} strokeDasharray="6 4" pointerEvents="none" />
                {/* Selection ring */}
                {isSelected && (
                  <rect x={group.x - cw/2 - 4*zoomScale} y={group.y - ch/2 - 4*zoomScale} width={cw + 8*zoomScale} height={ch + 8*zoomScale}
                    fill="none" stroke="#ffd700" strokeWidth={2} strokeDasharray="4 2"
                    transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} />
                )}
                {/* Gold cavalry bar — uses angleDeg to face enemies like other units */}
                <rect x={group.x - cw/2} y={group.y - ch/2} width={cw} height={ch} rx={2}
                  fill={colors.commander} stroke={outlines.commander} strokeWidth={1.5}
                  transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`}
                  filter="url(#shadow)" />
                {/* X mark (cavalry style) */}
                <g transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} pointerEvents="none">
                  <line x1={group.x - 4} y1={group.y - 3} x2={group.x + 4} y2={group.y + 3}
                    stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                  <line x1={group.x + 4} y1={group.y - 3} x2={group.x - 4} y2={group.y + 3}
                    stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                </g>
                {/* Count + star label */}
                <text x={group.x} y={group.y - ch/2 - 4} textAnchor="middle"
                  fill="#ffd700" fontSize="11" fontWeight="bold" fontFamily="'Georgia', serif"
                  pointerEvents="none"
                  style={{ textShadow: '1px 1px 3px #000, -1px -1px 2px #000' }}>
                  ⭐ {Math.ceil(validCount)}{group.isBroken ? ' 🏳️' : ''}
                </text>
                {/* Morale — darkens as morale drops (same as other units) */}
                {(() => {
                  const darkAlpha = Math.max(0, (1 - Math.max(0, group.morale || 0) / 100) * 0.75);
                  return (
                    <g transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} pointerEvents="none">
                      <rect x={group.x - cw/2} y={group.y - ch/2} width={cw} height={ch} rx={2}
                        fill={`rgba(0,0,0,${darkAlpha})`} />
                    </g>
                  );
                })()}
              </g>
            );
          }


          // Drawn at the unit's real frontage on the ground — a 400-man
          // regiment covers about 250 yards of line, a battery about 120.
          const sw = engine.getFrontagePx(group);
          const sh = engine.getDepthPx(group);

          const c = colors[group.unitType] || colors.infantry;
          const o = outlines[group.unitType] || outlines.infantry;

          return (
            <g key={`group-${group.id}`}>
              <title>{Math.ceil(group.count)} {group.unitType}</title>

              {/* Selection & Range Ring */}
              {engine.selectedGroupIds.has(group.id) && (
                <>
                  <rect x={group.x - sw / 2 - 4*zoomScale} y={group.y - sh / 2 - 4*zoomScale} width={sw + 8*zoomScale} height={sh + 8*zoomScale}
                    fill="none" stroke="#ffd700" strokeWidth={2} strokeDasharray="4 2"
                    transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} />
                  {/* Effective fire range on this ground — woods and low
                      places choke it right down, a ridge opens it out. */}
                  <circle cx={group.x} cy={group.y} r={engine.getEffectiveRange(group)}
                    fill="rgba(0,0,0,0.04)" stroke="rgba(80,60,40,0.5)" strokeWidth={1.5}
                    strokeDasharray="4 4" pointerEvents="none" />
                </>
              )}
              {/* Unit bar */}
              <rect className="unit-bar"
                x={group.x - sw / 2} y={group.y - sh / 2}
                width={sw} height={sh} rx={2}
                fill={c} stroke={o} strokeWidth={1}
                transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`}
                filter="url(#shadow)"
              />
              {/* Inner detail marks — stripes for infantry showing ranks */}
              {group.unitType === 'infantry' && sw > 18 && (
                <g transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} pointerEvents="none">
                  {[...Array(Math.max(2, Math.min(24, Math.floor(sw / 8))))].map((_, si, arr) => {
                    const xOff = -sw / 2 + 5 + si * (sw / arr.length);
                    return (
                      <line key={si}
                        x1={group.x + xOff} y1={group.y - sh / 2}
                        x2={group.x + xOff} y2={group.y + sh / 2}
                        stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
                    );
                  })}
                </g>
              )}
              {/* Cavalry X mark */}
              {group.unitType === 'cavalry' && (
                <g transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} pointerEvents="none">
                  <line x1={group.x - 4} y1={group.y - 3} x2={group.x + 4} y2={group.y + 3}
                    stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                  <line x1={group.x + 4} y1={group.y - 3} x2={group.x - 4} y2={group.y + 3}
                    stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                </g>
              )}
              {/* Cannon dot */}
              {group.unitType === 'cannon' && (
                <circle cx={group.x} cy={group.y} r={2.5}
                  fill="rgba(255,255,255,0.2)" pointerEvents="none" />
              )}
              {/* Count & Status */}
              <text x={group.x} y={group.y - sh / 2 - 4} textAnchor="middle" fill="#fff"
                fontSize="11" fontWeight="bold" fontFamily="'Georgia', serif"
                pointerEvents="none"
                style={{ textShadow: '1px 1px 3px #000, -1px -1px 2px #000' }}>
                {Math.ceil(group.count)}
                {group.isBroken ? " 🏳️" : ""}
              </text>
              
              {/* Recoil — the line rocks back on the discharge. The flame and
                  smoke themselves are drawn by the volley layer above. */}
              {group.fireTimer > 0 && (
                <rect x={group.x - sw / 2} y={group.y - sh / 2} width={sw} height={sh} rx={2}
                  fill="rgba(255,228,160,0.35)" pointerEvents="none"
                  transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} />
              )}

              {/* Out of cartridges — the unit is in line but cannot answer */}
              {group.ammo <= 0 && group.unitType !== 'commander' && (
                <text x={group.x} y={group.y + sh / 2 + 9} textAnchor="middle" fill="#e8a33c"
                  fontSize="8" fontFamily="'Georgia', serif" pointerEvents="none"
                  style={{ textShadow: '1px 1px 2px #000' }}>NO AMMO</text>
              )}

              {/* Morale — bar dims as morale drops */}
              {(() => {
                const darkAlpha = Math.max(0, (1 - Math.max(0, group.morale || 0) / 100) * 0.75);
                return (
                  <g transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`} pointerEvents="none">
                    <rect x={group.x - sw/2} y={group.y - sh/2} width={sw} height={sh} rx={2}
                      fill={`rgba(0,0,0,${darkAlpha})`} />
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Dying units — fade out animation */}
        {(gameState.dyingGroups || []).map(group => {
          const isUnion = group.owner === 1;
          const fadePct = Math.max(0, group.fadeTimer);
          const angleDeg = ((group.angle || 0) * 180 / Math.PI) + 90;

          const colors = {
            infantry: isUnion ? '#3b6098' : '#a82525',
            cavalry:  isUnion ? '#4a88c0' : '#c04828',
            cannon:   isUnion ? '#2a406b' : '#7a1e1e',
            commander: isUnion ? '#d4a520' : '#b86020',
          };
          const outlines = {
            infantry: isUnion ? '#1e3560' : '#601010',
            cavalry:  isUnion ? '#2a5580' : '#752010',
            cannon:   isUnion ? '#152040' : '#400e0e',
            commander: isUnion ? '#8a6800' : '#7a3000',
          };

          if (group.unitType === 'commander') {
            const cw = engine.getFrontagePx(group), ch = engine.getDepthPx(group);
            return (
              <g key={`dying-${group.id}`} opacity={fadePct} pointerEvents="none">
                <rect x={group.x - cw/2} y={group.y - ch/2} width={cw} height={ch} rx={2}
                  fill={colors.commander} stroke={outlines.commander} strokeWidth={1.5}
                  transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`}
                  filter="url(#shadow)" />
              </g>
            );
          }

          const sw = engine.getFrontagePx(group);
          const sh = engine.getDepthPx(group);
          const c = colors[group.unitType] || colors.infantry;
          const o = outlines[group.unitType] || outlines.infantry;

          return (
            <g key={`dying-${group.id}`} opacity={fadePct} pointerEvents="none">
              <rect x={group.x - sw / 2} y={group.y - sh / 2}
                width={sw} height={sh} rx={2}
                fill={c} stroke={o} strokeWidth={1}
                transform={`rotate(${angleDeg}, ${group.x}, ${group.y})`}
                filter="url(#shadow)" />
            </g>
          );
        })}

        {/* ── Volley fire ──
            Every discharge is authored once by the engine at the moment the
            volley goes off, so a volley reads as one crashing, rippling
            sheet of flame down the line rather than random per-frame sparks. */}
        {(gameState.effects || []).map(e => {
          const t = e.t;

          // Strike of the volley on the receiving line — dirt, splinters, men down.
          if (e.kind === 'impact') {
            const a = 1 - t / e.life;
            if (a <= 0) return null;
            return (
              <g key={`fx-${e.id}`} pointerEvents="none" opacity={a}>
                {e.spurts.map((s, i) => {
                  const lt = t - s.delay;
                  if (lt < 0) return null;
                  const grow = 1 + lt * 6;
                  return (
                    <circle key={i} cx={e.x + s.ox} cy={e.y + s.oy} r={s.r * grow}
                      fill="rgba(84,66,46,0.5)" />
                  );
                })}
              </g>
            );
          }

          const isCannon = e.kind === 'cannon';
          // Direction of the muzzles, with each flash's own slight deviation.
          const lance = (f) => {
            const c = Math.cos(f.spread), s = Math.sin(f.spread);
            const dx = e.ux * c - e.uy * s;
            const dy = e.ux * s + e.uy * c;
            const local = t - f.delay;
            const k = Math.max(0, 1 - local / (isCannon ? 0.24 : 0.17));
            if (local < 0 || k <= 0) return null;
            const len = f.len * (0.5 + k * 0.5);
            const hw = f.size * (isCannon ? 0.55 : 0.5) * k;
            const tipX = f.x + dx * len, tipY = f.y + dy * len;
            const nx = -dy, ny = dx;
            return { dx, dy, k, len, hw, tipX, tipY, nx, ny };
          };

          return (
            <g key={`fx-${e.id}`} pointerEvents="none">
              {/* The whole face lights up for an instant — at a distance this
                  glare along the line is what you actually saw of a volley */}
              {t < 0.3 && (() => {
                const gx = e.x + e.ux * e.depth * 0.5;
                const gy = e.y + e.uy * e.depth * 0.5;
                return (
                  <ellipse cx={gx} cy={gy}
                    rx={e.frontage * 0.58} ry={e.depth * (isCannon ? 1.0 : 0.7)}
                    transform={`rotate(${Math.atan2(e.py, e.px) * 180 / Math.PI}, ${gx}, ${gy})`}
                    fill="url(#blast-grad)"
                    opacity={(1 - t / 0.3) * (isCannon ? 0.7 : 0.38)} />
                );
              })()}

              {/* The sheet of ball going downrange */}
              {t < 0.34 && e.flashes.map((f, i) => {
                const local = t - f.delay;
                if (local < 0 || local > 0.26) return null;
                const travel = Math.min(1, local / 0.26);
                const reach = e.dist * 0.9;
                const c = Math.cos(f.spread), s = Math.sin(f.spread);
                const dx = e.ux * c - e.uy * s;
                const dy = e.ux * s + e.uy * c;
                const tail = Math.max(0, travel - 0.22);
                return (
                  <line key={`s${i}`}
                    x1={f.x + dx * reach * tail} y1={f.y + dy * reach * tail}
                    x2={f.x + dx * reach * travel} y2={f.y + dy * reach * travel}
                    stroke={isCannon ? 'rgba(255,238,196,0.8)' : 'rgba(255,250,232,0.5)'}
                    strokeWidth={(isCannon ? 0.9 : 0.5) * e.scale}
                    strokeLinecap="round"
                    opacity={(1 - travel) * 0.85} />
                );
              })}

              {/* Muzzle flame — a tapered jet from each company, white at the
                  root and bleeding to powder orange at the tip */}
              {e.flashes.map((f, i) => {
                const L = lance(f);
                if (!L) return null;
                const rootX = f.x - L.dx * f.size * 0.5;
                const rootY = f.y - L.dy * f.size * 0.5;
                return (
                  <g key={`f${i}`} opacity={Math.min(1, L.k * 1.4)}>
                    <path
                      d={`M${rootX + L.nx * L.hw},${rootY + L.ny * L.hw}` +
                         ` Q${f.x + L.nx * L.hw * 1.15},${f.y + L.ny * L.hw * 1.15} ${L.tipX},${L.tipY}` +
                         ` Q${f.x - L.nx * L.hw * 1.15},${f.y - L.ny * L.hw * 1.15} ${rootX - L.nx * L.hw},${rootY - L.ny * L.hw} Z`}
                      fill={isCannon ? '#ffc247' : '#ffd071'} />
                    <path
                      d={`M${rootX + L.nx * L.hw * 0.5},${rootY + L.ny * L.hw * 0.5}` +
                         ` L${f.x + L.dx * L.len * 0.45},${f.y + L.dy * L.len * 0.45}` +
                         ` L${rootX - L.nx * L.hw * 0.5},${rootY - L.ny * L.hw * 0.5} Z`}
                      fill="#fffbe8" />
                    <circle cx={f.x} cy={f.y} r={f.size * (1.05 + L.k * 0.7)}
                      fill="url(#flash-grad)" opacity={0.55} />
                  </g>
                );
              })}

              {/* Concussion ring — you could feel a battery fire from a mile off */}
              {isCannon && t < 0.6 && (
                <circle cx={e.x + e.ux * e.frontage * 0.35} cy={e.y + e.uy * e.frontage * 0.35}
                  r={(8 + t * 150) * e.scale}
                  fill="none" stroke="rgba(255,250,235,0.5)"
                  strokeWidth={(1 - t / 0.6) * 2.4 * e.scale}
                  opacity={(1 - t / 0.6) * 0.65} />
              )}
            </g>
          );
        })}

        {/* Terrain tooltip */}
        {hoverInfo && !dragState && (() => {
          const t = hoverInfo.terrain;
          const name = hoverInfo.featureLabel || t.label;
          const stats = [];
          if (t.speed !== 1.0) stats.push({ label: 'Spd', val: t.speed, pct: Math.round((t.speed - 1) * 100) });
          if (t.defense !== 1.0) stats.push({ label: 'Def', val: t.defense, pct: Math.round((t.defense - 1) * 100) });
          if (t.offense !== 1.0) stats.push({ label: 'Atk', val: t.offense, pct: Math.round((t.offense - 1) * 100) });
          if (!t.passable) stats.push({ label: 'Impassable', val: 0, pct: 0 });
          const statLine = stats.map(s =>
            s.label === 'Impassable' ? 'Impassable' : `${s.label} ${s.pct > 0 ? '+' : ''}${s.pct}%`
          ).join('  ');
          const boxW = Math.max(name.length * 6.5, statLine.length * 5.2, 80);
          const boxH = stats.length ? 32 : 20;
          return (
            <g pointerEvents="none">
              <rect x={hoverInfo.x - boxW / 2} y={hoverInfo.y - boxH - 10}
                width={boxW} height={boxH} rx={4} fill="rgba(15,12,8,0.9)" stroke="rgba(180,160,120,0.4)" strokeWidth={0.8} />
              <text x={hoverInfo.x} y={hoverInfo.y - boxH + 2} textAnchor="middle" fill="#e8dcc8"
                fontSize="10" fontFamily="'Georgia', serif" fontWeight="bold">
                {name}
              </text>
              {stats.length > 0 && (
                <text x={hoverInfo.x} y={hoverInfo.y - boxH + 15} textAnchor="middle"
                  fontSize="8.5" fontFamily="'Georgia', serif">
                  {stats.map((s, i) => {
                    const color = s.label === 'Impassable' ? '#ef8855' : (s.pct > 0 ? '#8ddf6a' : '#ef8855');
                    return <tspan key={i} fill={color}>{i > 0 ? '  ' : ''}{s.label === 'Impassable' ? 'Impassable' : `${s.label} ${s.pct > 0 ? '+' : ''}${s.pct}%`}</tspan>;
                  })}
                </text>
              )}
            </g>
          );
        })()}

        {/* Unit hover tooltip */}
        {hoverUnit && !dragState && (() => {
          const g = hoverUnit.group;
          const t = hoverUnit.terrain;
          const isUnion = g.owner === 1;
          const side = isUnion ? 'Union' : 'CSA';
          const typeLabel = { infantry: 'Infantry', cavalry: 'Cavalry', cannon: 'Artillery', commander: 'Commander' }[g.unitType] || g.unitType;
          const typeIcon = { infantry: '⚔', cavalry: '♞', cannon: '☉', commander: '⭐' }[g.unitType] || '';
          const morale = Math.round(g.morale || 0);
          const moraleColor = morale > 60 ? '#8ddf6a' : morale > 30 ? '#e8c44a' : '#ef8855';
          const count = Math.ceil(g.count);

          // Terrain bonuses
          const stats = [];
          if (t) {
            if (t.speed !== 1.0) stats.push({ label: 'Spd', pct: Math.round((t.speed - 1) * 100) });
            if (t.defense !== 1.0) stats.push({ label: 'Def', pct: Math.round((t.defense - 1) * 100) });
            if (t.offense !== 1.0) stats.push({ label: 'Atk', pct: Math.round((t.offense - 1) * 100) });
          }

          // Real distances, in yards, at the current map scale — including
          // what this patch of ground does to the unit's effective range.
          const toYards = (px) => Math.round(engine.pxToM(px) * 1.0936 / 25) * 25;
          const range = toYards(engine.getEffectiveRange(g));
          const sight = toYards(engine.observerSight(g));
          const ammo = Math.round(g.ammo || 0);
          const titleText = `${typeIcon} ${g.label || typeLabel}`;
          const detailText = `${side} — ${count} men  |  Range ${range} yd  |  Sight ${sight} yd`;
          const boxW = Math.max(titleText.length * 7, detailText.length * 5.2, 190);
          const boxH = 70 + (stats.length ? 13 : 0);
          const tx = Math.min(hoverUnit.x, mapWidth - boxW / 2 - 5);
          const ty = hoverUnit.y - boxH - 14;

          return (
            <g pointerEvents="none">
              <rect x={tx - boxW / 2} y={ty} width={boxW} height={boxH} rx={4}
                fill="rgba(15,12,8,0.92)" stroke={isUnion ? 'rgba(74,120,187,0.6)' : 'rgba(192,48,48,0.6)'} strokeWidth={1} />
              {/* Title */}
              <text x={tx} y={ty + 13} textAnchor="middle" fill={isUnion ? '#6699dd' : '#ee7755'}
                fontSize="11" fontFamily="'Georgia', serif" fontWeight="bold">
                {titleText}
              </text>
              {/* Side + count */}
              <text x={tx} y={ty + 26} textAnchor="middle" fill="#ccc"
                fontSize="9" fontFamily="'Georgia', serif">
                {side} — {count} men  |  Range {range} yd  |  Sight {sight} yd
              </text>
              {/* Morale bar */}
              <rect x={tx - boxW / 2 + 8} y={ty + 32} width={boxW - 16} height={5} rx={2}
                fill="rgba(255,255,255,0.1)" />
              <rect x={tx - boxW / 2 + 8} y={ty + 32} width={Math.max(0, (boxW - 16) * morale / 100)} height={5} rx={2}
                fill={moraleColor} />
              <text x={tx} y={ty + 47} textAnchor="middle" fill={moraleColor}
                fontSize="8.5" fontFamily="'Georgia', serif">
                Morale {morale}%{g.isBroken ? ' — BROKEN' : ''}
              </text>
              {/* Cartridge box — a regiment shot dry has to go to the rear */}
              {g.unitType !== 'commander' && (
                <>
                  <rect x={tx - boxW / 2 + 8} y={ty + 53} width={boxW - 16} height={4} rx={2}
                    fill="rgba(255,255,255,0.1)" />
                  <rect x={tx - boxW / 2 + 8} y={ty + 53} width={Math.max(0, (boxW - 16) * Math.min(1, ammo / 40))} height={4} rx={2}
                    fill={ammo > 12 ? '#c9a24a' : '#ef8855'} />
                  <text x={tx} y={ty + 66} textAnchor="middle" fill={ammo > 12 ? '#c9a24a' : '#ef8855'}
                    fontSize="8.5" fontFamily="'Georgia', serif">
                    {ammo > 0 ? `${ammo} rounds` : 'Out of cartridges'}
                  </text>
                </>
              )}
              {/* Terrain bonuses */}
              {stats.length > 0 && (
                <text x={tx} y={ty + 78} textAnchor="middle"
                  fontSize="8" fontFamily="'Georgia', serif">
                  {stats.map((s, i) => {
                    const color = s.pct > 0 ? '#8ddf6a' : '#ef8855';
                    return <tspan key={i} fill={color}>{i > 0 ? '  ' : ''}{s.label} {s.pct > 0 ? '+' : ''}{s.pct}%</tspan>;
                  })}
                </text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* Walkthrough Tutorial */}
      {walkthroughStep > 0 && (() => {
        const steps = [
          {
            title: 'Welcome, Commander',
            body: 'You command the Union army (blue) against the Confederate forces (red). Capture all enemy flags or destroy their army to win.',
            target: null,
            position: 'center',
          },
          {
            title: 'The Scoreboard',
            body: 'Track each army\'s strength here. You can see total troops, flags held, and a breakdown by unit type: ⚔ Infantry, ♞ Cavalry, ☉ Cannons.',
            target: 'scoreboard',
            position: 'right',
          },
          {
            title: 'Choose Your Battlefield',
            body: 'Pick from three historic Civil War battlefields. Each has different terrain, starting positions, and tactical challenges.',
            target: 'battle-selector',
            position: 'right',
          },
          {
            title: 'The Battlefield',
            body: 'You see only what your troops can see. Woods, buildings and ridges throw real blind spots, and faded \u2018last seen\u2019 marks show where scouts last reported the enemy. Cavalry see more than twice as far as infantry \u2014 screen with them or you will be surprised.',
            target: 'map-area',
            position: 'left',
          },
          {
            title: 'Map Controls',
            body: 'Zoom in/out, toggle pan mode (or hold Space), and toggle the tactical terrain overlay with these buttons.',
            target: 'map-controls',
            position: 'left',
          },
          {
            title: 'Select Your Units',
            body: 'Left-click a unit to select it (it glows gold). Or click and drag a box over multiple units to select them all at once.',
            target: 'map-area',
            position: 'left',
          },
          {
            title: 'Move Your Troops',
            body: 'With units selected, click and drag on the map to draw a movement path. Troops will follow the line you draw. Use roads for 40% faster movement!',
            target: 'controls-hint',
            position: 'right',
          },
          {
            title: 'Fire & Flanking',
            body: 'Troops fire in volleys, but only while halted — a line cannot march and shoot. Fire into an enemy\'s flank or rear rakes his whole line and breaks his nerve far faster than it kills. Crossing open ground in front of guns is how armies were ruined.',
            target: 'map-area',
            position: 'left',
          },
          {
            title: 'Morale, Ammunition & Your Commander',
            body: 'Losses cost morale, and around a third of a unit\'s strength is enough to break it — broken units run for the rear and will not take orders. Every unit carries 40 rounds; shoot it dry and it must fall back on a flag to resupply. Keep your Commander close: he steadies the line and can rally men who have already run.',
            target: 'map-area',
            position: 'left',
          },
          {
            title: 'Taking Ground',
            body: 'A position has to be occupied and held, not ridden past. Sit on an enemy flag with no defender contesting it and it changes hands in a few seconds. Lose your positions and most of your army and you have been beaten — battles end when a command quits the field.',
            target: 'map-area',
            position: 'left',
          },
          {
            title: 'Start the Battle',
            body: 'When you\'re ready, hit Start Battle. Good luck, Commander!',
            target: 'start-btn',
            position: 'right',
          },
        ];
        const step = steps[walkthroughStep - 1];
        const isLast = walkthroughStep === steps.length;
        const isFirst = walkthroughStep === 1;

        // Find highlighted element position
        const targetEl = step.target ? document.querySelector(`[data-wt="${step.target}"]`) : null;
        const rect = targetEl ? targetEl.getBoundingClientRect() : null;

        // Spotlight cutout dimensions (with padding)
        const pad = 8;
        const spot = rect ? {
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        } : null;

        // Tooltip position relative to highlighted element
        const cardW = 340;
        let tooltipStyle = {};
        if (rect && step.position === 'right') {
          // Place to the right of the element
          const leftPos = rect.right + 16;
          tooltipStyle = {
            position: 'fixed',
            top: Math.max(20, Math.min(rect.top, window.innerHeight - 340)),
            left: Math.min(leftPos, window.innerWidth - cardW - 20),
          };
        } else if (rect && step.position === 'left') {
          // Place inside the left edge of a large element, or to its left if small
          const isLarge = rect.width > 500;
          tooltipStyle = {
            position: 'fixed',
            top: Math.max(60, rect.top + 40),
            left: isLarge ? rect.left + 40 : Math.max(20, rect.left - cardW - 16),
          };
        } else {
          tooltipStyle = {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          };
        }

        return (
          <div className="walkthrough-overlay" onClick={() => setWalkthroughStep(0)}>
            {/* Spotlight mask */}
            <svg className="walkthrough-mask" width="100%" height="100%">
              <defs>
                <mask id="wt-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {spot && (
                    <rect x={spot.left} y={spot.top} width={spot.width} height={spot.height}
                      rx="8" fill="black" />
                  )}
                </mask>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="rgba(5,4,2,0.75)" mask="url(#wt-mask)" />
            </svg>

            {/* Spotlight border glow */}
            {spot && (
              <div className="walkthrough-spotlight" style={{
                position: 'fixed', top: spot.top, left: spot.left,
                width: spot.width, height: spot.height,
              }} />
            )}

            {/* Tooltip card */}
            <div className="walkthrough-card" style={tooltipStyle} onClick={e => e.stopPropagation()}>
              <button className="rules-close" onClick={() => setWalkthroughStep(0)}>✕</button>
              <div className="walkthrough-progress">
                {steps.map((_, i) => (
                  <div key={i} className={`walkthrough-dot ${i < walkthroughStep ? 'active' : ''} ${i === walkthroughStep - 1 ? 'current' : ''}`} />
                ))}
              </div>
              <h2 className="walkthrough-title">{step.title}</h2>
              <div className="walkthrough-body">
                {step.body.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              </div>
              <div className="walkthrough-nav">
                {!isFirst && (
                  <button className="walkthrough-prev" onClick={() => setWalkthroughStep(s => s - 1)}>← Back</button>
                )}
                {isLast ? (
                  <button className="walkthrough-next walkthrough-finish" onClick={() => setWalkthroughStep(0)}>Start Playing!</button>
                ) : (
                  <button className="walkthrough-next" onClick={() => setWalkthroughStep(s => s + 1)}>Next →</button>
                )}
              </div>
              <div className="walkthrough-counter">{walkthroughStep} / {steps.length}</div>
            </div>
          </div>
        );
      })()}

      {/* Rules Modal */}
      {/* Commander's Briefing Modal (Realistic Mode) */}
      {showBriefing && realisticMode && (() => {
        const bf = BATTLEFIELDS[currentBattle];
        const phase = bf?.realisticPhases?.[realisticPhase];
        if (!phase) return null;
        return (
          <div className="rules-overlay" onClick={() => setShowBriefing(false)}>
            <div className="rules-modal briefing-modal" onClick={e => e.stopPropagation()}>
              <button className="rules-close" onClick={() => setShowBriefing(false)}>✕</button>
              <h2>⚔ {phase.name}</h2>
              <div className="briefing-date">{phase.date}</div>
              <div className="briefing-objective">
                <strong>Objective:</strong> {phase.victoryCondition}
              </div>
              <div className="rules-content">
                <pre className="briefing-text">{phase.briefing}</pre>
              </div>
              <button className="game-start-btn" style={{marginTop: 16}} onClick={() => { setShowBriefing(false); startGame(); }}>
                Begin Battle
              </button>
            </div>
          </div>
        );
      })()}

      {/* Rules Modal */}
      {showRules && (
        <div className="rules-overlay" onClick={() => setShowRules(false)}>
          <div className="rules-modal" onClick={e => e.stopPropagation()}>
            <button className="rules-close" onClick={() => setShowRules(false)}>✕</button>
            <h2>How to Play Civy War</h2>
            
            <div className="rules-content">
              <h3>The Objective</h3>
              <p>Take and hold the enemy's positions, or break his army. A command
                 that has lost its ground and better than half its strength quits the
                 field — battles are not fought to the last man.</p>

              <h3>Controls</h3>
              <ul>
                <li><strong>Select:</strong> Click a single unit, or drag a box over multiple units.</li>
                <li><strong>Move:</strong> Click and drag from your selected units to draw a movement path.</li>
                <li><strong>Rally:</strong> Broken units will not take orders. Get your commander near them.</li>
              </ul>

              <h3>Seeing the Field</h3>
              <ul>
                <li><strong>You fight half-blind.</strong> Woods, buildings and ridges cast real
                    blind spots. Whole corps went missing in the Wilderness.</li>
                <li><strong>Cavalry are your eyes</strong> — they see more than twice as far as
                    infantry. Screen with them or you will be surprised.</li>
                <li><strong>Get on the high ground.</strong> A crest is worth more for what it
                    lets you see than for what it lets you shoot.</li>
                <li><strong>Last-seen markers</strong> show where scouts last reported the enemy.
                    They fade — and the enemy moves.</li>
              </ul>

              <h3>Fire &amp; Morale</h3>
              <ul>
                <li><strong>Volleys, not streams.</strong> A line fires in ordered volleys.
                    Firepower scales with the number of muskets you have in line.</li>
                <li><strong>Stand to fire.</strong> Troops cannot fire while marching, and men
                    crossing open ground can neither lie down nor use cover.</li>
                <li><strong>Enfilade wins fights.</strong> Fire into a flank or rear rakes the
                    whole line and breaks nerve faster than it kills.</li>
                <li><strong>Cartridge boxes hold 40 rounds.</strong> A unit shot dry must fall
                    back on a friendly flag to resupply.</li>
                <li><strong>Powder smoke blinds both sides</strong> and thickens where the
                    fighting is hottest.</li>
                <li><strong>Units break, they do not die.</strong> Around a third of losses is
                    enough. Broken units run for the rear and can be rallied.</li>
              </ul>

              <h3>Troop Types</h3>
              <ul>
                <li><strong>Infantry (⚔):</strong> The backbone. Deadly inside 200 yards,
                    nearly harmless past 350.</li>
                <li><strong>Cavalry (♞):</strong> Scouts and screens. Devastating against broken
                    men and unsupported guns; slaughtered if they ride at a formed line.</li>
                <li><strong>Artillery (☉):</strong> Reaches over a thousand yards, but must
                    unlimber to fire. At canister range it will stop an assault dead —
                    and it is helpless if infantry reach the guns.</li>
                <li><strong>Commander (⭐):</strong> Steadies the troops around him, rallies
                    broken ones, and sees furthest. If he falls, the line shakes.</li>
              </ul>

              <h3>Ground</h3>
              <ul>
                <li>Roads move troops 40% faster — and catch them in column.</li>
                <li>Woods hide you and shelter you, but you cannot see or shoot from them.</li>
                <li>Stone walls, sunken lanes and earthworks are the strongest ground on
                    the field. Attack them frontally at your peril.</li>
                <li>The river is impassable. Take the bridges.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Victory overlay */}
      {victory > 0 && (
        <div className="victory-overlay">
          <div className="victory-box">
            <h2>{victory === 1 ? 'UNION VICTORY!' : 'CONFEDERATE VICTORY!'}</h2>
            <p>{victory === 1
              ? 'The Confederate army has quit the field. The Union holds the ground.'
              : 'The Federal army has withdrawn. The Confederacy holds the field.'}</p>
            <button className="restart-btn" onClick={restart}>Fight Again</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default App;
