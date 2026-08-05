// ═══════════════════════════════════════════════════════════════
//  CIVY WAR — Map Data (Antietam-inspired battlefield)
//  Terrain features defined as vector geometry for both
//  rendering and gameplay queries.
// ═══════════════════════════════════════════════════════════════

export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1000;

// ─── Terrain type definitions (gameplay stats) ───
//
//  defense    — how much the ground shelters the men standing in it. Values
//               are anchored on the period rule of thumb that a good field
//               work was worth three or four attackers to one defender, and
//               that a stone wall (Fredericksburg, the Angle) was the next
//               best thing to one.
//  offense    — how well a unit can deliver its own fire from that ground.
//               Timber and standing corn broke up formations and hid the
//               target; both cost far more in volume of fire than they gave
//               back in cover.
//  blocksSight— how thoroughly the feature interrupts a sightline drawn
//               across it (0 = transparent, 1 = opaque). Woods, buildings
//               and intervening ridges are what made Civil War armies blind.
export const TERRAIN = {
  grass:       { speed: 1.0,  defense: 1.0,  offense: 1.0,  passable: true,  blocksSight: 0,    label: 'Open Field' },
  // Standing corn hid a man completely but he could not see to shoot either —
  // Miller's Cornfield changed hands at ranges of a few dozen yards.
  wheat:       { speed: 0.85, defense: 1.15, offense: 0.85, passable: true,  blocksSight: 0.45, label: 'Wheat Field' },
  // The pike moved troops fast, and caught them in column when it mattered.
  road:        { speed: 1.4,  defense: 0.8,  offense: 1.0,  passable: true,  blocksSight: 0,    label: 'Road' },
  forest:      { speed: 0.45, defense: 1.9,  offense: 0.65, passable: true,  blocksSight: 1,    label: 'Woods' },
  orchard:     { speed: 0.7,  defense: 1.25, offense: 0.85, passable: true,  blocksSight: 0.5,  label: 'Orchard' },
  // A crest gives observation and lets guns command the ground below — and
  // masks whatever is on its far slope.
  hill:        { speed: 0.7,  defense: 1.4,  offense: 1.3,  passable: true,  blocksSight: 0.8,  label: 'High Ground' },
  creek:       { speed: 0.25, defense: 0.6,  offense: 0.6,  passable: true,  blocksSight: 0,    label: 'Creek' },
  river:       { speed: 0.12, defense: 0.4,  offense: 0.4,  passable: false, blocksSight: 0,    label: 'River' },
  marsh:       { speed: 0.3,  defense: 0.8,  offense: 0.7,  passable: true,  blocksSight: 0.2,  label: 'Marsh' },
  fence_wood:  { speed: 0.7,  defense: 1.35, offense: 1.0,  passable: true,  blocksSight: 0.1,  label: 'Wood Fence' },
  fence_stone: { speed: 0.55, defense: 2.1,  offense: 1.0,  passable: true,  blocksSight: 0.2,  label: 'Stone Wall' },
  building:    { speed: 0.2,  defense: 2.3,  offense: 0.8,  passable: true,  blocksSight: 1,    label: 'Building' },
  // Prepared earthworks — by 1864 both armies dug in within hours of halting.
  trench:      { speed: 0.5,  defense: 2.6,  offense: 0.95, passable: true,  blocksSight: 0.3,  label: 'Trench' },
  // Bloody Lane: a ready-made rifle pit, invisible until you were on top of it.
  sunken_road: { speed: 0.55, defense: 2.2,  offense: 1.0,  passable: true,  blocksSight: 0.4,  label: 'Sunken Road' },
  // A bottleneck under fire — Burnside's Bridge cost four hours and 500 men.
  bridge:      { speed: 1.2,  defense: 0.55, offense: 0.8,  passable: true,  blocksSight: 0,    label: 'Bridge' },
};

// ─── Feature geometry ───
// Each feature: { type, shape, ...geometry }
// shape: 'polygon', 'polyline' (with width), 'circle', 'rect', 'bezier' (with width)
// Rendered and queried in array order (later entries override earlier ones)

// ═══════════════════════════════════════════════════════════════
//  GeoJSON terrain features — traced from real Antietam battlefield
//  These polygons define gameplay zones that affect speed, defense,
//  offense, and range. Coordinates are [lng, lat] per GeoJSON spec.
//  The GameEngine queries these via point-in-polygon on every frame.
// ═══════════════════════════════════════════════════════════════
export const ANTIETAM_TERRAIN = {
  type: "FeatureCollection",
  features: [
    // ════════════════════════════════════════════════════════
    //  ANTIETAM CREEK — the central obstacle of the battle
    //  Traced as a wide polygon following the creek's real path
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "creek", label: "Antietam Creek (North)" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7420, 39.4800],
        [-77.7400, 39.4750],
        [-77.7410, 39.4700],
        [-77.7390, 39.4650],
        
        [-77.7380, 39.4650],
        [-77.7400, 39.4700],
        [-77.7390, 39.4750],
        [-77.7410, 39.4800]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "creek", label: "Antietam Creek (South)" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7355, 39.4670], [-77.7360, 39.4650], [-77.7358, 39.4630],
        [-77.7352, 39.4610], [-77.7345, 39.4595], [-77.7340, 39.4580],
        [-77.7338, 39.4560],
        // Return path (east bank)
        [-77.7328, 39.4560], [-77.7330, 39.4580], [-77.7335, 39.4595],
        [-77.7342, 39.4610], [-77.7348, 39.4630], [-77.7350, 39.4650],
        [-77.7345, 39.4670], [-77.7355, 39.4670]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  BRIDGES — fast crossing points over the creek
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "bridge", label: "Upper Bridge" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7345, 39.4808], [-77.7315, 39.4808],
        [-77.7315, 39.4800], [-77.7345, 39.4800], [-77.7345, 39.4808]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "bridge", label: "Middle Bridge" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7350, 39.4718], [-77.7320, 39.4718],
        [-77.7320, 39.4710], [-77.7350, 39.4710], [-77.7350, 39.4718]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "bridge", label: "Burnside's Bridge" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7355, 39.4598], [-77.7325, 39.4598],
        [-77.7325, 39.4588], [-77.7355, 39.4588], [-77.7355, 39.4598]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  FORESTS — dense cover, slow movement, high defense
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "forest", label: "West Woods" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7520, 39.4780], [-77.7480, 39.4785], [-77.7460, 39.4775],
        [-77.7455, 39.4750], [-77.7458, 39.4725], [-77.7470, 39.4710],
        [-77.7500, 39.4705], [-77.7530, 39.4715], [-77.7535, 39.4740],
        [-77.7530, 39.4765], [-77.7520, 39.4780]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "forest", label: "East Woods" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7400, 39.4810], [-77.7370, 39.4815], [-77.7350, 39.4805],
        [-77.7345, 39.4785], [-77.7350, 39.4770], [-77.7375, 39.4760],
        [-77.7400, 39.4765], [-77.7415, 39.4780], [-77.7410, 39.4800],
        [-77.7400, 39.4810]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "forest", label: "North Woods" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7510, 39.4830], [-77.7475, 39.4835], [-77.7455, 39.4825],
        [-77.7450, 39.4810], [-77.7460, 39.4795], [-77.7490, 39.4790],
        [-77.7515, 39.4800], [-77.7520, 39.4815], [-77.7510, 39.4830]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "forest", label: "Piper Farm Woods" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7480, 39.4680], [-77.7450, 39.4685], [-77.7435, 39.4670],
        [-77.7440, 39.4650], [-77.7465, 39.4645], [-77.7485, 39.4660],
        [-77.7480, 39.4680]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "forest", label: "South Woods" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7420, 39.4620], [-77.7390, 39.4625], [-77.7375, 39.4610],
        [-77.7380, 39.4590], [-77.7405, 39.4585], [-77.7425, 39.4600],
        [-77.7420, 39.4620]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  WHEAT / CORNFIELD — Miller's Cornfield, iconic killing ground
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "wheat", label: "The Cornfield" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7475, 39.4810], [-77.7435, 39.4810], [-77.7420, 39.4800],
        [-77.7420, 39.4780], [-77.7435, 39.4770], [-77.7475, 39.4770],
        [-77.7490, 39.4780], [-77.7490, 39.4800], [-77.7475, 39.4810]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  SUNKEN ROAD (Bloody Lane) — devastating defensive position
    //  Traced as a narrow polygon following the actual lane
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "sunken_road", label: "Bloody Lane" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7460, 39.4718], [-77.7440, 39.4710], [-77.7420, 39.4705],
        [-77.7400, 39.4700], [-77.7380, 39.4698], [-77.7360, 39.4695],
        // Return path (south side of lane)
        [-77.7360, 39.4690], [-77.7380, 39.4693], [-77.7400, 39.4695],
        [-77.7420, 39.4700], [-77.7440, 39.4705], [-77.7460, 39.4713],
        [-77.7460, 39.4718]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  ROADS — faster movement corridors
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "road", label: "Hagerstown Turnpike" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7478, 39.4850], [-77.7482, 39.4820], [-77.7488, 39.4790],
        [-77.7492, 39.4760], [-77.7495, 39.4730], [-77.7498, 39.4700],
        [-77.7500, 39.4670], [-77.7502, 39.4640],
        // Return (west side)
        [-77.7508, 39.4640], [-77.7506, 39.4670], [-77.7504, 39.4700],
        [-77.7501, 39.4730], [-77.7498, 39.4760], [-77.7494, 39.4790],
        [-77.7488, 39.4820], [-77.7484, 39.4850], [-77.7478, 39.4850]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "road", label: "Boonsboro Turnpike" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7500, 39.4660], [-77.7480, 39.4658], [-77.7460, 39.4655],
        [-77.7440, 39.4652], [-77.7420, 39.4650], [-77.7400, 39.4650],
        [-77.7380, 39.4652], [-77.7360, 39.4655], [-77.7340, 39.4660],
        // Return (south side)
        [-77.7340, 39.4655], [-77.7360, 39.4650], [-77.7380, 39.4647],
        [-77.7400, 39.4645], [-77.7420, 39.4645], [-77.7440, 39.4647],
        [-77.7460, 39.4650], [-77.7480, 39.4653], [-77.7500, 39.4655],
        [-77.7500, 39.4660]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "road", label: "Smoketown Road" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7430, 39.4810], [-77.7410, 39.4800], [-77.7390, 39.4785],
        [-77.7370, 39.4770], [-77.7355, 39.4755], [-77.7340, 39.4740],
        // Return
        [-77.7335, 39.4743], [-77.7350, 39.4758], [-77.7365, 39.4773],
        [-77.7385, 39.4788], [-77.7405, 39.4803], [-77.7425, 39.4813],
        [-77.7430, 39.4810]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  STONE WALLS & FENCES — defensive positions
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "fence_stone", label: "Stone Wall (Cornfield)" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7490, 39.4772], [-77.7420, 39.4772],
        [-77.7420, 39.4768], [-77.7490, 39.4768], [-77.7490, 39.4772]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "fence_stone", label: "Cemetery Wall" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7475, 39.4645], [-77.7445, 39.4645],
        [-77.7445, 39.4641], [-77.7475, 39.4641], [-77.7475, 39.4645]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  BUILDINGS — strong defensive anchors
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "building", label: "Dunker Church" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7478, 39.4728], [-77.7468, 39.4728],
        [-77.7468, 39.4720], [-77.7478, 39.4720], [-77.7478, 39.4728]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "building", label: "Piper Farmhouse" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7448, 39.4688], [-77.7438, 39.4688],
        [-77.7438, 39.4680], [-77.7448, 39.4680], [-77.7448, 39.4688]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "building", label: "Roulette Farm" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7418, 39.4728], [-77.7408, 39.4728],
        [-77.7408, 39.4720], [-77.7418, 39.4720], [-77.7418, 39.4728]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "building", label: "Sharpsburg (town)" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7520, 39.4665], [-77.7490, 39.4668], [-77.7475, 39.4660],
        [-77.7475, 39.4640], [-77.7490, 39.4632], [-77.7520, 39.4635],
        [-77.7530, 39.4645], [-77.7528, 39.4660], [-77.7520, 39.4665]
      ]]}
    },

    // ════════════════════════════════════════════════════════
    //  HIGH GROUND — artillery advantage
    // ════════════════════════════════════════════════════════
    {
      type: "Feature",
      properties: { type: "hill", label: "Nicodemus Heights" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7560, 39.4820], [-77.7535, 39.4825], [-77.7520, 39.4810],
        [-77.7525, 39.4790], [-77.7545, 39.4785], [-77.7565, 39.4800],
        [-77.7560, 39.4820]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "hill", label: "Cemetery Hill" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7480, 39.4650], [-77.7460, 39.4652], [-77.7445, 39.4645],
        [-77.7448, 39.4630], [-77.7465, 39.4625], [-77.7485, 39.4635],
        [-77.7480, 39.4650]
      ]]}
    },
    {
      type: "Feature",
      properties: { type: "hill", label: "Red Hill" },
      geometry: { type: "Polygon", coordinates: [[
        [-77.7310, 39.4620], [-77.7290, 39.4625], [-77.7275, 39.4612],
        [-77.7280, 39.4595], [-77.7300, 39.4590], [-77.7315, 39.4605],
        [-77.7310, 39.4620]
      ]]}
    },
  ]
};

// ─── Map labels (decorative, no gameplay effect) ───
export const MAP_LABELS = [
  { text: "SHARPSBURG", x: 520, y: 575, size: 14, style: 'town' },
  { text: "West Wood", x: 180, y: 200, size: 10, style: 'terrain' },
  { text: "East Wood", x: 870, y: 180, size: 10, style: 'terrain' },
  { text: "The Cornfield", x: 580, y: 260, size: 9, style: 'terrain' },
  { text: "Sunken Road", x: 600, y: 430, size: 8, style: 'terrain' },
  { text: "Cemetery Ridge", x: 220, y: 420, size: 8, style: 'terrain' },
  { text: "Antietam Creek", x: 1050, y: 320, size: 9, style: 'water', angle: -70 },
  { text: "Hagerstown Pike", x: 460, y: 160, size: 8, style: 'road', angle: -85 },
  { text: "Boonsboro Pike", x: 300, y: 465, size: 8, style: 'road', angle: -3 },
];

// ─── 3 Flags per side, 6 total ───
export const FORTS = [
  // Union (north) — positions behind the battle line
  { id: 'u1', x: 200,  y: 30,  owner: 1, garrison: 30, rate: 2.0, label: 'I Corps (Hooker)' },
  { id: 'u2', x: 760,  y: 20,  owner: 1, garrison: 40, rate: 2.5, label: 'II Corps (Sumner)' },
  { id: 'u3', x: 1350, y: 40,  owner: 1, garrison: 30, rate: 2.0, label: 'IX Corps (Burnside)' },

  // Confederate (south)
  { id: 'c1', x: 200,  y: 960, owner: 2, garrison: 25, rate: 1.8, label: 'Jackson' },
  { id: 'c2', x: 700,  y: 975, owner: 2, garrison: 35, rate: 2.2, label: 'Lee HQ' },
  { id: 'c3', x: 1300, y: 960, owner: 2, garrison: 25, rate: 1.8, label: 'Toombs' },
];

// ─── Pre-positioned battle lines ───
export const STARTING_UNITS = [
  // === UNION (north, y~180-230) ===
  // Infantry center
  { owner: 1, x: 400,  y: 220, count: 55, unitType: 'infantry' },
  { owner: 1, x: 560,  y: 210, count: 55, unitType: 'infantry' },
  { owner: 1, x: 720,  y: 200, count: 60, unitType: 'infantry' },
  { owner: 1, x: 880,  y: 210, count: 55, unitType: 'infantry' },
  { owner: 1, x: 1040, y: 220, count: 50, unitType: 'infantry' },
  // Cavalry on flanks
  { owner: 1, x: 140,  y: 190, count: 35, unitType: 'cavalry' },
  { owner: 1, x: 1350, y: 180, count: 35, unitType: 'cavalry' },
  // Artillery behind the line
  { owner: 1, x: 520,  y: 110, count: 20, unitType: 'cannon' },
  { owner: 1, x: 800,  y: 90,  count: 25, unitType: 'cannon' },
  { owner: 1, x: 1100, y: 110, count: 20, unitType: 'cannon' },
  // Commander
  { owner: 1, x: 760,  y: 60,  count: 10, unitType: 'commander' },

  // === CONFEDERATE (south, y~770-820) ===
  // Infantry center
  { owner: 2, x: 400,  y: 780, count: 50, unitType: 'infantry' },
  { owner: 2, x: 560,  y: 790, count: 50, unitType: 'infantry' },
  { owner: 2, x: 720,  y: 800, count: 60, unitType: 'infantry' },
  { owner: 2, x: 880,  y: 790, count: 50, unitType: 'infantry' },
  { owner: 2, x: 1040, y: 780, count: 45, unitType: 'infantry' },
  // Cavalry on flanks
  { owner: 2, x: 140,  y: 810, count: 30, unitType: 'cavalry' },
  { owner: 2, x: 1350, y: 820, count: 30, unitType: 'cavalry' },
  // Artillery behind the line
  { owner: 2, x: 500,  y: 880, count: 18, unitType: 'cannon' },
  { owner: 2, x: 780,  y: 900, count: 22, unitType: 'cannon' },
  { owner: 2, x: 1060, y: 880, count: 18, unitType: 'cannon' },
  // Commander
  { owner: 2, x: 700,  y: 940, count: 10, unitType: 'commander' },
];
