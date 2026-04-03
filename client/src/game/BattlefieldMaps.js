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

    // Forts = HQ rally points
    forts: [
      // Union — east of Antietam Creek, attacking westward in three phases
      { id: 'u1', lat: 39.4830, lng: -77.7200, owner: 1, garrison: 30, rate: 2.0, label: 'I Corps (Hooker)' },
      { id: 'u2', lat: 39.4720, lng: -77.7180, owner: 1, garrison: 40, rate: 2.5, label: 'II Corps (Sumner)' },
      { id: 'u3', lat: 39.4580, lng: -77.7200, owner: 1, garrison: 30, rate: 2.0, label: 'IX Corps (Burnside)' },
      // Confederate — along the ridge west of Antietam Creek
      { id: 'c1', lat: 39.4810, lng: -77.7450, owner: 2, garrison: 25, rate: 1.8, label: 'Jackson' },
      { id: 'c2', lat: 39.4700, lng: -77.7480, owner: 2, garrison: 35, rate: 2.2, label: 'Lee HQ' },
      { id: 'c3', lat: 39.4570, lng: -77.7420, owner: 2, garrison: 25, rate: 1.8, label: 'Toombs' },
    ],

    // Historical: Union ~87k vs Confederate ~38k (2.3:1)
    // September 17, 1862 — dawn positions.
    // McClellan attacked piecemeal: Hooker in the north (Cornfield/Dunker Church),
    // Sumner in the center (Sunken Road/Bloody Lane),
    // Burnside in the south (Burnside Bridge/Rohrbach Bridge).
    // Confederate line along ridge west of Antietam Creek, anchored on Sharpsburg.
    units: [
      // ── UNION — east of Antietam Creek, attacking west ──
      // Northern attack — Hooker's I Corps + Mansfield's XII Corps
      { owner: 1, lat: 39.4840, lng: -77.7250, count: 75, unitType: 'infantry' }, // Hooker I Corps
      { owner: 1, lat: 39.4820, lng: -77.7220, count: 70, unitType: 'infantry' }, // Mansfield XII Corps
      // Center attack — Sumner's II Corps
      { owner: 1, lat: 39.4740, lng: -77.7200, count: 70, unitType: 'infantry' }, // Sumner's II Corps (French)
      { owner: 1, lat: 39.4710, lng: -77.7180, count: 65, unitType: 'infantry' }, // Richardson division
      // Southern attack — Burnside's IX Corps at the bridge
      { owner: 1, lat: 39.4600, lng: -77.7250, count: 60, unitType: 'infantry' }, // Burnside IX Corps
      { owner: 1, lat: 39.4570, lng: -77.7230, count: 55, unitType: 'infantry' }, // Rodman division
      // Reserve — Porter's V Corps + Franklin's VI Corps (McClellan held back)
      { owner: 1, lat: 39.4680, lng: -77.7130, count: 50, unitType: 'infantry' }, // Porter V Corps (reserve)
      // Cavalry — small, screening only
      { owner: 1, lat: 39.4850, lng: -77.7180, count: 25, unitType: 'cavalry' }, // Pleasonton
      // Artillery — east bank of creek, firing over the water
      { owner: 1, lat: 39.4830, lng: -77.7190, count: 30, unitType: 'cannon' }, // Northern batteries
      { owner: 1, lat: 39.4720, lng: -77.7150, count: 30, unitType: 'cannon' }, // Center batteries
      { owner: 1, lat: 39.4610, lng: -77.7180, count: 25, unitType: 'cannon' }, // Southern batteries
      // Commander — McClellan at Pry House, well east of the fighting
      { owner: 1, lat: 39.4700, lng: -77.7130, count: 10, unitType: 'commander' },

      // ── CONFEDERATE — along ridge west of Antietam Creek ──
      // Northern sector — Jackson's wing (Dunker Church / Cornfield)
      { owner: 2, lat: 39.4830, lng: -77.7440, count: 55, unitType: 'infantry' }, // Jackson (Cornfield)
      { owner: 2, lat: 39.4805, lng: -77.7420, count: 50, unitType: 'infantry' }, // Hood's division
      // Center — D.H. Hill at the Sunken Road (Bloody Lane)
      { owner: 2, lat: 39.4740, lng: -77.7400, count: 55, unitType: 'infantry' }, // D.H. Hill (Sunken Road)
      { owner: 2, lat: 39.4710, lng: -77.7430, count: 50, unitType: 'infantry' }, // R.H. Anderson
      // Southern sector — Toombs at Burnside Bridge, A.P. Hill in reserve (arriving from Harpers Ferry)
      { owner: 2, lat: 39.4580, lng: -77.7380, count: 40, unitType: 'infantry' }, // Toombs (bridge defense)
      { owner: 2, lat: 39.4550, lng: -77.7500, count: 35, unitType: 'infantry' }, // A.P. Hill (arriving from south)
      // Cavalry — Stuart on the left flank, Nicodemus Heights area
      { owner: 2, lat: 39.4850, lng: -77.7520, count: 20, unitType: 'cavalry' }, // Stuart
      // Artillery — on high ground, key advantage
      { owner: 2, lat: 39.4840, lng: -77.7500, count: 22, unitType: 'cannon' }, // Nicodemus Heights
      { owner: 2, lat: 39.4700, lng: -77.7470, count: 20, unitType: 'cannon' }, // Center batteries
      // Commander — Lee at Sharpsburg
      { owner: 2, lat: 39.4690, lng: -77.7480, count: 10, unitType: 'commander' },
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

    // Forts = HQ rally points
    // Real GPS: Cemetery Ridge ~-77.233, Seminary Ridge ~-77.243, Culp's Hill ~-77.223
    forts: [
      // Union — the "fishhook"
      { id: 'u1', lat: 39.8195, lng: -77.2310, owner: 1, garrison: 35, rate: 2.5, label: 'Cemetery Hill' },
      { id: 'u2', lat: 39.8100, lng: -77.2330, owner: 1, garrison: 45, rate: 3.0, label: 'Meade HQ' },
      { id: 'u3', lat: 39.7935, lng: -77.2345, owner: 1, garrison: 35, rate: 2.5, label: 'Little Round Top' },
      // Confederate — Seminary Ridge, ~0.01° west of Cemetery Ridge
      { id: 'c1', lat: 39.8230, lng: -77.2400, owner: 2, garrison: 30, rate: 2.0, label: 'Ewell' },
      { id: 'c2', lat: 39.8100, lng: -77.2430, owner: 2, garrison: 40, rate: 2.5, label: 'Lee HQ' },
      { id: 'c3', lat: 39.7990, lng: -77.2440, owner: 2, garrison: 30, rate: 2.0, label: 'Longstreet' },
    ],

    // Historical: Union ~94k vs Confederate ~71k (1.32:1)
    // Day 2 positions (afternoon, July 2, 1863).
    // Union "fishhook": Culp's Hill → Cemetery Hill → Cemetery Ridge → Little Round Top.
    // Confederate on Seminary Ridge ~1 mile west, Ewell north/east of town.
    // The two ridges are roughly 1 mile (0.01° longitude) apart.
    units: [
      // ── UNION — the "fishhook" ──
      // Culp's Hill (right end of fishhook, east of town)
      { owner: 1, lat: 39.8195, lng: -77.2230, count: 50, unitType: 'infantry' }, // Slocum XII Corps
      // Cemetery Hill (the bend in the fishhook)
      { owner: 1, lat: 39.8200, lng: -77.2310, count: 45, unitType: 'infantry' }, // I Corps remnants
      { owner: 1, lat: 39.8185, lng: -77.2280, count: 40, unitType: 'infantry' }, // Howard XI Corps
      // Cemetery Ridge (the shaft of the fishhook, running south)
      { owner: 1, lat: 39.8120, lng: -77.2330, count: 65, unitType: 'infantry' }, // Hancock II Corps
      { owner: 1, lat: 39.8060, lng: -77.2340, count: 55, unitType: 'infantry' }, // Sedgwick VI Corps (reserve)
      // Sickles advanced west to the Peach Orchard (exposed salient)
      { owner: 1, lat: 39.8040, lng: -77.2390, count: 60, unitType: 'infantry' }, // Sickles III Corps
      // Little Round Top / Round Tops (southern anchor)
      { owner: 1, lat: 39.7950, lng: -77.2340, count: 60, unitType: 'infantry' }, // Sykes V Corps
      // Cavalry
      { owner: 1, lat: 39.8230, lng: -77.2450, count: 40, unitType: 'cavalry' }, // Buford (west of town)
      { owner: 1, lat: 39.7910, lng: -77.2320, count: 35, unitType: 'cavalry' }, // Kilpatrick (south)
      // Artillery — massed on Cemetery Ridge and Hill
      { owner: 1, lat: 39.8190, lng: -77.2300, count: 30, unitType: 'cannon' }, // Cemetery Hill guns
      { owner: 1, lat: 39.8100, lng: -77.2320, count: 32, unitType: 'cannon' }, // Hunt's reserve
      { owner: 1, lat: 39.7940, lng: -77.2335, count: 28, unitType: 'cannon' }, // Round Top batteries
      // Commander — Meade at Leister House, just behind Cemetery Ridge
      { owner: 1, lat: 39.8100, lng: -77.2300, count: 10, unitType: 'commander' },

      // ── CONFEDERATE — Seminary Ridge (~0.01° west) + Ewell wrapping north ──
      // Ewell's Corps — north and east of town, wrapping around to face Culp's Hill
      { owner: 2, lat: 39.8260, lng: -77.2350, count: 55, unitType: 'infantry' }, // Ewell (north of town)
      { owner: 2, lat: 39.8230, lng: -77.2300, count: 55, unitType: 'infantry' }, // Early (facing Cemetery Hill from north)
      // A.P. Hill's Corps — center of Seminary Ridge
      { owner: 2, lat: 39.8140, lng: -77.2430, count: 60, unitType: 'infantry' }, // Heth/Pender
      { owner: 2, lat: 39.8080, lng: -77.2440, count: 55, unitType: 'infantry' }, // Anderson division
      // Longstreet's Corps — south end of Seminary Ridge
      { owner: 2, lat: 39.8010, lng: -77.2450, count: 60, unitType: 'infantry' }, // Hood
      { owner: 2, lat: 39.7960, lng: -77.2460, count: 55, unitType: 'infantry' }, // McLaws
      // Cavalry — Stuart finally arriving from the east (late Day 2)
      { owner: 2, lat: 39.8200, lng: -77.2150, count: 35, unitType: 'cavalry' }, // Stuart (east, arriving)
      { owner: 2, lat: 39.7920, lng: -77.2480, count: 30, unitType: 'cavalry' }, // Hampton (south flank)
      // Artillery — massive line on Seminary Ridge
      { owner: 2, lat: 39.8150, lng: -77.2420, count: 30, unitType: 'cannon' }, // Seminary Ridge north
      { owner: 2, lat: 39.8070, lng: -77.2430, count: 32, unitType: 'cannon' }, // Alexander's battalion
      { owner: 2, lat: 39.7990, lng: -77.2445, count: 28, unitType: 'cannon' }, // Longstreet's guns
      // Commander — Lee at Seminary Ridge, observing the field
      { owner: 2, lat: 39.8100, lng: -77.2430, count: 10, unitType: 'commander' },
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

    // Forts = HQ positions, historically anchored
    forts: [
      // Union — Hooker at Chancellor House, Slocum south on Plank Rd, Sedgwick at Fredericksburg (east)
      { id: 'u1', lat: 38.3115, lng: -77.6300, owner: 1, garrison: 40, rate: 2.5, label: 'Hooker HQ' },
      { id: 'u2', lat: 38.3060, lng: -77.6340, owner: 1, garrison: 35, rate: 2.0, label: 'Slocum' },
      { id: 'u3', lat: 38.2960, lng: -77.5980, owner: 1, garrison: 35, rate: 2.0, label: 'Sedgwick' },
      // Confederate — Lee south of Plank Rd, Jackson starting east before flank march, Early at Fredericksburg
      { id: 'c1', lat: 38.3060, lng: -77.6150, owner: 2, garrison: 30, rate: 2.0, label: 'Lee HQ' },
      { id: 'c2', lat: 38.2920, lng: -77.6350, owner: 2, garrison: 35, rate: 2.2, label: 'Jackson' },
      { id: 'c3', lat: 38.2940, lng: -77.5960, owner: 2, garrison: 25, rate: 1.8, label: 'Early' },
    ],

    // Historical: Union ~133k vs Confederate ~60k (2.2:1)
    // Morning of May 2, 1863 — before Jackson's flank attack.
    // Union holds Chancellorsville crossroads in dense Wilderness.
    // Howard's XI Corps on exposed western flank (Jackson's target).
    // Sedgwick's VI Corps at Fredericksburg, 10 miles east.
    // Lee holds line east of Chancellorsville while Jackson marches south & west.
    units: [
      // ── UNION ──
      // XI Corps (Howard) — exposed western right flank along Orange Turnpike
      // This is what Jackson will hit — facing SOUTH, not west
      { owner: 1, lat: 38.3130, lng: -77.6550, count: 55, unitType: 'infantry' }, // Howard XI Corps (Devens)
      { owner: 1, lat: 38.3115, lng: -77.6500, count: 50, unitType: 'infantry' }, // XI Corps (Schurz)
      // V Corps (Meade) — north of Chancellor House, covering River Road
      { owner: 1, lat: 38.3180, lng: -77.6320, count: 65, unitType: 'infantry' }, // Meade V Corps
      // II Corps (Couch) — at Chancellor House crossroads, reserve
      { owner: 1, lat: 38.3120, lng: -77.6280, count: 70, unitType: 'infantry' }, // Couch II Corps
      // XII Corps (Slocum) — south of Chancellor House on Plank Road
      { owner: 1, lat: 38.3060, lng: -77.6310, count: 65, unitType: 'infantry' }, // Slocum XII Corps
      // III Corps (Sickles) — near Hazel Grove / Catherine's Furnace
      { owner: 1, lat: 38.3020, lng: -77.6370, count: 60, unitType: 'infantry' }, // Sickles III Corps
      // I Corps (Reynolds) — reserve near US Ford
      { owner: 1, lat: 38.3220, lng: -77.6400, count: 55, unitType: 'infantry' }, // Reynolds I Corps
      // VI Corps (Sedgwick) — at Fredericksburg, eastern edge of map
      { owner: 1, lat: 38.2960, lng: -77.5980, count: 65, unitType: 'infantry' }, // Sedgwick VI Corps
      // Cavalry — almost none (Stoneman's raid took the cavalry corps away)
      { owner: 1, lat: 38.3150, lng: -77.6350, count: 18, unitType: 'cavalry' }, // Small screening force
      // Artillery — limited by dense Wilderness terrain
      { owner: 1, lat: 38.3080, lng: -77.6280, count: 22, unitType: 'cannon' }, // Fairview clearing
      { owner: 1, lat: 38.3030, lng: -77.6350, count: 18, unitType: 'cannon' }, // Hazel Grove
      // Commander — Hooker at Chancellor House
      { owner: 1, lat: 38.3115, lng: -77.6295, count: 10, unitType: 'commander' },

      // ── CONFEDERATE ──
      // Lee's holding force — facing Union line east of Chancellorsville
      { owner: 2, lat: 38.3100, lng: -77.6180, count: 50, unitType: 'infantry' }, // McLaws division
      { owner: 2, lat: 38.3050, lng: -77.6150, count: 50, unitType: 'infantry' }, // Anderson division
      // Jackson's flanking column — marching south then west through the Wilderness
      // Positioned south of the Union line, approaching Howard's exposed flank from the west
      { owner: 2, lat: 38.2940, lng: -77.6400, count: 55, unitType: 'infantry' }, // Rodes division (lead)
      { owner: 2, lat: 38.2920, lng: -77.6350, count: 50, unitType: 'infantry' }, // Colston division
      { owner: 2, lat: 38.2900, lng: -77.6280, count: 45, unitType: 'infantry' }, // A.P. Hill division (rear)
      // Early's division — holding Marye's Heights at Fredericksburg vs Sedgwick
      { owner: 2, lat: 38.2950, lng: -77.5960, count: 40, unitType: 'infantry' }, // Early at Fredericksburg
      // Cavalry — Stuart screening Jackson's march route
      { owner: 2, lat: 38.2960, lng: -77.6450, count: 35, unitType: 'cavalry' }, // Stuart (screening march)
      { owner: 2, lat: 38.3130, lng: -77.6100, count: 25, unitType: 'cavalry' }, // Fitz Lee (recon)
      // Artillery — limited by Wilderness terrain
      { owner: 2, lat: 38.3070, lng: -77.6160, count: 18, unitType: 'cannon' }, // Lee's batteries
      { owner: 2, lat: 38.2930, lng: -77.6320, count: 15, unitType: 'cannon' }, // Jackson's horse artillery
      // Commander — Lee at the front with McLaws
      { owner: 2, lat: 38.3060, lng: -77.6150, count: 10, unitType: 'commander' },
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

    // Forts = HQ positions
    forts: [
      // Union — camps near Pittsburg Landing on the Tennessee River (northeast)
      { id: 'u1', lat: 35.1560, lng: -88.3200, owner: 1, garrison: 35, rate: 2.5, label: 'Pittsburg Landing' },
      { id: 'u2', lat: 35.1480, lng: -88.3350, owner: 1, garrison: 40, rate: 2.5, label: "Hornet's Nest" },
      { id: 'u3', lat: 35.1420, lng: -88.3450, owner: 1, garrison: 30, rate: 2.0, label: 'Shiloh Church' },
      // Confederate — attacking from the south/southwest (Corinth road)
      { id: 'c1', lat: 35.1280, lng: -88.3550, owner: 2, garrison: 30, rate: 2.0, label: 'Hardee' },
      { id: 'c2', lat: 35.1310, lng: -88.3450, owner: 2, garrison: 35, rate: 2.2, label: 'Johnston HQ' },
      { id: 'c3', lat: 35.1260, lng: -88.3350, owner: 2, garrison: 25, rate: 1.8, label: 'Breckinridge' },
    ],

    // Historical: Union ~44k (Day 1) vs Confederate ~44k — equal on Day 1.
    // Dawn, April 6, 1862 — Confederate surprise attack on Union camps.
    // Union camps scattered along roads from Pittsburg Landing to Shiloh Church.
    // Johnston's Confederates attack from the south in broad waves.
    // Key terrain: Hornet's Nest (sunken road), Peach Orchard, Pittsburg Landing bluffs.
    units: [
      // ── UNION — surprised in camps, spread from Pittsburg Landing SW to Shiloh Church ──
      // Dawn April 6: five divisions camped in a ~3-mile arc, no entrenchments.

      // Sherman's 5th Div — at Shiloh Church, furthest south (hit first)
      { owner: 1, lat: 35.1400, lng: -88.3480, count: 55, unitType: 'infantry' },
      { owner: 1, lat: 35.1410, lng: -88.3420, count: 45, unitType: 'infantry' },
      // McClernand's 1st Div — behind Sherman, straddling the Corinth Road
      { owner: 1, lat: 35.1450, lng: -88.3420, count: 50, unitType: 'infantry' },
      // Prentiss's 6th Div — east of Sherman, along the future Hornet's Nest line
      { owner: 1, lat: 35.1430, lng: -88.3340, count: 50, unitType: 'infantry' },
      // W.H.L. Wallace's 2nd Div — behind Prentiss, near the sunken road
      { owner: 1, lat: 35.1480, lng: -88.3320, count: 55, unitType: 'infantry' },
      // Hurlbut's 4th Div — east, between Wallace and the Landing
      { owner: 1, lat: 35.1490, lng: -88.3280, count: 55, unitType: 'infantry' },
      // Stuart's brigade — far left flank near Owl Creek
      { owner: 1, lat: 35.1380, lng: -88.3560, count: 35, unitType: 'infantry' },
      // Lew Wallace's 3rd Div — reserve north of Snake Creek (arrives late Day 1)
      { owner: 1, lat: 35.1590, lng: -88.3300, count: 50, unitType: 'infantry' },
      // Cavalry screen — small, between camps
      { owner: 1, lat: 35.1460, lng: -88.3300, count: 20, unitType: 'cavalry' },
      // Artillery — Landing bluffs (the guns that saved Grant's line)
      { owner: 1, lat: 35.1540, lng: -88.3240, count: 28, unitType: 'cannon' },
      // Artillery — with Sherman at Shiloh Church
      { owner: 1, lat: 35.1420, lng: -88.3460, count: 18, unitType: 'cannon' },
      // Artillery — Hornet's Nest position
      { owner: 1, lat: 35.1470, lng: -88.3350, count: 20, unitType: 'cannon' },
      // Grant — at Pittsburg Landing on the bluffs
      { owner: 1, lat: 35.1550, lng: -88.3230, count: 10, unitType: 'commander' },

      // ── CONFEDERATE — 4 corps in broad east-west waves attacking north ──
      // Johnston's plan: three corps abreast, Breckinridge in reserve.
      // Attack front ~3 miles wide from Owl Creek to Lick Creek.

      // Hardee's 3rd Corps — FIRST LINE, spread wide across the front
      { owner: 2, lat: 35.1340, lng: -88.3550, count: 50, unitType: 'infantry' }, // Left wing
      { owner: 2, lat: 35.1350, lng: -88.3420, count: 55, unitType: 'infantry' }, // Center
      { owner: 2, lat: 35.1340, lng: -88.3300, count: 50, unitType: 'infantry' }, // Right wing
      // Bragg's 2nd Corps — SECOND LINE
      { owner: 2, lat: 35.1300, lng: -88.3500, count: 55, unitType: 'infantry' }, // Left
      { owner: 2, lat: 35.1310, lng: -88.3370, count: 55, unitType: 'infantry' }, // Right
      // Polk's 1st Corps — THIRD LINE
      { owner: 2, lat: 35.1270, lng: -88.3480, count: 50, unitType: 'infantry' },
      { owner: 2, lat: 35.1280, lng: -88.3350, count: 45, unitType: 'infantry' },
      // Breckinridge's Reserve Corps — rear
      { owner: 2, lat: 35.1260, lng: -88.3420, count: 40, unitType: 'infantry' },
      // Forrest's Cavalry — screening the right (eastern) flank
      { owner: 2, lat: 35.1290, lng: -88.3220, count: 25, unitType: 'cavalry' },
      // Wharton's Cavalry — left (western) flank
      { owner: 2, lat: 35.1280, lng: -88.3600, count: 20, unitType: 'cavalry' },
      // Artillery — with Hardee's lead elements
      { owner: 2, lat: 35.1330, lng: -88.3460, count: 22, unitType: 'cannon' },
      // Artillery — with Bragg's corps
      { owner: 2, lat: 35.1300, lng: -88.3400, count: 18, unitType: 'cannon' },
      // Johnston — leading from behind Hardee's center (killed at Peach Orchard ~2:30pm)
      { owner: 2, lat: 35.1310, lng: -88.3430, count: 10, unitType: 'commander' },
    ],
  },
};

// Tile layer options — user can switch between these
export const TILE_LAYERS = {
  // Stamen Toner-labels via Stadia — just place names, no terrain fills
  labels: {
    name: 'Labels Only',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap',
    maxZoom: 18,
    opacity: 0.5,
  },
  // Stamen Toner-lines via Stadia — road lines + labels, no terrain fills
  lines: {
    name: 'Roads & Labels',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap',
    maxZoom: 18,
    opacity: 0.3,
  },
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
