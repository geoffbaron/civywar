// ═══════════════════════════════════════════════════════════════
//  Real Civil War Battlefield Definitions
//  Each battlefield maps to real lat/lng coordinates and defines
//  fort positions + starting units in geographic space.
//  Leaflet renders the real terrain; game overlays on top.
// ═══════════════════════════════════════════════════════════════

import { ANTIETAM_TERRAIN } from './terrain/antietam.js';
import { GETTYSBURG_TERRAIN } from './terrain/gettysburg.js';
import { CHANCELLORSVILLE_TERRAIN } from './terrain/chancellorsville.js';

export const BATTLEFIELDS = {
  antietam: {
    name: 'Battle of Antietam',
    date: 'September 17, 1862',
    description: 'The bloodiest single day in American history. McClellan vs Lee near Sharpsburg, MD.',
    bounds: [[39.4500, -77.7800], [39.4910, -77.6950]],
    center: [39.4700, -77.7380],
    zoom: 14,
    geoTerrain: ANTIETAM_TERRAIN,

    forts: [
      { id: 'u1', lat: 39.4830, lng: -77.7190, owner: 1, garrison: 30, rate: 2.0, label: 'I Corps (Hooker)' },
      { id: 'u2', lat: 39.4740, lng: -77.7180, owner: 1, garrison: 40, rate: 2.5, label: 'II Corps (Sumner)' },
      { id: 'u3', lat: 39.4580, lng: -77.7170, owner: 1, garrison: 30, rate: 2.0, label: 'IX Corps (Burnside)' },
      { id: 'c1', lat: 39.4810, lng: -77.7650, owner: 2, garrison: 25, rate: 1.8, label: 'Jackson' },
      { id: 'c2', lat: 39.4700, lng: -77.7660, owner: 2, garrison: 35, rate: 2.2, label: 'Lee HQ' },
      { id: 'c3', lat: 39.4560, lng: -77.7670, owner: 2, garrison: 25, rate: 1.8, label: 'Toombs' },
    ],

    // Historical: Union ~87k vs Confederate ~38k (2.3:1)
    // Represented as Union ~530 troops vs Confederate ~310 (CSA on strong defense)
    units: [
      // UNION — 7 infantry brigades, east of Antietam Creek
      { owner: 1, lat: 39.4840, lng: -77.7310, count: 70, unitType: 'infantry' }, // Hooker advance
      { owner: 1, lat: 39.4815, lng: -77.7280, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 39.4790, lng: -77.7260, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 39.4758, lng: -77.7240, count: 70, unitType: 'infantry' }, // Sumner center
      { owner: 1, lat: 39.4730, lng: -77.7225, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 39.4620, lng: -77.7220, count: 60, unitType: 'infantry' }, // Burnside south
      { owner: 1, lat: 39.4580, lng: -77.7210, count: 55, unitType: 'infantry' },
      // Cavalry — on far flanks
      { owner: 1, lat: 39.4845, lng: -77.7220, count: 40, unitType: 'cavalry' },
      { owner: 1, lat: 39.4565, lng: -77.7195, count: 40, unitType: 'cavalry' },
      // Artillery — well behind the infantry line
      { owner: 1, lat: 39.4810, lng: -77.7200, count: 28, unitType: 'cannon' },
      { owner: 1, lat: 39.4740, lng: -77.7190, count: 28, unitType: 'cannon' },
      { owner: 1, lat: 39.4640, lng: -77.7195, count: 24, unitType: 'cannon' },
      // Commander — far rear
      { owner: 1, lat: 39.4770, lng: -77.7180, count: 10, unitType: 'commander' },

      // CONFEDERATE — west of creek, around Sharpsburg
      { owner: 2, lat: 39.4830, lng: -77.7540, count: 55, unitType: 'infantry' }, // Jackson north
      { owner: 2, lat: 39.4805, lng: -77.7520, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 39.4762, lng: -77.7500, count: 60, unitType: 'infantry' }, // Sunken Road
      { owner: 2, lat: 39.4738, lng: -77.7490, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 39.4625, lng: -77.7510, count: 45, unitType: 'infantry' }, // Toombs bridge
      { owner: 2, lat: 39.4590, lng: -77.7540, count: 40, unitType: 'infantry' },
      // Cavalry
      { owner: 2, lat: 39.4840, lng: -77.7610, count: 28, unitType: 'cavalry' },
      { owner: 2, lat: 39.4570, lng: -77.7620, count: 28, unitType: 'cavalry' },
      // Artillery — behind the line
      { owner: 2, lat: 39.4820, lng: -77.7600, count: 20, unitType: 'cannon' },
      { owner: 2, lat: 39.4745, lng: -77.7580, count: 22, unitType: 'cannon' },
      // Commander
      { owner: 2, lat: 39.4715, lng: -77.7590, count: 10, unitType: 'commander' },
    ],
  },

  gettysburg: {
    name: 'Battle of Gettysburg',
    date: 'July 1-3, 1863',
    description: 'The turning point of the war. Meade defends Cemetery Ridge against Lee.',
    bounds: [[39.7880, -77.2700], [39.8320, -77.1980]],
    center: [39.8100, -77.2340],
    zoom: 14,
    geoTerrain: GETTYSBURG_TERRAIN,

    forts: [
      { id: 'u1', lat: 39.8200, lng: -77.2140, owner: 1, garrison: 35, rate: 2.5, label: 'I Corps (Reynolds)' },
      { id: 'u2', lat: 39.8080, lng: -77.2130, owner: 1, garrison: 45, rate: 3.0, label: 'II Corps (Hancock)' },
      { id: 'u3', lat: 39.7950, lng: -77.2140, owner: 1, garrison: 35, rate: 2.5, label: 'V Corps (Sykes)' },
      { id: 'c1', lat: 39.8200, lng: -77.2560, owner: 2, garrison: 30, rate: 2.0, label: 'Ewell' },
      { id: 'c2', lat: 39.8080, lng: -77.2560, owner: 2, garrison: 40, rate: 2.5, label: 'Lee HQ' },
      { id: 'c3', lat: 39.7950, lng: -77.2570, owner: 2, garrison: 30, rate: 2.0, label: 'Longstreet' },
    ],

    // Historical: Union ~94k vs Confederate ~71k (1.32:1)
    units: [
      // Union — Cemetery Ridge defensive line, east side
      { owner: 1, lat: 39.8185, lng: -77.2240, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 39.8145, lng: -77.2210, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 39.8105, lng: -77.2190, count: 70, unitType: 'infantry' },
      { owner: 1, lat: 39.8055, lng: -77.2175, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 39.8005, lng: -77.2190, count: 60, unitType: 'infantry' },
      { owner: 1, lat: 39.8215, lng: -77.2180, count: 38, unitType: 'cavalry' },
      { owner: 1, lat: 39.7965, lng: -77.2160, count: 38, unitType: 'cavalry' },
      { owner: 1, lat: 39.8125, lng: -77.2155, count: 28, unitType: 'cannon' },
      { owner: 1, lat: 39.8025, lng: -77.2160, count: 28, unitType: 'cannon' },
      { owner: 1, lat: 39.8085, lng: -77.2140, count: 10, unitType: 'commander' },
      // Confederate — Seminary Ridge, west side
      { owner: 2, lat: 39.8185, lng: -77.2480, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 39.8135, lng: -77.2470, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 39.8085, lng: -77.2480, count: 65, unitType: 'infantry' },
      { owner: 2, lat: 39.8035, lng: -77.2490, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 39.7985, lng: -77.2500, count: 50, unitType: 'infantry' },
      { owner: 2, lat: 39.8215, lng: -77.2530, count: 30, unitType: 'cavalry' },
      { owner: 2, lat: 39.7965, lng: -77.2540, count: 30, unitType: 'cavalry' },
      { owner: 2, lat: 39.8105, lng: -77.2520, count: 22, unitType: 'cannon' },
      { owner: 2, lat: 39.8005, lng: -77.2530, count: 22, unitType: 'cannon' },
      { owner: 2, lat: 39.8085, lng: -77.2540, count: 10, unitType: 'commander' },
    ],
  },

  chancellorsville: {
    name: 'Battle of Chancellorsville',
    date: 'April 30 – May 6, 1863',
    description: "Lee's masterpiece. Jackson's legendary flank march through the Wilderness.",
    bounds: [[38.2860, -77.6770], [38.3300, -77.5930]],
    center: [38.3080, -77.6350],
    zoom: 14,
    geoTerrain: CHANCELLORSVILLE_TERRAIN,

    forts: [
      { id: 'u1', lat: 38.3170, lng: -77.6580, owner: 1, garrison: 40, rate: 2.5, label: 'Hooker HQ' },
      { id: 'u2', lat: 38.3120, lng: -77.6500, owner: 1, garrison: 35, rate: 2.0, label: 'Slocum' },
      { id: 'u3', lat: 38.3020, lng: -77.6450, owner: 1, garrison: 35, rate: 2.0, label: 'Sedgwick' },
      { id: 'c1', lat: 38.3130, lng: -77.6120, owner: 2, garrison: 30, rate: 2.0, label: 'Jackson' },
      { id: 'c2', lat: 38.3030, lng: -77.6180, owner: 2, garrison: 35, rate: 2.2, label: 'Lee HQ' },
      { id: 'c3', lat: 38.2960, lng: -77.6250, owner: 2, garrison: 25, rate: 1.8, label: 'Anderson' },
    ],

    // Historical: Union ~133k vs Confederate ~60k (2.2:1) but Lee/Jackson outmaneuvered them
    // Union has numerical advantage; CSA has quality/initiative edge (reflected by terrain)
    units: [
      // Union — Chancellorsville crossroads, west side
      { owner: 1, lat: 38.3180, lng: -77.6500, count: 70, unitType: 'infantry' },
      { owner: 1, lat: 38.3155, lng: -77.6470, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 38.3130, lng: -77.6420, count: 65, unitType: 'infantry' },
      { owner: 1, lat: 38.3100, lng: -77.6380, count: 60, unitType: 'infantry' },
      { owner: 1, lat: 38.3040, lng: -77.6370, count: 60, unitType: 'infantry' },
      { owner: 1, lat: 38.3195, lng: -77.6570, count: 55, unitType: 'infantry' }, // Sickles flank
      { owner: 1, lat: 38.3200, lng: -77.6610, count: 50, unitType: 'infantry' }, // Howard's XI Corps
      { owner: 1, lat: 38.3190, lng: -77.6560, count: 35, unitType: 'cavalry' },
      { owner: 1, lat: 38.3010, lng: -77.6340, count: 35, unitType: 'cavalry' },
      { owner: 1, lat: 38.3145, lng: -77.6450, count: 28, unitType: 'cannon' },
      { owner: 1, lat: 38.3060, lng: -77.6360, count: 25, unitType: 'cannon' },
      { owner: 1, lat: 38.3110, lng: -77.6410, count: 10, unitType: 'commander' },
      // Confederate — far fewer, east side
      { owner: 2, lat: 38.3140, lng: -77.6150, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 38.3110, lng: -77.6170, count: 55, unitType: 'infantry' },
      { owner: 2, lat: 38.3070, lng: -77.6220, count: 60, unitType: 'infantry' }, // Jackson flanking
      { owner: 2, lat: 38.3030, lng: -77.6260, count: 50, unitType: 'infantry' },
      { owner: 2, lat: 38.2970, lng: -77.6290, count: 45, unitType: 'infantry' },
      { owner: 2, lat: 38.3155, lng: -77.6100, count: 32, unitType: 'cavalry' }, // Stuart's cavalry
      { owner: 2, lat: 38.2955, lng: -77.6310, count: 28, unitType: 'cavalry' },
      { owner: 2, lat: 38.3090, lng: -77.6130, count: 22, unitType: 'cannon' },
      { owner: 2, lat: 38.3000, lng: -77.6240, count: 20, unitType: 'cannon' },
      { owner: 2, lat: 38.3050, lng: -77.6220, count: 10, unitType: 'commander' },
    ],
  },
};

// Tile layer options — user can switch between these
export const TILE_LAYERS = {
  // OpenTopoMap — free, no key, shows terrain contours
  topo: {
    name: 'Terrain',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
    maxZoom: 17,
  },
  // Standard OSM — free, no key
  osm: {
    name: 'Street Map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  },
  // Stamen Watercolor via Stadia — needs free API key
  // Sign up at https://stadiamaps.com/ for a free key
  watercolor: {
    name: 'Watercolor',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap',
    maxZoom: 16,
    needsKey: true,
  },
  // ESRI World Imagery — satellite
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    maxZoom: 18,
  },
};
