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

    // ═══════════════════════════════════════════════════════════
    //  REALISTIC MODE — Three day phases with historical accuracy
    //  Scale: 1 unit ≈ 1,500–2,000 men
    //  Sources: Busey & Martin (2005), Wikipedia, NPS records
    // ═══════════════════════════════════════════════════════════
    realisticPhases: {
      day1: {
        name: 'Day 1 — The Collision',
        date: 'July 1, 1863 — ~7:30 AM',
        description: 'Pettigrew\'s Confederate infantry approaches Gettysburg seeking supplies. Buford\'s Union cavalry holds the ridges west of town, buying time for infantry reinforcements.',
        briefing: `You command the Union Army of the Potomac's advance forces.

SITUATION: Confederate infantry (Heth's Division, ~7,500) is marching east on the Chambersburg Pike. Your cavalry under Buford holds three ridges west of town — Herr Ridge, McPherson Ridge, and Seminary Ridge. You must delay them long enough for Reynolds' I Corps and Howard's XI Corps to arrive and occupy Cemetery Hill.

KEY DECISIONS:
• Where to establish the main infantry defensive line
• Whether to hold Seminary Ridge or fall back to Cemetery Hill
• Watch the northern flank — Ewell's corps (Rodes + Early, ~14,000) is approaching from the north

HISTORICAL RESULT: Union forces were driven through town after hard fighting. I Corps lost ~6,000 men. But Hancock secured Cemetery Hill as the anchor for Days 2–3.

OBJECTIVE: Hold Cemetery Hill (the bend in the fishhook) until nightfall. Lose it and Lee controls all the high ground.`,
        victoryCondition: 'Hold Cemetery Hill (Union HQ fort) while preserving enough strength to defend through Day 3.',
        forts: [
          // Union — critical hills south of town
          { id: 'u1', lat: 39.8210, lng: -77.2315, owner: 1, garrison: 20, rate: 2.0, label: 'Cemetery Hill' },
          { id: 'u2', lat: 39.8185, lng: -77.2220, owner: 1, garrison: 15, rate: 1.5, label: "Culp's Hill" },
          { id: 'u3', lat: 39.8320, lng: -77.2500, owner: 1, garrison: 10, rate: 1.5, label: 'Seminary (fallback)' },
          // Confederate — approaching from west and north
          { id: 'c1', lat: 39.8320, lng: -77.2640, owner: 2, garrison: 15, rate: 2.0, label: 'Herr Ridge (Heth)' },
          { id: 'c2', lat: 39.8380, lng: -77.2380, owner: 2, garrison: 20, rate: 2.0, label: 'Oak Hill (Rodes)' },
          { id: 'c3', lat: 39.8420, lng: -77.2290, owner: 2, garrison: 15, rate: 1.8, label: "Early's approach" },
        ],
        units: [
          // ── UNION ──
          // Buford's Cavalry Division (~2,700 men) — deployed in skirmish line on McPherson Ridge
          // Gamble's Brigade: south of Chambersburg Pike, McPherson Ridge
          { owner: 1, lat: 39.8310, lng: -77.2510, count: 18, unitType: 'cavalry', label: "Gamble's Bde (Buford)" },
          // Devin's Brigade: north of pike, covering Oak Ridge
          { owner: 1, lat: 39.8330, lng: -77.2490, count: 16, unitType: 'cavalry', label: "Devin's Bde (Buford)" },
          // I Corps — Reynolds (12,000) arriving via Emmitsburg Road from south
          // Wadsworth's 1st Division — rushed forward to relieve cavalry
          { owner: 1, lat: 39.8270, lng: -77.2380, count: 55, unitType: 'infantry', label: "Wadsworth/Iron Brigade (I Corps)" },
          // Robinson's 2nd Division — following Wadsworth
          { owner: 1, lat: 39.8220, lng: -77.2340, count: 48, unitType: 'infantry', label: "Robinson's Div (I Corps)" },
          // Doubleday's 3rd Division — rear of I Corps column
          { owner: 1, lat: 39.8190, lng: -77.2330, count: 45, unitType: 'infantry', label: "Doubleday's Div (I Corps)" },
          // XI Corps — Howard (9,200) racing north on Baltimore Pike
          // Barlow's Division — fated to advance to Blocher's Knoll
          { owner: 1, lat: 39.8230, lng: -77.2290, count: 42, unitType: 'infantry', label: "Barlow's Div (XI Corps)" },
          // Schurz's Division — center XI Corps
          { owner: 1, lat: 39.8215, lng: -77.2310, count: 40, unitType: 'infantry', label: "Schurz's Div (XI Corps)" },
          // Steinwehr's Division — Howard kept in reserve on Cemetery Hill
          { owner: 1, lat: 39.8205, lng: -77.2315, count: 38, unitType: 'infantry', label: "Steinwehr (Reserve, Cemetery Hill)" },
          // I Corps Artillery — Hall's, Stevens's, Cooper's batteries
          { owner: 1, lat: 39.8310, lng: -77.2480, count: 18, unitType: 'cannon', label: "I Corps Artillery" },
          { owner: 1, lat: 39.8205, lng: -77.2310, count: 20, unitType: 'cannon', label: "Cemetery Hill guns" },
          // Commander — Reynolds (then Doubleday after Reynolds killed)
          { owner: 1, lat: 39.8250, lng: -77.2360, count: 10, unitType: 'commander', label: 'Reynolds HQ' },

          // ── CONFEDERATE ──
          // Heth's Division (~7,500, A.P. Hill's III Corps) — advancing east on Chambersburg Pike
          // Archer's Brigade — south of the pike, will hit Iron Brigade
          { owner: 2, lat: 39.8300, lng: -77.2590, count: 40, unitType: 'infantry', label: "Archer's Bde (Heth)" },
          // Davis's Brigade — north of the pike, will fight around railroad cut
          { owner: 2, lat: 39.8340, lng: -77.2580, count: 38, unitType: 'infantry', label: "Davis's Bde (Heth)" },
          // Pettigrew's Brigade — following as reserve (North Carolinians)
          { owner: 2, lat: 39.8280, lng: -77.2640, count: 55, unitType: 'infantry', label: "Pettigrew's Bde (Heth)" },
          // Brockenbrough's Brigade — Heth's 4th brigade, reserve
          { owner: 2, lat: 39.8260, lng: -77.2630, count: 35, unitType: 'infantry', label: "Brockenbrough (Heth)" },
          // Pender's Division — following Heth, will push forward ~2pm
          { owner: 2, lat: 39.8240, lng: -77.2650, count: 60, unitType: 'infantry', label: "Pender's Div (III Corps)" },
          // Rodes's Division (Ewell's II Corps) — approaching from north via Carlisle Road
          { owner: 2, lat: 39.8390, lng: -77.2380, count: 65, unitType: 'infantry', label: "Rodes's Div (Ewell)" },
          // Early's Division (Ewell's II Corps) — approaching from northeast via Harrisburg Road
          { owner: 2, lat: 39.8430, lng: -77.2290, count: 55, unitType: 'infantry', label: "Early's Div (Ewell)" },
          // Heth's artillery — on Herr Ridge
          { owner: 2, lat: 39.8320, lng: -77.2560, count: 22, unitType: 'cannon', label: "Heth's Artillery" },
          // Rodes's artillery — on Oak Hill
          { owner: 2, lat: 39.8380, lng: -77.2390, count: 20, unitType: 'cannon', label: "Rodes's Artillery / Oak Hill" },
          // Commander — Lee (with Hill), approaching from Cashtown
          { owner: 2, lat: 39.8270, lng: -77.2660, count: 10, unitType: 'commander', label: 'Lee / Hill HQ' },
        ],
      },

      day2: {
        name: 'Day 2 — Assault on the Flanks',
        date: 'July 2, 1863 — ~4:00 PM',
        description: "Lee's grand assault: Longstreet attacks the Union left at the Peach Orchard, Devil's Den, and Little Round Top. Ewell demonstrates against Culp's Hill and Cemetery Hill.",
        briefing: `You command the Union Army of the Potomac in its fishhook defensive formation.

SITUATION: The Union line forms a fishhook — from Culp's Hill (right), bending west to Cemetery Hill, then south along Cemetery Ridge to Little Round Top (left). Lee's full army is now present. Longstreet (~21,000) will assault your left flank late this afternoon. Ewell (~22,000) threatens your right at Culp's Hill.

CRITICAL PROBLEM: Gen. Sickles has DISOBEYED orders and advanced his III Corps ~0.5 miles west to the Peach Orchard, creating a dangerous salient exposed to attack from two sides. You must decide whether to reinforce his exposed position or let it collapse.

KEY DECISIONS:
• Defend Little Round Top — if lost, the Confederates enfilade your entire line
• Respond to Sickles' salient: reinforce or let it collapse?
• Hold Culp's Hill against Ewell's evening assault
• Manage your interior lines — shift VI Corps reserves where needed

HISTORICAL RESULT: Fierce fighting at Devil's Den, Wheatfield, Peach Orchard, and Little Round Top. Chamberlain's 20th Maine held Little Round Top by bayonet charge. Union line bent but did not break. ~10,000 Union + ~9,000 Confederate casualties.

OBJECTIVE: Hold Cemetery Ridge and Little Round Top through nightfall.`,
        victoryCondition: "Hold Little Round Top and Cemetery Ridge. Loss of Little Round Top is catastrophic — it anchors the entire Union left flank.",
        forts: [
          // Union — fishhook
          { id: 'u1', lat: 39.8210, lng: -77.2315, owner: 1, garrison: 40, rate: 2.5, label: 'Cemetery Hill' },
          { id: 'u2', lat: 39.8100, lng: -77.2330, owner: 1, garrison: 50, rate: 3.0, label: 'Meade HQ / Cemetery Ridge' },
          { id: 'u3', lat: 39.7935, lng: -77.2360, owner: 1, garrison: 35, rate: 2.5, label: 'Little Round Top' },
          { id: 'u4', lat: 39.8185, lng: -77.2220, owner: 1, garrison: 30, rate: 2.0, label: "Culp's Hill" },
          // Confederate
          { id: 'c1', lat: 39.8230, lng: -77.2420, owner: 2, garrison: 35, rate: 2.0, label: 'Lee HQ / Seminary Ridge' },
          { id: 'c2', lat: 39.7960, lng: -77.2480, owner: 2, garrison: 30, rate: 2.0, label: "Longstreet's position" },
          { id: 'c3', lat: 39.8280, lng: -77.2310, owner: 2, garrison: 25, rate: 1.8, label: 'Ewell (north of town)' },
        ],
        units: [
          // ── UNION — fishhook formation ──
          // Culp's Hill — XII Corps (Slocum, ~9,800)
          // Most of XII Corps will be pulled left to support Sickles, leaving only Greene's brigade
          { owner: 1, lat: 39.8188, lng: -77.2215, count: 50, unitType: 'infantry', label: "Slocum XII Corps (Culp's Hill)" },
          // Cemetery Hill — I Corps remnants + XI Corps (Hancock reorganizing)
          { owner: 1, lat: 39.8205, lng: -77.2318, count: 38, unitType: 'infantry', label: 'I Corps remnants (Cemetery Hill)' },
          { owner: 1, lat: 39.8195, lng: -77.2290, count: 35, unitType: 'infantry', label: 'Howard XI Corps (Cemetery Hill)' },
          // Cemetery Ridge north — Hancock II Corps (~11,300)
          { owner: 1, lat: 39.8155, lng: -77.2330, count: 50, unitType: 'infantry', label: "Caldwell's Div (II Corps)" },
          { owner: 1, lat: 39.8110, lng: -77.2328, count: 55, unitType: 'infantry', label: "Gibbon's Div (II Corps / 'The Angle')" },
          { owner: 1, lat: 39.8080, lng: -77.2330, count: 45, unitType: 'infantry', label: "Hays' Div (II Corps)" },
          // Sickles III Corps — advanced to Peach Orchard SALIENT (historically unsanctioned move)
          { owner: 1, lat: 39.8045, lng: -77.2440, count: 50, unitType: 'infantry', label: "Birney's Div (Sickles III Corps / Peach Orchard)" },
          { owner: 1, lat: 39.8010, lng: -77.2400, count: 48, unitType: 'infantry', label: "Humphreys' Div (III Corps / Emmitsburg Rd)" },
          // V Corps (Sykes, ~11,000) — approaches Little Round Top just in time
          { owner: 1, lat: 39.7980, lng: -77.2360, count: 50, unitType: 'infantry', label: "Barnes's Div (V Corps)" },
          { owner: 1, lat: 39.7955, lng: -77.2345, count: 48, unitType: 'infantry', label: "Vincent's Bde + 20th Maine (Little Round Top)" },
          { owner: 1, lat: 39.7930, lng: -77.2340, count: 45, unitType: 'infantry', label: "Crawford PA Reserves (V Corps)" },
          // VI Corps (Sedgwick, ~15,000) — arriving as reserve, huge but exhausted from march
          { owner: 1, lat: 39.8060, lng: -77.2310, count: 65, unitType: 'infantry', label: 'Sedgwick VI Corps (Reserve — just arrived)' },
          // Buford's Cavalry — west of Cemetery Hill
          { owner: 1, lat: 39.8230, lng: -77.2440, count: 28, unitType: 'cavalry', label: 'Buford Cavalry (west)' },
          { owner: 1, lat: 39.7900, lng: -77.2310, count: 28, unitType: 'cavalry', label: 'Kilpatrick Cavalry (south)' },
          // Artillery — Hunt's ~360 guns
          { owner: 1, lat: 39.8195, lng: -77.2300, count: 30, unitType: 'cannon', label: 'Cemetery Hill batteries' },
          { owner: 1, lat: 39.8110, lng: -77.2315, count: 35, unitType: 'cannon', label: "Hunt's Artillery Reserve (Cemetery Ridge)" },
          { owner: 1, lat: 39.7940, lng: -77.2335, count: 25, unitType: 'cannon', label: 'Round Top batteries' },
          // Commander — Meade at Leister House
          { owner: 1, lat: 39.8105, lng: -77.2298, count: 10, unitType: 'commander', label: 'Meade HQ (Leister House)' },

          // ── CONFEDERATE ──
          // Longstreet's First Corps (~21,000) — Seminary Ridge south end, preparing assault
          // Hood's Division (~8,000) — extreme right, will attack Devil's Den and Little Round Top
          { owner: 2, lat: 39.7985, lng: -77.2490, count: 55, unitType: 'infantry', label: "Hood's Div (Longstreet) — Devil's Den / Round Tops" },
          { owner: 2, lat: 39.7945, lng: -77.2470, count: 50, unitType: 'infantry', label: "Law's Bde (Hood) — Big Round Top flank" },
          // McLaws's Division (~7,000) — left of Hood, attacking Peach Orchard and Wheatfield
          { owner: 2, lat: 39.8025, lng: -77.2490, count: 55, unitType: 'infantry', label: "McLaws's Div (Longstreet) — Peach Orchard / Wheatfield" },
          { owner: 2, lat: 39.8055, lng: -77.2475, count: 50, unitType: 'infantry', label: "Barksdale's Bde (McLaws) — assault on Peach Orchard" },
          // Anderson's Division (A.P. Hill, ~7,500) — will support Longstreet at Cemetery Ridge center
          { owner: 2, lat: 39.8080, lng: -77.2460, count: 55, unitType: 'infantry', label: "Anderson's Div (Hill) — Cemetery Ridge center" },
          // Heth's/Pender's battered divisions — held in reserve on Seminary Ridge center/north
          { owner: 2, lat: 39.8150, lng: -77.2440, count: 42, unitType: 'infantry', label: "Pender's Div (battered, Seminary Ridge)" },
          { owner: 2, lat: 39.8120, lng: -77.2450, count: 38, unitType: 'infantry', label: "Heth's Div (battered, reserve)" },
          // Pickett's Division — not yet on field (still arriving from Chambersburg)
          { owner: 2, lat: 39.8100, lng: -77.2620, count: 48, unitType: 'infantry', label: "Pickett's Div (arriving — Day 3 assault force)" },
          // Ewell's Corps — north and east of town
          // Johnson's Division — facing Culp's Hill
          { owner: 2, lat: 39.8230, lng: -77.2260, count: 50, unitType: 'infantry', label: "Ed. Johnson's Div (Ewell) — vs Culp's Hill" },
          // Early's Division — facing Cemetery Hill from north
          { owner: 2, lat: 39.8255, lng: -77.2305, count: 50, unitType: 'infantry', label: "Early's Div (Ewell) — vs Cemetery Hill" },
          // Rodes's Division — north of town, facing Cemetery Hill northwest
          { owner: 2, lat: 39.8285, lng: -77.2400, count: 55, unitType: 'infantry', label: "Rodes's Div (Ewell) — Seminary/Oak Ridge" },
          // Stuart's Cavalry — finally arriving from east (late)
          { owner: 2, lat: 39.8220, lng: -77.2140, count: 32, unitType: 'cavalry', label: 'Stuart Cavalry (just arrived from east)' },
          { owner: 2, lat: 39.7910, lng: -77.2490, count: 25, unitType: 'cavalry', label: 'Hampton / Jenkins (south flank)' },
          // Confederate artillery — ~270 guns along Seminary Ridge
          { owner: 2, lat: 39.8170, lng: -77.2440, count: 30, unitType: 'cannon', label: "Alexander's Artillery Bn (Longstreet)" },
          { owner: 2, lat: 39.8080, lng: -77.2455, count: 32, unitType: 'cannon', label: 'Artillery — Seminary Ridge center' },
          { owner: 2, lat: 39.7970, lng: -77.2465, count: 28, unitType: 'cannon', label: "Artillery — Longstreet's south guns" },
          // Commander — Lee at Seminary Ridge
          { owner: 2, lat: 39.8115, lng: -77.2445, count: 10, unitType: 'commander', label: "Lee HQ (Seminary Ridge)" },
        ],
      },

      day3: {
        name: "Day 3 — Pickett's Charge",
        date: 'July 3, 1863 — ~3:00 PM',
        description: "Lee orders the largest Confederate assault of the war. ~12,500 men will march 3/4 mile across open fields toward the Union center at Cemetery Ridge — directly into the waiting guns of the Army of the Potomac.",
        briefing: `You command the Army of the Potomac defending Cemetery Ridge.

SITUATION: After two days of fighting, your army holds the fishhook line. Lee has decided on a massed frontal assault against your center — "The Copse of Trees" on Cemetery Ridge. ~170 Confederate cannon have just completed a 2-hour bombardment. Now Pickett's division and six brigades from Hill's corps (~12,500 men) are stepping off Seminary Ridge.

Gen. Hunt deliberately silenced your guns during the bombardment to conserve ammunition for the infantry assault — Confederate commanders may believe they have knocked out your batteries.

KEY DECISIONS:
• Position your artillery — open fire on the advancing column with maximum effect
• Thin your line to reinforce "The Angle" where the attack will hit hardest
• Hold your nerve — do not counterattack prematurely
• Watch for Stuart's cavalry attempting to flank your right rear

HISTORICAL RESULT: The assault was repulsed with catastrophic Confederate losses. Pickett's division lost ~60% of its men; all three of his brigadiers were casualties. The "high-water mark" of the Confederacy was a copse of trees at the angle of the stone fence. Lee never launched another strategic offensive.

OBJECTIVE: Repel Pickett's Charge. Hold The Angle (center fort). Stuart's cavalry must not break through to your rear.`,
        victoryCondition: 'Hold Cemetery Ridge against Pickett\'s Charge. Every Confederate breakthrough at "The Angle" must be plugged.',
        forts: [
          // Union — Cemetery Ridge fortified positions
          { id: 'u1', lat: 39.8210, lng: -77.2315, owner: 1, garrison: 35, rate: 2.0, label: 'Cemetery Hill (secure)' },
          { id: 'u2', lat: 39.8120, lng: -77.2328, owner: 1, garrison: 55, rate: 3.5, label: '"The Angle" / Copse of Trees' },
          { id: 'u3', lat: 39.8050, lng: -77.2330, owner: 1, garrison: 40, rate: 2.5, label: 'Cemetery Ridge South' },
          { id: 'u4', lat: 39.7935, lng: -77.2360, owner: 1, garrison: 30, rate: 2.0, label: 'Little Round Top (secure)' },
          // Confederate — Seminary Ridge, assault forming up
          { id: 'c1', lat: 39.8150, lng: -77.2500, owner: 2, garrison: 30, rate: 2.0, label: "Pickett's Jump-off Point" },
          { id: 'c2', lat: 39.8100, lng: -77.2480, owner: 2, garrison: 25, rate: 1.8, label: 'Seminary Ridge — Pettigrew/Trimble' },
          { id: 'c3', lat: 39.8230, lng: -77.2200, owner: 2, garrison: 20, rate: 1.5, label: "Stuart's Cavalry (east flank)" },
        ],
        units: [
          // ── UNION — defending Cemetery Ridge ──
          // Cemetery Hill — secured, remnants of I and XI Corps
          { owner: 1, lat: 39.8205, lng: -77.2315, count: 32, unitType: 'infantry', label: 'Cemetery Hill garrison' },
          // II Corps (Hancock) — holding the center, will absorb the assault
          // Caldwell's division was destroyed on Day 2; Hancock uses Gibbon and Hays
          { owner: 1, lat: 39.8138, lng: -77.2330, count: 55, unitType: 'infantry', label: "Gibbon's Div (II Corps) — 'The Angle'" },
          { owner: 1, lat: 39.8115, lng: -77.2330, count: 50, unitType: 'infantry', label: "Hays' Div (II Corps) — stone wall" },
          { owner: 1, lat: 39.8090, lng: -77.2328, count: 45, unitType: 'infantry', label: "Stannard's VT Brigade — will wheel to flank charge" },
          { owner: 1, lat: 39.8060, lng: -77.2325, count: 40, unitType: 'infantry', label: 'Cemetery Ridge South — mixed command' },
          // VI Corps — fresh reserve behind ridge (largest Union corps, barely used Day 2)
          { owner: 1, lat: 39.8100, lng: -77.2298, count: 58, unitType: 'infantry', label: 'Sedgwick VI Corps (reserve behind ridge)' },
          // V Corps at Round Tops — securing flanks
          { owner: 1, lat: 39.7960, lng: -77.2345, count: 40, unitType: 'infantry', label: 'V Corps (Round Tops, secure)' },
          // XII Corps returned to Culp's Hill after morning fight
          { owner: 1, lat: 39.8188, lng: -77.2222, count: 42, unitType: 'infantry', label: "XII Corps (Culp's Hill — secured this morning)" },
          // Gregg's cavalry — facing Stuart east of Gettysburg
          { owner: 1, lat: 39.8230, lng: -77.2090, count: 30, unitType: 'cavalry', label: "Gregg + Custer Cavalry (vs Stuart, East Cavalry Field)" },
          // Kilpatrick south — will make disastrous charge against Longstreet's flank
          { owner: 1, lat: 39.7885, lng: -77.2380, count: 22, unitType: 'cavalry', label: 'Kilpatrick Cavalry (south — Farnsworth\'s doomed charge)' },
          // Artillery — Hunt's 80 guns on Cemetery Ridge, massed for the assault
          { owner: 1, lat: 39.8205, lng: -77.2295, count: 28, unitType: 'cannon', label: 'Cemetery Hill batteries (80+ guns total)' },
          { owner: 1, lat: 39.8135, lng: -77.2318, count: 38, unitType: 'cannon', label: "Hunt's guns — 'The Angle' center (held fire during bombard)" },
          { owner: 1, lat: 39.8065, lng: -77.2318, count: 30, unitType: 'cannon', label: 'Cemetery Ridge South batteries' },
          { owner: 1, lat: 39.7940, lng: -77.2338, count: 22, unitType: 'cannon', label: 'Little Round Top flanking guns' },
          // Commander — Meade at Leister House behind ridge
          { owner: 1, lat: 39.8105, lng: -77.2295, count: 10, unitType: 'commander', label: 'Meade HQ' },

          // ── CONFEDERATE — Pickett's Charge forming up on Seminary Ridge ──
          // Pickett's Division (~5,500 Virginians) — right of assault column
          { owner: 2, lat: 39.8168, lng: -77.2520, count: 42, unitType: 'infantry', label: "Garnett's Bde (Pickett) — right of charge" },
          { owner: 2, lat: 39.8145, lng: -77.2510, count: 40, unitType: 'infantry', label: "Kemper's Bde (Pickett) — far right" },
          { owner: 2, lat: 39.8125, lng: -77.2515, count: 38, unitType: 'infantry', label: "Armistead's Bde (Pickett) — will breach 'The Angle'" },
          // Pettigrew's Division (Hill's corps, ~3,500) — left of assault column
          // Heavily battered from Day 1 fighting
          { owner: 2, lat: 39.8108, lng: -77.2500, count: 35, unitType: 'infantry', label: "Pettigrew's Div (Hill) — left of charge" },
          { owner: 2, lat: 39.8088, lng: -77.2498, count: 32, unitType: 'infantry', label: "Fry / Brockenbrough (Pettigrew) — far left" },
          // Trimble's Division (Hill's corps, ~2,000 Carolinians) — second wave
          { owner: 2, lat: 39.8128, lng: -77.2560, count: 30, unitType: 'infantry', label: "Trimble's 2nd wave (Hill) — behind Pettigrew" },
          // Wilcox & Lang (Perry's Florida) — support on right, late
          { owner: 2, lat: 39.8048, lng: -77.2510, count: 28, unitType: 'infantry', label: "Wilcox + Lang (late support, right flank)" },
          // Longstreet's other divisions — holding Seminary Ridge, NOT participating in charge
          { owner: 2, lat: 39.7985, lng: -77.2500, count: 38, unitType: 'infantry', label: "Hood's Div (holding Round Top flank)" },
          { owner: 2, lat: 39.8028, lng: -77.2510, count: 35, unitType: 'infantry', label: "McLaws's Div (holding Peach Orchard)" },
          // Ewell's whole Corps — facing Culp's Hill / Cemetery Hill, NOT sent in to support charge
          { owner: 2, lat: 39.8260, lng: -77.2325, count: 42, unitType: 'infantry', label: "Ewell's Corps (north — no orders to coordinate)" },
          // Stuart's Cavalry — ~4 brigades, attempting to flank Union right rear
          { owner: 2, lat: 39.8255, lng: -77.2160, count: 40, unitType: 'cavalry', label: "Stuart Cavalry (East Cavalry Field — flanking attempt)" },
          // ~170 Confederate guns — fired 2-hour bombardment, now low on ammo
          { owner: 2, lat: 39.8175, lng: -77.2490, count: 32, unitType: 'cannon', label: "Alexander's guns — massive bombardment (low ammo now)" },
          { owner: 2, lat: 39.8105, lng: -77.2480, count: 35, unitType: 'cannon', label: 'Seminary Ridge artillery — center' },
          { owner: 2, lat: 39.8048, lng: -77.2490, count: 28, unitType: 'cannon', label: "Longstreet's south guns" },
          // Commander — Lee on Seminary Ridge watching the assault
          { owner: 2, lat: 39.8145, lng: -77.2460, count: 10, unitType: 'commander', label: "Lee HQ (watching Pickett's Charge)" },
        ],
      },
    },
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
