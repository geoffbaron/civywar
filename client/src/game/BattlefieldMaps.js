// ═══════════════════════════════════════════════════════════════
//  Real Civil War Battlefield Definitions
//  Each battlefield maps to real lat/lng coordinates and defines
//  fort positions + starting units in geographic space.
//  Leaflet renders the real terrain; game overlays on top.
// ═══════════════════════════════════════════════════════════════

import { ANTIETAM_TERRAIN } from './terrain/antietam.js';
import { GETTYSBURG_TERRAIN } from './terrain/gettysburg.js';
import { CHANCELLORSVILLE_TERRAIN } from './terrain/chancellorsville.js';
import { SHILOH_TERRAIN } from './terrain/shiloh.js';

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
      { id: 'u1', lat: 39.4830, lng: -77.7020, owner: 1, garrison: 30, rate: 2.0, label: 'I Corps (Hooker)' },
      { id: 'u2', lat: 39.4740, lng: -77.7010, owner: 1, garrison: 40, rate: 2.5, label: 'II Corps (Sumner)' },
      { id: 'u3', lat: 39.4580, lng: -77.7020, owner: 1, garrison: 30, rate: 2.0, label: 'IX Corps (Burnside)' },
      { id: 'c1', lat: 39.4810, lng: -77.7750, owner: 2, garrison: 25, rate: 1.8, label: 'Jackson' },
      { id: 'c2', lat: 39.4700, lng: -77.7760, owner: 2, garrison: 35, rate: 2.2, label: 'Lee HQ' },
      { id: 'c3', lat: 39.4560, lng: -77.7750, owner: 2, garrison: 25, rate: 1.8, label: 'Toombs' },
    ],

    // Historical: Union ~87k vs Confederate ~38k (2.3:1)
    // Antietam was infantry-dominated. Cavalry played a minor role.
    // Union had overwhelming numbers but attacked piecemeal.
    // Confederate artillery was well-positioned on high ground.
    units: [
      // UNION — massive infantry, minimal cavalry, strong artillery
      { owner: 1, lat: 39.4840, lng: -77.7130, count: 75, unitType: 'infantry' }, // Hooker's I Corps
      { owner: 1, lat: 39.4815, lng: -77.7110, count: 70, unitType: 'infantry' }, // Mansfield XII Corps
      { owner: 1, lat: 39.4790, lng: -77.7090, count: 70, unitType: 'infantry' }, // Sumner II Corps
      { owner: 1, lat: 39.4758, lng: -77.7080, count: 65, unitType: 'infantry' }, // Richardson div
      { owner: 1, lat: 39.4730, lng: -77.7070, count: 65, unitType: 'infantry' }, // French div
      { owner: 1, lat: 39.4620, lng: -77.7070, count: 60, unitType: 'infantry' }, // Burnside IX Corps
      { owner: 1, lat: 39.4580, lng: -77.7060, count: 55, unitType: 'infantry' }, // Rodman div
      // Cavalry — very small presence at Antietam
      { owner: 1, lat: 39.4845, lng: -77.7060, count: 25, unitType: 'cavalry' }, // Pleasonton (screening)
      // Artillery — 3 batteries, well-supplied
      { owner: 1, lat: 39.4810, lng: -77.7040, count: 30, unitType: 'cannon' },
      { owner: 1, lat: 39.4740, lng: -77.7030, count: 30, unitType: 'cannon' },
      { owner: 1, lat: 39.4640, lng: -77.7040, count: 25, unitType: 'cannon' },
      // Commander
      { owner: 1, lat: 39.4770, lng: -77.7020, count: 10, unitType: 'commander' },

      // CONFEDERATE — outnumbered but dug in, excellent artillery placement
      { owner: 2, lat: 39.4830, lng: -77.7680, count: 55, unitType: 'infantry' }, // Jackson's wing
      { owner: 2, lat: 39.4805, lng: -77.7660, count: 50, unitType: 'infantry' }, // Hood
      { owner: 2, lat: 39.4762, lng: -77.7640, count: 55, unitType: 'infantry' }, // D.H. Hill (Sunken Road)
      { owner: 2, lat: 39.4738, lng: -77.7630, count: 50, unitType: 'infantry' }, // R.H. Anderson
      { owner: 2, lat: 39.4625, lng: -77.7650, count: 40, unitType: 'infantry' }, // Toombs (bridge defense)
      { owner: 2, lat: 39.4590, lng: -77.7670, count: 35, unitType: 'infantry' }, // A.P. Hill (reserve)
      // Cavalry — Stuart screening, small force
      { owner: 2, lat: 39.4840, lng: -77.7740, count: 20, unitType: 'cavalry' },
      // Artillery — well-placed on high ground
      { owner: 2, lat: 39.4820, lng: -77.7730, count: 22, unitType: 'cannon' }, // Nicodemus Heights
      { owner: 2, lat: 39.4745, lng: -77.7720, count: 20, unitType: 'cannon' },
      // Commander
      { owner: 2, lat: 39.4715, lng: -77.7740, count: 10, unitType: 'commander' },
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
      { id: 'u1', lat: 39.8200, lng: -77.2020, owner: 1, garrison: 35, rate: 2.5, label: 'I Corps (Reynolds)' },
      { id: 'u2', lat: 39.8080, lng: -77.2010, owner: 1, garrison: 45, rate: 3.0, label: 'II Corps (Hancock)' },
      { id: 'u3', lat: 39.7950, lng: -77.2020, owner: 1, garrison: 35, rate: 2.5, label: 'V Corps (Sykes)' },
      { id: 'c1', lat: 39.8200, lng: -77.2660, owner: 2, garrison: 30, rate: 2.0, label: 'Ewell' },
      { id: 'c2', lat: 39.8080, lng: -77.2660, owner: 2, garrison: 40, rate: 2.5, label: 'Lee HQ' },
      { id: 'c3', lat: 39.7950, lng: -77.2670, owner: 2, garrison: 30, rate: 2.0, label: 'Longstreet' },
    ],

    // Historical: Union ~94k vs Confederate ~71k (1.32:1)
    // Gettysburg was the most balanced fight. Both sides had large cavalry.
    // Biggest artillery concentration of the war (170+ CSA guns before Pickett's Charge).
    // Buford's cavalry was critical on Day 1. Stuart's cavalry arrived late.
    units: [
      // UNION — strong defensive line, large cavalry corps, massive artillery
      { owner: 1, lat: 39.8185, lng: -77.2100, count: 60, unitType: 'infantry' }, // I Corps (Cemetery Hill)
      { owner: 1, lat: 39.8145, lng: -77.2080, count: 65, unitType: 'infantry' }, // II Corps (Hancock)
      { owner: 1, lat: 39.8105, lng: -77.2060, count: 65, unitType: 'infantry' }, // III Corps (Sickles)
      { owner: 1, lat: 39.8055, lng: -77.2050, count: 60, unitType: 'infantry' }, // V Corps (Sykes)
      { owner: 1, lat: 39.8005, lng: -77.2060, count: 55, unitType: 'infantry' }, // VI Corps (Sedgwick)
      { owner: 1, lat: 39.7975, lng: -77.2075, count: 50, unitType: 'infantry' }, // XII Corps (Slocum)
      // Cavalry — Buford's division, prominent role
      { owner: 1, lat: 39.8215, lng: -77.2050, count: 40, unitType: 'cavalry' }, // Buford north
      { owner: 1, lat: 39.7965, lng: -77.2040, count: 35, unitType: 'cavalry' }, // Kilpatrick south
      // Artillery — huge concentration on Cemetery Ridge
      { owner: 1, lat: 39.8160, lng: -77.2030, count: 30, unitType: 'cannon' }, // Cemetery Hill guns
      { owner: 1, lat: 39.8085, lng: -77.2025, count: 32, unitType: 'cannon' }, // Hunt's reserve
      { owner: 1, lat: 39.7995, lng: -77.2035, count: 28, unitType: 'cannon' }, // Little Round Top
      // Commander
      { owner: 1, lat: 39.8085, lng: -77.2015, count: 10, unitType: 'commander' },

      // CONFEDERATE — nearly matched, aggressive, massive artillery
      { owner: 2, lat: 39.8195, lng: -77.2600, count: 55, unitType: 'infantry' }, // Ewell's Corps (north)
      { owner: 2, lat: 39.8155, lng: -77.2590, count: 55, unitType: 'infantry' }, // Early's division
      { owner: 2, lat: 39.8105, lng: -77.2600, count: 60, unitType: 'infantry' }, // A.P. Hill's Corps (center)
      { owner: 2, lat: 39.8055, lng: -77.2610, count: 60, unitType: 'infantry' }, // Heth/Pender
      { owner: 2, lat: 39.8005, lng: -77.2620, count: 55, unitType: 'infantry' }, // Longstreet's Corps
      { owner: 2, lat: 39.7965, lng: -77.2630, count: 50, unitType: 'infantry' }, // Hood/McLaws
      // Cavalry — Stuart's cavalry (arrived late Day 2)
      { owner: 2, lat: 39.8225, lng: -77.2650, count: 35, unitType: 'cavalry' }, // Stuart
      { owner: 2, lat: 39.7945, lng: -77.2660, count: 30, unitType: 'cavalry' }, // Hampton
      // Artillery — massive bombardment capability
      { owner: 2, lat: 39.8145, lng: -77.2640, count: 28, unitType: 'cannon' }, // Seminary Ridge batteries
      { owner: 2, lat: 39.8065, lng: -77.2645, count: 30, unitType: 'cannon' }, // Alexander's battalion
      { owner: 2, lat: 39.7985, lng: -77.2650, count: 25, unitType: 'cannon' }, // Longstreet's guns
      // Commander
      { owner: 2, lat: 39.8085, lng: -77.2660, count: 10, unitType: 'commander' },
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
      { id: 'u1', lat: 38.3170, lng: -77.6720, owner: 1, garrison: 40, rate: 2.5, label: 'Hooker HQ' },
      { id: 'u2', lat: 38.3120, lng: -77.6680, owner: 1, garrison: 35, rate: 2.0, label: 'Slocum' },
      { id: 'u3', lat: 38.3020, lng: -77.6650, owner: 1, garrison: 35, rate: 2.0, label: 'Sedgwick' },
      { id: 'c1', lat: 38.3130, lng: -77.5980, owner: 2, garrison: 30, rate: 2.0, label: 'Jackson' },
      { id: 'c2', lat: 38.3030, lng: -77.6010, owner: 2, garrison: 35, rate: 2.2, label: 'Lee HQ' },
      { id: 'c3', lat: 38.2960, lng: -77.6050, owner: 2, garrison: 25, rate: 1.8, label: 'Anderson' },
    ],

    // Historical: Union ~133k vs Confederate ~60k (2.2:1)
    // Chancellorsville was fought in dense Wilderness — artillery was largely ineffective.
    // Stoneman's raid took most Union cavalry away from the battle.
    // Stuart's cavalry screened Jackson's famous flank march.
    // Lee split his outnumbered force twice — ultimate gamble.
    units: [
      // UNION — huge infantry mass, almost no cavalry, limited artillery effectiveness
      { owner: 1, lat: 38.3180, lng: -77.6650, count: 75, unitType: 'infantry' }, // Meade's V Corps
      { owner: 1, lat: 38.3155, lng: -77.6620, count: 70, unitType: 'infantry' }, // Couch's II Corps
      { owner: 1, lat: 38.3130, lng: -77.6580, count: 70, unitType: 'infantry' }, // Slocum XII Corps
      { owner: 1, lat: 38.3100, lng: -77.6560, count: 65, unitType: 'infantry' }, // Sickles III Corps
      { owner: 1, lat: 38.3040, lng: -77.6550, count: 65, unitType: 'infantry' }, // Sedgwick VI Corps
      { owner: 1, lat: 38.3195, lng: -77.6710, count: 60, unitType: 'infantry' }, // Reynolds I Corps
      { owner: 1, lat: 38.3200, lng: -77.6740, count: 55, unitType: 'infantry' }, // Howard XI Corps (exposed flank)
      { owner: 1, lat: 38.3170, lng: -77.6760, count: 50, unitType: 'infantry' }, // XI Corps reserve
      // Cavalry — almost none (Stoneman's entire corps was on a raid)
      { owner: 1, lat: 38.3010, lng: -77.6520, count: 20, unitType: 'cavalry' }, // Small screening force
      // Artillery — limited by dense Wilderness, fewer guns useful
      { owner: 1, lat: 38.3145, lng: -77.6600, count: 22, unitType: 'cannon' },
      { owner: 1, lat: 38.3060, lng: -77.6540, count: 18, unitType: 'cannon' },
      // Commander
      { owner: 1, lat: 38.3110, lng: -77.6590, count: 10, unitType: 'commander' },

      // CONFEDERATE — smaller but aggressive, cavalry prominent, light artillery
      { owner: 2, lat: 38.3140, lng: -77.6050, count: 50, unitType: 'infantry' }, // Jackson's Corps
      { owner: 2, lat: 38.3110, lng: -77.6070, count: 50, unitType: 'infantry' }, // Rodes division
      { owner: 2, lat: 38.3070, lng: -77.6100, count: 55, unitType: 'infantry' }, // Colston division
      { owner: 2, lat: 38.3030, lng: -77.6120, count: 45, unitType: 'infantry' }, // A.P. Hill (reserve)
      { owner: 2, lat: 38.2970, lng: -77.6140, count: 40, unitType: 'infantry' }, // Anderson division
      // Cavalry — Stuart very active, screened Jackson's march
      { owner: 2, lat: 38.3155, lng: -77.5970, count: 35, unitType: 'cavalry' }, // Stuart's cavalry
      { owner: 2, lat: 38.2955, lng: -77.6060, count: 30, unitType: 'cavalry' }, // Fitz Lee
      // Artillery — limited by terrain
      { owner: 2, lat: 38.3090, lng: -77.6000, count: 18, unitType: 'cannon' },
      { owner: 2, lat: 38.3000, lng: -77.6080, count: 15, unitType: 'cannon' },
      // Commander
      { owner: 2, lat: 38.3050, lng: -77.6060, count: 10, unitType: 'commander' },
    ],
  },

  shiloh: {
    name: 'Battle of Shiloh',
    date: 'April 6-7, 1862',
    description: "Johnston's surprise attack at Pittsburg Landing. Grant holds and counterattacks on Day 2.",
    bounds: [[35.1250, -88.3700], [35.1650, -88.3050]],
    center: [35.1450, -88.3375],
    zoom: 14,
    geoTerrain: SHILOH_TERRAIN,

    forts: [
      { id: 'u1', lat: 35.1580, lng: -88.3200, owner: 1, garrison: 35, rate: 2.5, label: 'Pittsburg Landing' },
      { id: 'u2', lat: 35.1500, lng: -88.3250, owner: 1, garrison: 40, rate: 2.5, label: "Hornet's Nest" },
      { id: 'u3', lat: 35.1430, lng: -88.3300, owner: 1, garrison: 30, rate: 2.0, label: 'Shiloh Church' },
      { id: 'c1', lat: 35.1300, lng: -88.3600, owner: 2, garrison: 30, rate: 2.0, label: 'Hardee' },
      { id: 'c2', lat: 35.1350, lng: -88.3500, owner: 2, garrison: 35, rate: 2.2, label: 'Johnston HQ' },
      { id: 'c3', lat: 35.1280, lng: -88.3400, owner: 2, garrison: 25, rate: 1.8, label: 'Breckinridge' },
    ],

    // Historical: Union ~63k (Day 2 with reinforcements) vs Confederate ~44k (1.43:1)
    // Day 1: Johnston surprised Grant's camps. Fierce fighting at Hornet's Nest.
    // Johnston killed at Peach Orchard. Beauregard assumed command.
    // Night: Buell's Army of Ohio arrived as Union reinforcement.
    // Day 2: Grant counterattacked with fresh troops and pushed Confederates back.
    // Shiloh was primarily an infantry fight in wooded terrain with limited cavalry.
    units: [
      // UNION — surprised in camp, strong defensive positions at Landing
      { owner: 1, lat: 35.1570, lng: -88.3180, count: 60, unitType: 'infantry' }, // Wallace division (Landing)
      { owner: 1, lat: 35.1545, lng: -88.3220, count: 55, unitType: 'infantry' }, // Hurlbut division
      { owner: 1, lat: 35.1520, lng: -88.3260, count: 60, unitType: 'infantry' }, // W.H.L. Wallace (Hornet's Nest)
      { owner: 1, lat: 35.1495, lng: -88.3290, count: 55, unitType: 'infantry' }, // Prentiss division (Hornet's Nest)
      { owner: 1, lat: 35.1460, lng: -88.3320, count: 50, unitType: 'infantry' }, // Sherman division (Shiloh Church)
      { owner: 1, lat: 35.1435, lng: -88.3350, count: 50, unitType: 'infantry' }, // McClernand division
      { owner: 1, lat: 35.1410, lng: -88.3380, count: 45, unitType: 'infantry' }, // Stuart brigade (far left)
      // Cavalry — minimal at Shiloh
      { owner: 1, lat: 35.1560, lng: -88.3150, count: 20, unitType: 'cavalry' }, // Screening at Landing
      // Artillery — positioned along Sunken Road and Landing bluffs
      { owner: 1, lat: 35.1555, lng: -88.3200, count: 25, unitType: 'cannon' }, // Landing batteries
      { owner: 1, lat: 35.1510, lng: -88.3270, count: 22, unitType: 'cannon' }, // Hornet's Nest guns
      { owner: 1, lat: 35.1450, lng: -88.3340, count: 20, unitType: 'cannon' }, // Sherman's batteries
      // Commander
      { owner: 1, lat: 35.1530, lng: -88.3200, count: 10, unitType: 'commander' }, // Grant

      // CONFEDERATE — attacking from south, four corps in waves
      { owner: 2, lat: 35.1320, lng: -88.3550, count: 50, unitType: 'infantry' }, // Hardee (1st line)
      { owner: 2, lat: 35.1340, lng: -88.3520, count: 50, unitType: 'infantry' }, // Bragg (2nd line)
      { owner: 2, lat: 35.1300, lng: -88.3480, count: 55, unitType: 'infantry' }, // Polk corps
      { owner: 2, lat: 35.1280, lng: -88.3450, count: 45, unitType: 'infantry' }, // Breckinridge reserve
      { owner: 2, lat: 35.1360, lng: -88.3490, count: 55, unitType: 'infantry' }, // Cheatham division
      { owner: 2, lat: 35.1310, lng: -88.3420, count: 40, unitType: 'infantry' }, // Withers division
      // Cavalry — light presence
      { owner: 2, lat: 35.1270, lng: -88.3600, count: 25, unitType: 'cavalry' }, // Forrest's cavalry
      // Artillery — Confederate guns at Shiloh
      { owner: 2, lat: 35.1330, lng: -88.3540, count: 20, unitType: 'cannon' }, // Hardee's batteries
      { owner: 2, lat: 35.1290, lng: -88.3460, count: 18, unitType: 'cannon' }, // Reserve artillery
      // Commander
      { owner: 2, lat: 35.1350, lng: -88.3500, count: 10, unitType: 'commander' }, // Johnston
    ],
  },
};

// Tile layer options — user can switch between these
export const TILE_LAYERS = {
  // Stamen Watercolor via Stadia — hand-drawn parchment look
  watercolor: {
    name: 'Watercolor',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap',
    maxZoom: 16,
  },
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
  // ESRI World Imagery — satellite
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    maxZoom: 18,
  },
};
