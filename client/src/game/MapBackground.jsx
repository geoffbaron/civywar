import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYERS } from './BattlefieldMaps';
import { TERRAIN } from './MapData';

// ─── SVG pattern definitions injected into Leaflet's SVG renderer ───
function injectPatternsIntoMap(map) {
  // Find Leaflet's SVG overlay pane
  const svgEl = map.getPane('overlayPane')?.querySelector('svg');
  if (!svgEl || svgEl.querySelector('#pat-forest')) return;
  
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <!-- Forest: small tree-like canopy dots -->
    <pattern id="pat-forest" width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="#5b7a3a"/>
      <circle cx="3" cy="3" r="1.8" fill="#4a6830" opacity="0.7"/>
      <circle cx="9" cy="9" r="2.0" fill="#3d5a28" opacity="0.6"/>
      <circle cx="9" cy="3" r="1.2" fill="#527230" opacity="0.5"/>
      <circle cx="3" cy="9" r="1.4" fill="#4a6830" opacity="0.5"/>
    </pattern>
    <!-- Hill: fine diagonal hachure lines -->
    <pattern id="pat-hill" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="6" height="6" fill="#c8b078"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="#a08850" stroke-width="0.8" opacity="0.5"/>
    </pattern>
    <!-- Water (river): wavy horizontal lines -->
    <pattern id="pat-river" width="16" height="8" patternUnits="userSpaceOnUse">
      <rect width="16" height="8" fill="#6a9ec0"/>
      <path d="M0,4 Q4,2 8,4 Q12,6 16,4" stroke="#5088aa" stroke-width="0.8" fill="none" opacity="0.6"/>
    </pattern>
    <!-- Creek: lighter wavy lines -->
    <pattern id="pat-creek" width="12" height="6" patternUnits="userSpaceOnUse">
      <rect width="12" height="6" fill="#7ab0c8"/>
      <path d="M0,3 Q3,1.5 6,3 Q9,4.5 12,3" stroke="#6098b0" stroke-width="0.6" fill="none" opacity="0.5"/>
    </pattern>
    <!-- Marsh: horizontal dashes for wetland -->
    <pattern id="pat-marsh" width="10" height="6" patternUnits="userSpaceOnUse">
      <rect width="10" height="6" fill="#8aaa88"/>
      <line x1="1" y1="2" x2="4" y2="2" stroke="#6a8a68" stroke-width="0.6" opacity="0.6"/>
      <line x1="6" y1="5" x2="9" y2="5" stroke="#6a8a68" stroke-width="0.6" opacity="0.6"/>
    </pattern>
    <!-- Orchard: grid of small dots -->
    <pattern id="pat-orchard" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#7a9a58"/>
      <circle cx="4" cy="4" r="1.2" fill="#5a7a3a" opacity="0.6"/>
    </pattern>
    <!-- Wheat: fine horizontal lines -->
    <pattern id="pat-wheat" width="8" height="4" patternUnits="userSpaceOnUse">
      <rect width="8" height="4" fill="#d4c880"/>
      <line x1="0" y1="2" x2="8" y2="2" stroke="#baa860" stroke-width="0.5" opacity="0.4"/>
    </pattern>
  `;
  svgEl.insertBefore(defs, svgEl.firstChild);
}

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

    // Add tile layer
    const tileDef = TILE_LAYERS[tileLayer] || TILE_LAYERS.parchment;
    L.tileLayer(tileDef.url, {
      maxZoom: tileDef.maxZoom,
      attribution: tileDef.attribution,
      keepBuffer: 8,
      updateWhenZooming: false,
      updateWhenIdle: true,
    }).addTo(map);

    // Terrain type → display config
    // Styled for clarity: terrain IS the primary visual. Players must see what affects them.
    // Inspired by Civil War era hand-drawn military maps.
    const TERRAIN_STYLES = {
      forest:      { color: '#4a6830', fill: 'url(#pat-forest)', fillColor: '#5b7a3a', opacity: 0.85, weight: 1.2, icon: '🌲', label: 'Woods' },
      hill:        { color: '#9a7a48', fill: 'url(#pat-hill)',   fillColor: '#c8b078', opacity: 0.7,  weight: 1.5, icon: '⛰', label: 'High Ground' },
      sunken_road: { color: '#8a7040', fill: null,               fillColor: '#b8a060', opacity: 0.6,  weight: 2.0, icon: '🛤', label: 'Sunken Road' },
      river:       { color: '#4878a0', fill: 'url(#pat-river)',  fillColor: '#6a9ec0', opacity: 0.8,  weight: 1.5, icon: '🌊', label: 'River' },
      creek:       { color: '#5090a8', fill: 'url(#pat-creek)',  fillColor: '#7ab0c8', opacity: 0.75, weight: 1.0, icon: '💧', label: 'Creek' },
      marsh:       { color: '#6a8a68', fill: 'url(#pat-marsh)',  fillColor: '#8aaa88', opacity: 0.6,  weight: 0.8, icon: '🏚', label: 'Marsh' },
      wheat:       { color: '#b0a050', fill: 'url(#pat-wheat)',  fillColor: '#d4c880', opacity: 0.55, weight: 0.8, icon: '🌾', label: 'Wheat Field' },
      orchard:     { color: '#5a7a3a', fill: 'url(#pat-orchard)',fillColor: '#7a9a58', opacity: 0.7,  weight: 1.0, icon: '🍎', label: 'Orchard' },
      road:        { color: '#8a7858', fill: null,               fillColor: '#b8a078', opacity: 0.5,  weight: 2.0, icon: '🛣', label: 'Road' },
      bridge:      { color: '#7a6840', fill: null,               fillColor: '#c0a868', opacity: 0.65, weight: 2.0, icon: '🌉', label: 'Bridge' },
      building:    { color: '#6a5848', fill: null,               fillColor: '#8a7060', opacity: 0.75, weight: 1.5, icon: '🏠', label: 'Building' },
      fence_stone: { color: '#706858', fill: null,               fillColor: '#908070', opacity: 0.5,  weight: 2.0, dash: '4,2', icon: '🧱', label: 'Stone Wall' },
      fence_wood:  { color: '#8a7858', fill: null,               fillColor: '#a09070', opacity: 0.35, weight: 1.5, dash: '3,3', icon: '🪵', label: 'Fence' },
      trench:      { color: '#6a5838', fill: null,               fillColor: '#907850', opacity: 0.55, weight: 1.5, icon: '⚒', label: 'Trench' },
    };

    // Initialize an empty tactical terrain overlay layer
    geoJsonLayerRef.current = L.geoJSON(null, {
        style: (feature) => {
          const type = feature.properties.type;
          const s = TERRAIN_STYLES[type] || { color: '#ccc', fillColor: '#ccc', opacity: 0.15, weight: 2 };
          return {
            color: s.color,
            fillColor: s.fillColor,
            fillOpacity: s.opacity,
            weight: s.weight,
            dashArray: s.dash || null,
          };
        },
        onEachFeature: (feature, layer) => {
          const type = feature.properties.type;
          const s = TERRAIN_STYLES[type];
          if (!s) return;

          // Apply SVG pattern fill directly on the path element after it renders
          if (s.fill) {
            layer.on('add', () => {
              const el = layer.getElement && layer.getElement();
              if (el) {
                el.setAttribute('fill', s.fill);
                el.style.fillOpacity = s.opacity;
              }
            });
          }

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

        }
      });
      
      if (showTacticalOverlay) {
        geoJsonLayerRef.current.addTo(map);
        // Inject SVG pattern defs into Leaflet's SVG renderer
        injectPatternsIntoMap(map);
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
        injectPatternsIntoMap(mapInstance);
      }
    } else {
      if (mapInstance.hasLayer(geoJsonLayerRef.current)) {
        mapInstance.removeLayer(geoJsonLayerRef.current);
      }
    }
  }, [showTacticalOverlay, mapInstance]);

  const filterStyles = {
    vintage: { filter: 'sepia(0.25) saturate(0.8) brightness(1.0) contrast(1.02)' },
    warm: { filter: 'sepia(0.15) saturate(0.85) brightness(1.02)' },
    parchment: { filter: 'sepia(0.45) saturate(0.55) brightness(0.95) contrast(1.05)' },
    natural: { filter: 'none' },
    dark: { filter: 'sepia(0.3) saturate(0.5) brightness(0.7) contrast(1.2)' },
  };

  return (
    <div
      ref={containerRef}
      className="map-background"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 0,
        ...(filterStyles[mapStyle] || filterStyles.vintage),
      }}
    />

  );
}
