// ═══════════════════════════════════════════════════════════════
//  CIVY WAR — Parchment Watercolor Terrain Renderer
//  Uses Perlin-style noise for organic, painted battlefield maps
//  inspired by Civil War era military cartography.
// ═══════════════════════════════════════════════════════════════

import { FEATURES, MAP_LABELS, MAP_WIDTH, MAP_HEIGHT, TERRAIN } from './MapData.js';

// ─── Terrain grid for fast gameplay lookups ───
let terrainGrid = null;
const GRID_SCALE = 4;

export function getTerrainTypeAt(x, y) {
  if (!terrainGrid) buildTerrainGrid();
  const gx = Math.floor(x / GRID_SCALE);
  const gy = Math.floor(y / GRID_SCALE);
  const gw = Math.ceil(MAP_WIDTH / GRID_SCALE);
  const gh = Math.ceil(MAP_HEIGHT / GRID_SCALE);
  if (gx < 0 || gx >= gw || gy < 0 || gy >= gh) return 'grass';
  return terrainGrid[gy * gw + gx] || 'grass';
}

function buildTerrainGrid() {
  const gw = Math.ceil(MAP_WIDTH / GRID_SCALE);
  const gh = Math.ceil(MAP_HEIGHT / GRID_SCALE);
  terrainGrid = new Array(gw * gh).fill('grass');
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const px = gx * GRID_SCALE + GRID_SCALE / 2;
      const py = gy * GRID_SCALE + GRID_SCALE / 2;
      for (const f of FEATURES) {
        if (hitTestFeature(px, py, f)) {
          terrainGrid[gy * gw + gx] = f.type;
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  PERLIN-STYLE VALUE NOISE — organic terrain variation
// ═══════════════════════════════════════════════════════════════

// Hash function for 2D coordinates
const PERM = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with seed
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }

function grad2D(hash, x, y) {
  const h = hash & 3;
  return (h === 0 ? x + y : h === 1 ? -x + y : h === 2 ? x - y : -x - y);
}

function noise2D(x, y) {
  const ix = Math.floor(x) & 255, iy = Math.floor(y) & 255;
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  const u = fade(fx), v = fade(fy);
  const a = PERM[ix] + iy, b = PERM[ix + 1] + iy;
  return lerp(
    lerp(grad2D(PERM[a], fx, fy), grad2D(PERM[b], fx - 1, fy), u),
    lerp(grad2D(PERM[a + 1], fx, fy - 1), grad2D(PERM[b + 1], fx - 1, fy - 1), u),
    v
  );
}

// Fractal Brownian Motion — multi-scale organic noise
function fbm(x, y, octaves = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

// Turbulence — absolute value noise for more dramatic variation
function turbulence(x, y, octaves = 4) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * Math.abs(noise2D(x * freq, y * freq));
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

// ═══════════════════════════════════════════════════════════════
//  HIT TESTING — geometry queries for terrain grid
// ═══════════════════════════════════════════════════════════════

function hitTestFeature(x, y, f) {
  if (f.shape === 'polygon') return pointInPolygon(x, y, f.points);
  if (f.shape === 'rect') return pointInRect(x, y, f);
  if (f.shape === 'polyline') return pointNearPolyline(x, y, f.points, (f.width || 10) / 2);
  if (f.shape === 'bezier') return pointNearBezier(x, y, f);
  return false;
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function pointNearPolyline(x, y, pts, halfW) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < halfW) return true;
  }
  return false;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pointNearBezier(x, y, f) {
  const halfW = (f.width || 20) / 2;
  for (const c of f.curves) {
    for (let t = 0; t <= 1; t += 0.04) {
      const mt = 1 - t;
      const bx = mt * mt * mt * c[0] + 3 * mt * mt * t * c[2] + 3 * mt * t * t * c[4] + t * t * t * c[6];
      const by = mt * mt * mt * c[1] + 3 * mt * mt * t * c[3] + 3 * mt * t * t * c[5] + t * t * t * c[7];
      if (Math.hypot(x - bx, y - by) < halfW) return true;
    }
  }
  return false;
}

// Distance to polygon edge (for soft falloff rendering)
function distToPolygonEdge(x, y, pts) {
  let minD = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const d = distToSeg(x, y, pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
    if (d < minD) minD = d;
  }
  return minD;
}

// Distance to bezier path
function distToBezierPath(x, y, curves) {
  let minD = Infinity;
  for (const c of curves) {
    for (let t = 0; t <= 1; t += 0.03) {
      const mt = 1 - t;
      const bx = mt * mt * mt * c[0] + 3 * mt * mt * t * c[2] + 3 * mt * t * t * c[4] + t * t * t * c[6];
      const by = mt * mt * mt * c[1] + 3 * mt * mt * t * c[3] + 3 * mt * t * t * c[5] + t * t * t * c[7];
      const d = Math.hypot(x - bx, y - by);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

// Distance to polyline
function distToPolylinePath(x, y, pts) {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < minD) minD = d;
  }
  return minD;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN RENDERING — Pixel-by-pixel watercolor painting
// ═══════════════════════════════════════════════════════════════

export function renderTerrainCanvas(downscale = 1) {
  buildTerrainGrid();

  const w = Math.ceil(MAP_WIDTH / downscale);
  const h = Math.ceil(MAP_HEIGHT / downscale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // ── Phase 1: Pixel-level terrain painting ──
  const imgData = ctx.createImageData(w, h);
  const d = imgData.data;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px * downscale;
      const y = py * downscale;
      const i = (py * w + px) * 4;

      // Get base color from terrain painting
      const [r, g, b] = getPixelColor(x, y);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // ── Phase 2: Vector overlays (roads, fences, buildings, labels) ──
  ctx.scale(1 / downscale, 1 / downscale);

  drawRoads(ctx);
  drawSunkenRoads(ctx);
  drawFences(ctx);
  drawTrenches(ctx);
  drawBuildings(ctx);
  drawBridges(ctx);
  drawLabels(ctx);
  drawVignette(ctx);

  return canvas.toDataURL('image/png');
}

// ─── Core per-pixel color function ───
function getPixelColor(x, y) {
  // Normalized coordinates
  const nx = x / MAP_WIDTH, ny = y / MAP_HEIGHT;

  // === BASE PARCHMENT ===
  // Multi-octave noise for organic variation
  const n1 = fbm(x * 0.004, y * 0.004, 5);       // large-scale
  const n2 = fbm(x * 0.012 + 100, y * 0.012, 4);  // medium-scale detail
  const n3 = fbm(x * 0.035 + 200, y * 0.035, 3);  // fine texture
  const turb = turbulence(x * 0.008, y * 0.008, 4); // dramatic washes

  // Base parchment color — warm pink-tan like the reference maps
  let r = 195 + n1 * 30 + n2 * 12 + n3 * 6;
  let g = 175 + n1 * 25 + n2 * 10 + n3 * 5;
  let b = 150 + n1 * 18 + n2 * 8 + n3 * 4;

  // Warm wash variation — pinkish and greenish zones
  const warmWash = fbm(x * 0.002 + 50, y * 0.003, 3);
  r += warmWash * 15;
  g += warmWash * 5 - 3;
  b += warmWash * 2 - 5;

  // Subtle green-brown undertone for field areas
  const grassTone = fbm(x * 0.006 + 300, y * 0.006, 3);
  r -= grassTone * 8;
  g += grassTone * 6;
  b -= grassTone * 5;

  // === HILLS — subtle green-brown elevation washes ===
  for (const f of FEATURES) {
    if (f.type !== 'hill') continue;
    if (!pointInPolygon(x, y, f.points)) continue;
    const edgeDist = distToPolygonEdge(x, y, f.points);
    const falloff = Math.min(1, edgeDist / 60);
    const hillNoise = fbm(x * 0.008 + 400, y * 0.008, 3) * 0.3 + 0.7;
    const intensity = falloff * hillNoise * 0.35;
    r -= intensity * 25;
    g += intensity * 12;
    b -= intensity * 15;
    // Contour-like darkening at mid-distance
    const contour = Math.sin(edgeDist * 0.08) * 0.5 + 0.5;
    r -= contour * 5 * intensity;
    g -= contour * 3 * intensity;
  }

  // === WHEAT / CORN FIELDS — golden patches ===
  for (const f of FEATURES) {
    if (f.type !== 'wheat') continue;
    if (!pointInPolygon(x, y, f.points)) continue;
    const edgeDist = distToPolygonEdge(x, y, f.points);
    const falloff = Math.min(1, edgeDist / 30);
    const wheatNoise = fbm(x * 0.02 + 500, y * 0.02, 3);
    const intensity = falloff * 0.5;
    // Golden wheat color
    r += intensity * (25 + wheatNoise * 10);
    g += intensity * (15 + wheatNoise * 8);
    b -= intensity * (20 + wheatNoise * 5);
    // Vertical stripe texture (crop rows)
    const rows = Math.sin(x * 0.3 + wheatNoise * 10) * 0.5 + 0.5;
    r += rows * intensity * 5;
    g += rows * intensity * 3;
  }

  // === ORCHARDS — lighter green with regularity ===
  for (const f of FEATURES) {
    if (f.type !== 'orchard') continue;
    if (!pointInPolygon(x, y, f.points)) continue;
    const edgeDist = distToPolygonEdge(x, y, f.points);
    const falloff = Math.min(1, edgeDist / 25);
    const intensity = falloff * 0.4;
    r -= intensity * 30;
    g += intensity * 15;
    b -= intensity * 25;
    // Tree grid pattern
    const grid = (Math.sin(x * 0.3) * Math.sin(y * 0.3)) * 0.5 + 0.5;
    r -= grid * intensity * 20;
    g -= grid * intensity * 8;
    b -= grid * intensity * 12;
  }

  // === MARSH — murky green-brown ===
  for (const f of FEATURES) {
    if (f.type !== 'marsh') continue;
    if (!pointInPolygon(x, y, f.points)) continue;
    const edgeDist = distToPolygonEdge(x, y, f.points);
    const falloff = Math.min(1, edgeDist / 30);
    const marshNoise = fbm(x * 0.015 + 600, y * 0.015, 3);
    const intensity = falloff * 0.4;
    r -= intensity * 35;
    g += intensity * (5 + marshNoise * 10);
    b -= intensity * 15;
    // Wavy water lines
    const waves = Math.sin(x * 0.15 + marshNoise * 8) * 0.5 + 0.5;
    g += waves * intensity * 8;
    b += waves * intensity * 12;
  }

  // === FORESTS — the big one, rich dark canopy with organic edges ===
  for (const f of FEATURES) {
    if (f.type !== 'forest') continue;
    if (!pointInPolygon(x, y, f.points)) continue;

    const edgeDist = distToPolygonEdge(x, y, f.points);

    // Noise-modulated edge for organic tree line
    const edgeNoise = fbm(x * 0.03 + 700, y * 0.03, 4) * 18;
    const effectiveEdge = edgeDist - edgeNoise;

    if (effectiveEdge < -4) continue; // Outside the noisy edge

    // Smooth falloff from edge
    const falloff = Math.min(1, Math.max(0, effectiveEdge / 40));

    // Internal canopy variation — individual "tree" lumps
    const canopy1 = fbm(x * 0.06 + 800, y * 0.06, 4);
    const canopy2 = fbm(x * 0.12 + 900, y * 0.12, 3);
    const treeShape = canopy1 * 0.6 + canopy2 * 0.4;

    // Dark forest core color
    const forestIntensity = falloff * (0.55 + treeShape * 0.35);
    r = lerp(r, 45 + treeShape * 30, forestIntensity);
    g = lerp(g, 65 + treeShape * 35, forestIntensity);
    b = lerp(b, 30 + treeShape * 20, forestIntensity);

    // Darker at edges (shadow under canopy edge)
    if (effectiveEdge > 0 && effectiveEdge < 18) {
      const edgeDark = 1 - effectiveEdge / 18;
      r -= edgeDark * 15;
      g -= edgeDark * 10;
      b -= edgeDark * 8;
    }

    // Scattered light spots in canopy
    const lightSpot = fbm(x * 0.08 + 1000, y * 0.08, 2);
    if (lightSpot > 0.3 && falloff > 0.5) {
      r += (lightSpot - 0.3) * 20;
      g += (lightSpot - 0.3) * 25;
    }
  }

  // === WATER — creeks and rivers ===
  for (const f of FEATURES) {
    if (f.type !== 'creek' && f.type !== 'river') continue;
    if (f.shape !== 'bezier') continue;

    const halfW = (f.width || 20) / 2;
    const dist = distToBezierPath(x, y, f.curves);

    if (dist < halfW + 25) {
      // Bank shadow (dark edge near water)
      if (dist < halfW + 25 && dist > halfW) {
        const bankFade = 1 - (dist - halfW) / 25;
        r -= bankFade * 20;
        g -= bankFade * 10;
        b -= bankFade * 5;
      }

      // Water body
      if (dist < halfW) {
        const waterDepth = 1 - dist / halfW; // 1 at center, 0 at edge
        const waterNoise = fbm(x * 0.01 + 1100, y * 0.01, 3);

        // Teal-blue water color (matching reference maps)
        const wr = 75 + waterNoise * 15 - waterDepth * 15;
        const wg = 115 + waterNoise * 20 - waterDepth * 10;
        const wb = 130 + waterNoise * 15 + waterDepth * 10;

        const waterAlpha = 0.7 + waterDepth * 0.25;
        r = lerp(r, wr, waterAlpha);
        g = lerp(g, wg, waterAlpha);
        b = lerp(b, wb, waterAlpha);

        // Subtle flow lines
        const flow = Math.sin(x * 0.08 + y * 0.04 + waterNoise * 6) * 0.5 + 0.5;
        g += flow * 6 * waterDepth;
        b += flow * 4 * waterDepth;
      }
    }
  }

  // === Final paper texture grain ===
  const grain = (noise2D(x * 0.5, y * 0.5)) * 4;
  r += grain;
  g += grain;
  b += grain;

  return [clamp(r), clamp(g), clamp(b)];
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

// ═══════════════════════════════════════════════════════════════
//  VECTOR OVERLAYS — roads, fences, buildings, labels
// ═══════════════════════════════════════════════════════════════

function drawRoads(ctx) {
  for (const r of FEATURES.filter(f => f.type === 'road')) {
    ctx.save();
    // Thin dark line — like period maps
    ctx.beginPath();
    ctx.moveTo(r.points[0][0], r.points[0][1]);
    for (let i = 1; i < r.points.length; i++) ctx.lineTo(r.points[i][0], r.points[i][1]);
    ctx.strokeStyle = 'rgba(80, 65, 45, 0.55)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Even thinner center line
    ctx.beginPath();
    ctx.moveTo(r.points[0][0], r.points[0][1]);
    for (let i = 1; i < r.points.length; i++) ctx.lineTo(r.points[i][0], r.points[i][1]);
    ctx.strokeStyle = 'rgba(120, 100, 70, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawSunkenRoads(ctx) {
  for (const s of FEATURES.filter(f => f.type === 'sunken_road')) {
    const w = s.width || 12;
    ctx.save();
    // Double line for sunken road
    ctx.beginPath();
    ctx.moveTo(s.points[0][0], s.points[0][1]);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0], s.points[i][1]);
    ctx.strokeStyle = 'rgba(60, 50, 35, 0.5)';
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Inner lighter fill
    ctx.beginPath();
    ctx.moveTo(s.points[0][0], s.points[0][1]);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0], s.points[i][1]);
    ctx.strokeStyle = 'rgba(100, 85, 60, 0.35)';
    ctx.lineWidth = w - 4;
    ctx.stroke();

    // Hatch marks along edges
    ctx.strokeStyle = 'rgba(50, 40, 28, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < s.points.length - 1; i++) {
      const [x1, y1] = s.points[i], [x2, y2] = s.points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len === 0) continue;
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      for (let t = 0; t < 1; t += 6 / len) {
        const mx = x1 + (x2 - x1) * t, my = y1 + (y2 - y1) * t;
        ctx.beginPath();
        ctx.moveTo(mx + nx * (w / 2), my + ny * (w / 2));
        ctx.lineTo(mx + nx * (w / 2 + 5), my + ny * (w / 2 + 5));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mx - nx * (w / 2), my - ny * (w / 2));
        ctx.lineTo(mx - nx * (w / 2 + 5), my - ny * (w / 2 + 5));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawFences(ctx) {
  for (const f of FEATURES.filter(f => f.type === 'fence_stone' || f.type === 'fence_wood')) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(f.points[0][0], f.points[0][1]);
    for (let i = 1; i < f.points.length; i++) ctx.lineTo(f.points[i][0], f.points[i][1]);

    if (f.type === 'fence_stone') {
      ctx.strokeStyle = 'rgba(70, 65, 55, 0.65)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.setLineDash([]);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(90, 70, 45, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawTrenches(ctx) {
  for (const t of FEATURES.filter(f => f.type === 'trench')) {
    const w = t.width || 8;
    ctx.save();
    ctx.strokeStyle = 'rgba(55, 45, 30, 0.55)';
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Zigzag line
    ctx.beginPath();
    ctx.moveTo(t.points[0][0], t.points[0][1]);
    for (let i = 1; i < t.points.length; i++) {
      const [x1, y1] = t.points[i - 1], [x2, y2] = t.points[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len === 0) continue;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const nx = -(y2 - y1) / len * 5, ny = (x2 - x1) / len * 5;
      ctx.lineTo(mx + nx, my + ny);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // Earthwork piles
    ctx.fillStyle = 'rgba(80, 70, 50, 0.25)';
    for (let i = 0; i < t.points.length - 1; i++) {
      const [x1, y1] = t.points[i], [x2, y2] = t.points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len === 0) continue;
      const nx = -(y2 - y1) / len * (w + 3), ny = (x2 - x1) / len * (w + 3);
      for (let p = 0; p < 1; p += 8 / len) {
        const px = x1 + (x2 - x1) * p + nx, ppy = y1 + (y2 - y1) * p + ny;
        ctx.beginPath();
        ctx.arc(px, ppy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawBuildings(ctx) {
  for (const b of FEATURES.filter(f => f.type === 'building')) {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(30, 20, 10, 0.3)';
    ctx.fillRect(b.x + 1.5, b.y + 1.5, b.w, b.h);
    // Building
    ctx.fillStyle = 'rgba(65, 50, 35, 0.85)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Outline
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
}

function drawBridges(ctx) {
  for (const b of FEATURES.filter(f => f.type === 'bridge')) {
    ctx.save();
    // Bridge deck
    ctx.fillStyle = 'rgba(130, 110, 75, 0.9)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Stone edges
    ctx.strokeStyle = 'rgba(70, 60, 40, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Planks
    ctx.strokeStyle = 'rgba(90, 75, 50, 0.3)';
    ctx.lineWidth = 0.8;
    for (let x = b.x + 3; x < b.x + b.w; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, b.y);
      ctx.lineTo(x, b.y + b.h);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawLabels(ctx) {
  for (const label of MAP_LABELS) {
    ctx.save();
    ctx.translate(label.x, label.y);
    if (label.angle) ctx.rotate(label.angle * Math.PI / 180);

    const sz = label.size || 10;
    ctx.font = label.style === 'town'
      ? `bold small-caps ${sz}px Georgia, serif`
      : label.style === 'water'
        ? `italic ${sz}px Georgia, serif`
        : `${sz}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Halo / shadow
    ctx.fillStyle = 'rgba(200, 180, 150, 0.5)';
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx || dy) ctx.fillText(label.text, dx, dy);
      }
    }

    // Text
    ctx.fillStyle = label.style === 'water' ? 'rgba(35, 55, 85, 0.7)'
      : label.style === 'town' ? 'rgba(35, 25, 15, 0.8)'
      : label.style === 'road' ? 'rgba(60, 48, 30, 0.55)'
      : 'rgba(45, 35, 22, 0.65)';
    ctx.fillText(label.text, 0, 0);
    ctx.restore();
  }

  // Feature labels (buildings, bridges)
  for (const f of FEATURES) {
    if (!f.label || (f.type !== 'building' && f.type !== 'bridge')) continue;
    ctx.save();
    ctx.font = '8px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Halo
    ctx.fillStyle = 'rgba(200, 180, 150, 0.5)';
    const lx = f.x + f.w / 2, ly = f.y - 7;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx || dy) ctx.fillText(f.label, lx + dx, ly + dy);
      }
    }
    ctx.fillStyle = 'rgba(40, 30, 18, 0.7)';
    ctx.fillText(f.label, lx, ly);
    ctx.restore();
  }
}

function drawVignette(ctx) {
  const grad = ctx.createRadialGradient(
    MAP_WIDTH / 2, MAP_HEIGHT / 2, Math.min(MAP_WIDTH, MAP_HEIGHT) * 0.3,
    MAP_WIDTH / 2, MAP_HEIGHT / 2, Math.max(MAP_WIDTH, MAP_HEIGHT) * 0.72
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
}

function getBBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
  }
  return { minX, minY, maxX, maxY };
}
