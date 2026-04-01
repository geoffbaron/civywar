#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  Terrain Generator — pulls real geographic data from OpenStreetMap
//  and converts it to game-ready GeoJSON terrain features.
//
//  Usage:
//    node scripts/generate-terrain.js antietam
//    node scripts/generate-terrain.js gettysburg
//    node scripts/generate-terrain.js all
//    node scripts/generate-terrain.js --bounds=39.45,-77.77,39.49,-77.71 --name=custom
//
//  Output: src/game/terrain/<name>.js
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import osmtogeojson from 'osmtogeojson';
import buffer from '@turf/buffer';
import simplify from '@turf/simplify';
import { lineString, polygon, featureCollection, feature } from '@turf/helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, 'cache');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'game', 'terrain');

// ─── Battlefield definitions (bounds only, for the script) ───
const BATTLEFIELDS = {
  antietam: {
    bounds: [39.4550, -77.7700, 39.4850, -77.7050],
    name: 'ANTIETAM_TERRAIN',
  },
  gettysburg: {
    bounds: [39.7950, -77.2600, 39.8250, -77.2100],
    name: 'GETTYSBURG_TERRAIN',
  },
  chancellorsville: {
    bounds: [38.2900, -77.6700, 38.3250, -77.6000],
    name: 'CHANCELLORSVILLE_TERRAIN',
  },
  shiloh: {
    bounds: [35.1250, -88.3700, 35.1650, -88.3050],
    name: 'SHILOH_TERRAIN',
  },
};

// ─── OSM tag → game terrain type mapping ───
// Priority order: higher priority features should override lower ones
// when a point falls inside multiple polygons
const TAG_MAP = [
  // Bridges (highest priority — override water)
  { match: (tags) => tags.bridge === 'yes' && tags.highway, type: 'bridge', priority: 100 },
  { match: (tags) => tags.man_made === 'bridge', type: 'bridge', priority: 100 },

  // Buildings
  { match: (tags) => tags.building, type: 'building', priority: 90 },

  // Walls and fences
  { match: (tags) => tags.barrier === 'wall' || tags.barrier === 'stone_wall' || tags.barrier === 'retaining_wall', type: 'fence_stone', priority: 85 },
  { match: (tags) => tags.barrier === 'fence' || tags.barrier === 'hedge' || tags.barrier === 'city_wall', type: 'fence_wood', priority: 84 },

  // Roads
  { match: (tags) => ['motorway','trunk','primary','secondary','tertiary'].includes(tags.highway), type: 'road', priority: 70, bufferMeters: 8 },
  { match: (tags) => ['residential','unclassified','service'].includes(tags.highway), type: 'road', priority: 69, bufferMeters: 5 },
  { match: (tags) => ['track','path'].includes(tags.highway), type: 'road', priority: 68, bufferMeters: 3 },

  // Farmland
  { match: (tags) => tags.landuse === 'farmland' || tags.landuse === 'farmyard', type: 'wheat', priority: 40 },
  { match: (tags) => tags.landuse === 'orchard' || tags.landuse === 'vineyard', type: 'orchard', priority: 41 },

  // Forests
  { match: (tags) => tags.natural === 'wood' || tags.landuse === 'forest', type: 'forest', priority: 30 },

  // Wetland / marsh
  { match: (tags) => tags.natural === 'wetland' || tags.wetland, type: 'marsh', priority: 25 },

  // Waterways
  { match: (tags) => tags.waterway === 'river' || tags.waterway === 'canal', type: 'river', priority: 20, bufferMeters: 18 },
  { match: (tags) => tags.waterway === 'stream' || tags.waterway === 'creek' || tags.waterway === 'ditch', type: 'creek', priority: 19, bufferMeters: 8 },
  { match: (tags) => tags.natural === 'water' || tags.water, type: 'river', priority: 18 },
];

// ─── Overpass Query ───
function buildQuery(bounds) {
  const [south, west, north, east] = bounds;
  const bbox = `${south},${west},${north},${east}`;
  return `
[out:json][timeout:60];
(
  // Waterways
  way["waterway"](${bbox});
  relation["waterway"](${bbox});

  // Water bodies
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});

  // Roads
  way["highway"](${bbox});

  // Forests/woods
  way["natural"="wood"](${bbox});
  way["landuse"="forest"](${bbox});
  relation["natural"="wood"](${bbox});
  relation["landuse"="forest"](${bbox});

  // Farmland
  way["landuse"="farmland"](${bbox});
  way["landuse"="orchard"](${bbox});
  way["landuse"="vineyard"](${bbox});

  // Buildings
  way["building"](${bbox});

  // Barriers
  way["barrier"](${bbox});

  // Bridges
  way["bridge"="yes"](${bbox});
  way["man_made"="bridge"](${bbox});

  // Wetland
  way["natural"="wetland"](${bbox});
  relation["natural"="wetland"](${bbox});
);
out body;
>;
out skel qt;
`.trim();
}

async function fetchOverpass(query, cacheKey) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);

  // Check cache
  if (fs.existsSync(cachePath)) {
    console.log(`  Using cached OSM data: ${cachePath}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }

  console.log('  Fetching from Overpass API...');
  const url = 'https://overpass-api.de/api/interpreter';
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (resp.status === 429) {
    console.log('  Rate limited — waiting 30s and retrying...');
    await new Promise(r => setTimeout(r, 30000));
    return fetchOverpass(query, cacheKey);
  }

  if (!resp.ok) {
    throw new Error(`Overpass API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  console.log(`  Got ${data.elements?.length || 0} OSM elements`);

  // Cache
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(data));

  return data;
}

// ─── Convert OSM data to game terrain features ───
function convertToTerrain(osmData, bounds) {
  // Convert OSM JSON to GeoJSON using osmtogeojson
  const geojson = osmtogeojson(osmData);
  console.log(`  Converted to ${geojson.features.length} GeoJSON features`);

  const terrainFeatures = [];
  const [south, west, north, east] = bounds;

  for (const feat of geojson.features) {
    const tags = feat.properties || {};
    // osmtogeojson puts tags at top level of properties
    // Also check for tags nested under 'tags'
    const allTags = { ...tags, ...(tags.tags || {}) };

    // Find matching terrain type
    let matched = null;
    for (const rule of TAG_MAP) {
      if (rule.match(allTags)) {
        matched = rule;
        break;
      }
    }
    if (!matched) continue;

    let geometry = feat.geometry;

    // Buffer linear features into polygons
    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
      if (matched.bufferMeters) {
        try {
          const buffered = buffer(feat, matched.bufferMeters, { units: 'meters' });
          if (buffered) {
            geometry = buffered.geometry;
          } else {
            continue;
          }
        } catch (e) {
          continue; // Skip features that fail to buffer
        }
      } else {
        // Linear feature with no buffer defined — buffer with small default
        try {
          const buffered = buffer(feat, 3, { units: 'meters' });
          if (buffered) geometry = buffered.geometry;
          else continue;
        } catch (e) {
          continue;
        }
      }
    }

    // Skip Point/MultiPoint features
    if (geometry.type === 'Point' || geometry.type === 'MultiPoint') continue;

    // Filter tiny buildings (modern houses, sheds) — keep only significant structures
    if (matched.type === 'building') {
      const area = approxArea(geometry);
      if (area < 0.0000001) continue; // ~100 sq meters at this latitude
    }

    // Skip minor roads (footways, cycleways, steps, service roads to houses)
    if (allTags.highway === 'footway' || allTags.highway === 'cycleway' ||
        allTags.highway === 'steps' || allTags.highway === 'pedestrian') continue;

    // Simplify complex polygons
    try {
      const simplified = simplify(
        feature(geometry),
        { tolerance: 0.00005, highQuality: true }
      );
      geometry = simplified.geometry;
    } catch (e) {
      // Keep original if simplification fails
    }

    // Build label
    const label = allTags.name ||
      allTags['name:en'] ||
      `${matched.type.replace('_', ' ')} (${getQuadrant(feat, bounds)})`;

    terrainFeatures.push({
      type: 'Feature',
      properties: {
        type: matched.type,
        label,
        priority: matched.priority,
        osmId: allTags.id || feat.id || null,
      },
      geometry,
    });
  }

  // Sort by priority (highest first = checked first in getTerrainAt)
  terrainFeatures.sort((a, b) => (b.properties.priority || 0) - (a.properties.priority || 0));

  // Remove priority from output (it was only for sorting)
  for (const f of terrainFeatures) {
    delete f.properties.priority;
    delete f.properties.osmId;
  }

  console.log(`  Generated ${terrainFeatures.length} terrain features`);

  // Log breakdown
  const counts = {};
  for (const f of terrainFeatures) {
    counts[f.properties.type] = (counts[f.properties.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  return featureCollection(terrainFeatures);
}

// ─── Helpers ───
function getQuadrant(feat, bounds) {
  const [south, west, north, east] = bounds;
  const midLat = (south + north) / 2;
  const midLng = (west + east) / 2;

  // Get centroid of feature
  let lat = midLat, lng = midLng;
  try {
    const coords = getAllCoords(feat.geometry);
    if (coords.length > 0) {
      lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    }
  } catch (e) {}

  const ns = lat > midLat ? 'N' : 'S';
  const ew = lng > midLng ? 'E' : 'W';
  return `${ns}${ew}`;
}

function approxArea(geometry) {
  const coords = geometry.type === 'Polygon' ? geometry.coordinates[0]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates[0]?.[0]
    : null;
  if (!coords || coords.length < 3) return 0;
  // Shoelace formula in degree-space (rough but fine for filtering)
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
  }
  return Math.abs(area) / 2;
}

function getAllCoords(geometry) {
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'Polygon') return geometry.coordinates[0];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0]?.[0] || [];
  if (geometry.type === 'MultiLineString') return geometry.coordinates[0] || [];
  return [];
}

// ─── Output writer ───
function writeTerrainFile(name, exportName, geojson, bounds) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${name}.js`);

  const content = `// ═══════════════════════════════════════════════════════════════
//  Auto-generated terrain from OpenStreetMap data
//  Generated: ${new Date().toISOString()}
//  Bounds: [${bounds.join(', ')}]
//  Features: ${geojson.features.length}
//
//  To regenerate: node scripts/generate-terrain.js ${name}
//  To refresh from API: delete scripts/cache/${name}.json first
// ═══════════════════════════════════════════════════════════════

export const ${exportName} = ${JSON.stringify(geojson, null, 2)};
`;

  fs.writeFileSync(outPath, content);
  console.log(`  Written to: ${outPath}`);
}

// ─── Main ───
async function generateBattlefield(key, config) {
  console.log(`\n=== Generating terrain: ${key} ===`);
  console.log(`  Bounds: ${config.bounds.join(', ')}`);

  const query = buildQuery(config.bounds);
  const osmData = await fetchOverpass(query, key);
  const terrain = convertToTerrain(osmData, config.bounds);
  writeTerrainFile(key, config.name, terrain, config.bounds);

  console.log(`  Done!`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/generate-terrain.js <battlefield>');
    console.log('  node scripts/generate-terrain.js all');
    console.log('  node scripts/generate-terrain.js --bounds=S,W,N,E --name=custom');
    console.log('\nAvailable battlefields:', Object.keys(BATTLEFIELDS).join(', '));
    process.exit(0);
  }

  // Custom bounds mode
  const boundsArg = args.find(a => a.startsWith('--bounds='));
  const nameArg = args.find(a => a.startsWith('--name='));
  if (boundsArg) {
    const bounds = boundsArg.replace('--bounds=', '').split(',').map(Number);
    if (bounds.length !== 4 || bounds.some(isNaN)) {
      console.error('Invalid bounds. Format: --bounds=south,west,north,east');
      process.exit(1);
    }
    const name = nameArg ? nameArg.replace('--name=', '') : 'custom';
    const exportName = name.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_TERRAIN';
    await generateBattlefield(name, { bounds, name: exportName });
    return;
  }

  // Named battlefield(s)
  if (args[0] === 'all') {
    for (const [key, config] of Object.entries(BATTLEFIELDS)) {
      await generateBattlefield(key, config);
    }
  } else {
    const key = args[0].toLowerCase();
    if (!BATTLEFIELDS[key]) {
      console.error(`Unknown battlefield: ${key}`);
      console.error('Available:', Object.keys(BATTLEFIELDS).join(', '));
      process.exit(1);
    }
    await generateBattlefield(key, BATTLEFIELDS[key]);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
