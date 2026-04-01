import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYERS } from './BattlefieldMaps';
import { TERRAIN } from './MapData';

// ─── Inject SVG pattern definitions into the Leaflet SVG renderer ───
// These patterns emulate hand-drawn historical military map styling:
// tree shapes for forests, hachure marks for hills, etc.
function injectTerrainPatterns(svgEl) {
  if (svgEl.querySelector('.terrain-patterns')) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.setAttribute('class', 'terrain-patterns');
  defs.innerHTML = `
    <pattern id="pat-forest" width="18" height="22" patternUnits="userSpaceOnUse">
      <rect width="18" height="22" fill="#1a4a12" fill-opacity="0.22"/>
      <polygon points="5,1 1,10 9,10" fill="#0e3508" fill-opacity="0.7"/>
      <polygon points="5,3.5 2.5,10 7.5,10" fill="#16450e" fill-opacity="0.5"/>
      <rect x="4" y="10" width="2" height="2.5" fill="#3a2008" fill-opacity="0.45"/>
      <polygon points="14,7 10,16 18,16" fill="#0e3508" fill-opacity="0.6"/>
      <polygon points="14,9.5 11.5,16 16.5,16" fill="#16450e" fill-opacity="0.4"/>
      <rect x="13" y="16" width="2" height="2.5" fill="#3a2008" fill-opacity="0.4"/>
    </pattern>
    <pattern id="pat-hill" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(50)">
      <rect width="8" height="8" fill="#c4a060" fill-opacity="0.15"/>
      <line x1="0" y1="0" x2="0" y2="8" stroke="#7a5a28" stroke-width="1.5" stroke-opacity="0.4"/>
    </pattern>
    <pattern id="pat-marsh" width="20" height="8" patternUnits="userSpaceOnUse">
      <rect width="20" height="8" fill="#5a9ab0" fill-opacity="0.08"/>
      <path d="M0,4 Q5,1 10,4 Q15,7 20,4" fill="none" stroke="#2a7080" stroke-width="1.2" stroke-opacity="0.4"/>
    </pattern>
    <pattern id="pat-orchard" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="14" fill="#4a7820" fill-opacity="0.1"/>
      <circle cx="7" cy="7" r="3" fill="#3a6818" fill-opacity="0.45" stroke="#2a5010" stroke-width="0.5" stroke-opacity="0.3"/>
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

    // Terrain type → display config (historical military map aesthetic)
    const TERRAIN_STYLES = {
      forest:      { color: '#1a4a10', fill: '#1a4a10', opacity: 0.35, weight: 1.5, icon: '🌲', label: 'Woods' },
      hill:        { color: '#8a6a30', fill: '#c4a060', opacity: 0.3,  weight: 2,   dash: '5,3', icon: '⛰', label: 'High Ground' },
      sunken_road: { color: '#6a4a0a', fill: '#b08a30', opacity: 0.5,  weight: 3,   icon: '🛤', label: 'Sunken Road' },
      river:       { color: '#1a6a70', fill: '#2a8a88', opacity: 0.55, weight: 3,   icon: '🌊', label: 'River' },
      creek:       { color: '#1a6a70', fill: '#3a9a90', opacity: 0.45, weight: 2.5, icon: '💧', label: 'Creek' },
      marsh:       { color: '#2a7080', fill: '#4a99bb', opacity: 0.3,  weight: 1.5, icon: '🏚', label: 'Marsh' },
      wheat:       { color: '#a08a20', fill: '#d8c040', opacity: 0.25, weight: 1,   dash: '3,2', icon: '🌾', label: 'Wheat Field' },
      orchard:     { color: '#3a6a20', fill: '#5a8830', opacity: 0.3,  weight: 1.5, icon: '🍎', label: 'Orchard' },
      road:        { color: '#5a4830', fill: '#8a7858', opacity: 0.25, weight: 2,   icon: '🛣', label: 'Road' },
      bridge:      { color: '#8a6a20', fill: '#c0a050', opacity: 0.65, weight: 3,   icon: '🌉', label: 'Bridge' },
      building:    { color: '#3a3a3a', fill: '#5a5a5a', opacity: 0.75, weight: 2.5, icon: '🏠', label: 'Building' },
      fence_stone: { color: '#5a5a5a', fill: '#888',    opacity: 0.35, weight: 3,   dash: '4,2', icon: '🧱', label: 'Stone Wall' },
      fence_wood:  { color: '#6a5a38', fill: '#8a7858', opacity: 0.3,  weight: 2,   dash: '3,3', icon: '🪵', label: 'Fence' },
      trench:      { color: '#3a2a0a', fill: '#5a4520', opacity: 0.55, weight: 2.5, icon: '⚒', label: 'Trench' },
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
      className="map-background"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 0,
        ...(isHistorical ? { background: '#e0cca0' } : {}),
        ...(filterStyles[isHistorical ? 'historical' : mapStyle] || filterStyles.vintage),
      }}
    />

  );
}
