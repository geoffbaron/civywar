import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYERS } from './BattlefieldMaps';
import { TERRAIN } from './MapData';

// ─── Inject SVG pattern definitions into the Leaflet SVG renderer ───
// These patterns emulate hand-drawn historical military map styling —
// rounded tree canopy blobs, organic hill shading, wavy marsh lines.
function injectTerrainPatterns(svgEl) {
  if (svgEl.querySelector('.terrain-patterns')) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.setAttribute('class', 'terrain-patterns');
  defs.innerHTML = `
    <pattern id="pat-forest" width="28" height="26" patternUnits="userSpaceOnUse">
      <rect width="28" height="26" fill="#8a9a60" fill-opacity="0.25"/>
      <!-- Rounded canopy blobs like hand-drawn period maps -->
      <ellipse cx="7" cy="8" rx="6.5" ry="5.5" fill="#5a6a38" fill-opacity="0.6"/>
      <ellipse cx="7" cy="8" rx="4" ry="3.5" fill="#6a7a44" fill-opacity="0.4"/>
      <ellipse cx="6" cy="6" rx="2.5" ry="2" fill="#7a8a50" fill-opacity="0.3"/>
      <ellipse cx="22" cy="17" rx="6" ry="5" fill="#4e5e30" fill-opacity="0.55"/>
      <ellipse cx="22" cy="17" rx="3.5" ry="3" fill="#647842" fill-opacity="0.35"/>
      <ellipse cx="21" cy="15.5" rx="2" ry="1.5" fill="#7a8a50" fill-opacity="0.25"/>
      <!-- Shadow underneath canopies -->
      <ellipse cx="7" cy="12" rx="5" ry="1.5" fill="#2a3a10" fill-opacity="0.2"/>
      <ellipse cx="22" cy="21" rx="4.5" ry="1.5" fill="#2a3a10" fill-opacity="0.18"/>
    </pattern>
    <pattern id="pat-hill" width="20" height="12" patternUnits="userSpaceOnUse">
      <rect width="20" height="12" fill="#b09860" fill-opacity="0.12"/>
      <!-- Organic hill shading — soft arcs like contour lines -->
      <path d="M0,8 Q5,3 10,8 Q15,3 20,8" fill="none" stroke="#7a6030" stroke-width="0.8" stroke-opacity="0.3"/>
      <path d="M3,11 Q8,6 13,11 Q18,6 23,11" fill="none" stroke="#7a6030" stroke-width="0.6" stroke-opacity="0.2"/>
      <path d="M-2,4 Q3,0 8,4 Q13,-1 18,4" fill="none" stroke="#8a7040" stroke-width="0.5" stroke-opacity="0.15"/>
    </pattern>
    <pattern id="pat-marsh" width="24" height="10" patternUnits="userSpaceOnUse">
      <rect width="24" height="10" fill="#7a9a80" fill-opacity="0.08"/>
      <path d="M0,5 Q6,2 12,5 Q18,8 24,5" fill="none" stroke="#4a7a60" stroke-width="1" stroke-opacity="0.35"/>
      <line x1="4" y1="7" x2="8" y2="7" stroke="#4a7a60" stroke-width="0.6" stroke-opacity="0.25"/>
      <line x1="16" y1="3" x2="20" y2="3" stroke="#4a7a60" stroke-width="0.6" stroke-opacity="0.25"/>
    </pattern>
    <pattern id="pat-orchard" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="#8a9a58" fill-opacity="0.08"/>
      <circle cx="8" cy="8" r="3.5" fill="#5a6a30" fill-opacity="0.4"/>
      <circle cx="8" cy="7" r="2" fill="#6a7a3a" fill-opacity="0.25"/>
    </pattern>
    <pattern id="pat-wheat" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="#c8b870" fill-opacity="0.15"/>
      <line x1="3" y1="0" x2="3" y2="8" stroke="#a09040" stroke-width="0.5" stroke-opacity="0.2"/>
      <line x1="9" y1="4" x2="9" y2="12" stroke="#a09040" stroke-width="0.5" stroke-opacity="0.2"/>
    </pattern>
  `;
  svgEl.prepend(defs);
}

// Terrain types that use patterned fills instead of solid color
const PATTERN_FILLS = {
  forest: 'pat-forest',
  hill: 'pat-hill',
  marsh: 'pat-marsh',
  orchard: 'pat-orchard',
  wheat: 'pat-wheat',
};

export default function MapBackground({ battlefield, tileLayer = 'topo', mapStyle = 'vintage', showTacticalOverlay = true, onMapReady, onMapMove }) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const geoJsonLayerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !battlefield) return;

    // Create Leaflet map — interactive for pan/zoom
    const map = L.map(containerRef.current, {
      center: battlefield.center,
      zoom: battlefield.zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      touchZoom: true,
      keyboard: false,
      boxZoom: false,
      tap: false,
      fadeAnimation: true,
      zoomAnimation: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      minZoom: Math.max((battlefield.zoom || 14) - 3, 10),
      maxZoom: Math.min((battlefield.zoom || 14) + 4, 19),
    });

    // Add tile layer (skip for historical parchment mode)
    const tileDef = TILE_LAYERS[tileLayer] || TILE_LAYERS.topo;
    if (tileDef.url) {
      L.tileLayer(tileDef.url, {
        maxZoom: tileDef.maxZoom,
        attribution: tileDef.attribution,
        keepBuffer: 8,
        updateWhenZooming: false,
        updateWhenIdle: true,
      }).addTo(map);
    }

    // Terrain type → display config (historical hand-drawn military map aesthetic)
    const TERRAIN_STYLES = {
      forest:      { color: '#4a5a2a', fill: '#5a6a38', opacity: 0.4,  weight: 1.8, icon: '🌲', label: 'Woods' },
      hill:        { color: '#8a7a48', fill: '#b09860', opacity: 0.25, weight: 1.5, icon: '⛰', label: 'High Ground' },
      sunken_road: { color: '#3a3020', fill: '#6a5a30', opacity: 0.55, weight: 2.5, icon: '🛤', label: 'Sunken Road' },
      river:       { color: '#3a8a88', fill: '#5aaba8', opacity: 0.55, weight: 2.5, icon: '🌊', label: 'River' },
      creek:       { color: '#3a8a88', fill: '#6abab0', opacity: 0.4,  weight: 2,   icon: '💧', label: 'Creek' },
      marsh:       { color: '#4a8a70', fill: '#6aaa90', opacity: 0.25, weight: 1.5, icon: '🏚', label: 'Marsh' },
      wheat:       { color: '#9a8a40', fill: '#c8b870', opacity: 0.2,  weight: 0.8, icon: '🌾', label: 'Wheat Field' },
      orchard:     { color: '#4a5a28', fill: '#5a6a30', opacity: 0.3,  weight: 1.2, icon: '🍎', label: 'Orchard' },
      road:        { color: '#2a2218', fill: '#2a2218', opacity: 0.15, weight: 2.5, icon: '🛣', label: 'Road' },
      bridge:      { color: '#3a3020', fill: '#8a7a50', opacity: 0.6,  weight: 2.5, icon: '🌉', label: 'Bridge' },
      building:    { color: '#1a1a1a', fill: '#1a1a1a', opacity: 0.85, weight: 1.5, icon: '🏠', label: 'Building' },
      fence_stone: { color: '#3a3a3a', fill: '#5a5a5a', opacity: 0.25, weight: 2.5, dash: '4,2', icon: '🧱', label: 'Stone Wall' },
      fence_wood:  { color: '#4a3a20', fill: '#6a5a38', opacity: 0.2,  weight: 1.8, dash: '3,3', icon: '🪵', label: 'Fence' },
      trench:      { color: '#2a2010', fill: '#4a3a20', opacity: 0.5,  weight: 2,   icon: '⚒', label: 'Trench' },
    };

    // Initialize an empty tactical terrain overlay layer
    geoJsonLayerRef.current = L.geoJSON(null, {
        style: (feature) => {
          const type = feature.properties.type;
          const s = TERRAIN_STYLES[type] || { color: '#ccc', fill: '#ccc', opacity: 0.15, weight: 2 };
          return {
            color: s.color,
            fillColor: s.fill,
            fillOpacity: s.opacity,
            weight: s.weight,
            dashArray: s.dash || null,
          };
        },
        onEachFeature: (feature, layer) => {
          const type = feature.properties.type;
          const s = TERRAIN_STYLES[type];
          if (!s) return;

          // Persistent label on the polygon (not just tooltip)
          const name = feature.properties.label || s.label;
          const displayLabel = feature.properties.label && !feature.properties.label.includes('(')
            ? feature.properties.label
            : s.label;

          // Build bonus/minus lines from gameplay stats
          const t = TERRAIN[type];
          let statsHtml = '';
          if (t) {
            const lines = [];
            if (t.speed !== 1.0) lines.push(`<span class="tt-${t.speed > 1 ? 'buff' : 'nerf'}">Speed ${t.speed > 1 ? '+' : ''}${Math.round((t.speed - 1) * 100)}%</span>`);
            if (t.defense !== 1.0) lines.push(`<span class="tt-${t.defense > 1 ? 'buff' : 'nerf'}">Defense ${t.defense > 1 ? '+' : ''}${Math.round((t.defense - 1) * 100)}%</span>`);
            if (t.offense !== 1.0) lines.push(`<span class="tt-${t.offense > 1 ? 'buff' : 'nerf'}">Offense ${t.offense > 1 ? '+' : ''}${Math.round((t.offense - 1) * 100)}%</span>`);
            if (!t.passable) lines.push('<span class="tt-nerf">Impassable</span>');
            if (lines.length) statsHtml = `<div class="tt-stats">${lines.join(' &middot; ')}</div>`;
          }

          layer.bindTooltip(
            `<span class="terrain-tip-icon">${s.icon}</span> <b>${displayLabel}</b>${statsHtml}`,
            {
              className: 'terrain-tooltip',
              permanent: false,
              direction: 'top',
              opacity: 0.95,
            }
          );

          // Apply SVG pattern fills for organic terrain types (forests, hills, etc.)
          const patId = PATTERN_FILLS[type];
          if (patId) {
            layer.on('add', () => {
              const el = layer.getElement?.();
              if (!el) return;
              const svg = el.ownerSVGElement;
              if (svg) injectTerrainPatterns(svg);
              el.style.fill = `url(#${patId})`;
              el.style.fillOpacity = '1';
            });
          }
        }
      });
      
      if (showTacticalOverlay) {
        geoJsonLayerRef.current.addTo(map);
      }

    setMapInstance(map);

    let isActive = true;
    requestAnimationFrame(() => {
      if (!isActive) return;
      map.invalidateSize();
      map.fitBounds(battlefield.bounds, { padding: [0, 0] });

      requestAnimationFrame(() => {
        if (!isActive) return;
        map.invalidateSize();

        const refZoom = map.getZoom();
        const refCenter = map.getCenter();
        const refPixelOrigin = map.getPixelOrigin().clone();
        const size = map.getSize();

        const latLngToPixel = (lat, lng) => {
          const point = map.latLngToContainerPoint([lat, lng]);
          return { x: point.x, y: point.y };
        };
        const pixelToLatLng = (x, y) => {
          const latlng = map.containerPointToLatLng([x, y]);
          return { lat: latlng.lat, lng: latlng.lng };
        };

        if (onMapReady && size.x > 0 && size.y > 0) {
          onMapReady({
            latLngToPixel, pixelToLatLng,
            width: size.x, height: size.y,
            map,
            refZoom, refCenter, refPixelOrigin,
          });
        }

        map.on('moveend zoomend', () => {
          if (onMapMove) onMapMove();
        });
      });
    });

    return () => {
      isActive = false;
      // Clear projections before destroying map so engine doesn't call dead map
      if (onMapReady) {
        onMapReady({ latLngToPixel: null, pixelToLatLng: null, width: 0, height: 0, map: null, refZoom: 16, refCenter: { lat: 0, lng: 0 }, refPixelOrigin: { x: 0, y: 0 } });
      }
      map.remove();
      setMapInstance(null);
    };
  }, [battlefield?.name, tileLayer]); // only recreate on major battle switch or tilelayer switch

  // Update GeoJSON when terrain array changes (for live calibration)
  useEffect(() => {
    if (geoJsonLayerRef.current && battlefield?.geoTerrain) {
      geoJsonLayerRef.current.clearLayers();
      geoJsonLayerRef.current.addData(battlefield.geoTerrain);
    }
  }, [battlefield?.geoTerrain]);

  // Handle toggling of the tactical overlay separately
  useEffect(() => {
    if (!mapInstance || !geoJsonLayerRef.current) return;
    
    if (showTacticalOverlay) {
      if (!mapInstance.hasLayer(geoJsonLayerRef.current)) {
        geoJsonLayerRef.current.addTo(mapInstance);
      }
    } else {
      if (mapInstance.hasLayer(geoJsonLayerRef.current)) {
        mapInstance.removeLayer(geoJsonLayerRef.current);
      }
    }
  }, [showTacticalOverlay, mapInstance]);

  const filterStyles = {
    vintage: { filter: 'sepia(0.5) saturate(0.6) brightness(0.95) contrast(1.05)' },
    warm: { filter: 'sepia(0.35) saturate(0.7) brightness(1.0)' },
    parchment: { filter: 'sepia(0.7) saturate(0.4) brightness(0.9) contrast(1.1)' },
    historical: { filter: 'sepia(0.6) saturate(0.35) brightness(0.95) contrast(1.05)' },
    natural: { filter: 'none' },
    dark: { filter: 'sepia(0.3) saturate(0.5) brightness(0.7) contrast(1.2)' },
  };

  // Historical tile layer uses a parchment background instead of tiles
  const isHistorical = tileLayer === 'historical';

  return (
    <div
      ref={containerRef}
      className={`map-background${isHistorical ? ' map-parchment' : ''}`}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 0,
        ...(filterStyles[isHistorical ? 'historical' : mapStyle] || filterStyles.vintage),
      }}
    />

  );
}
