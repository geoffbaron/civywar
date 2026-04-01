import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYERS } from './BattlefieldMaps';
import { TERRAIN } from './MapData';

export default function MapBackground({ battlefield, tileLayer = 'none', mapStyle = 'vintage', showTacticalOverlay = true, onMapReady, onMapMove }) {
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

    // Add tile layer (optional — default is no tiles, just parchment + terrain)
    if (tileLayer !== 'none') {
      const tileDef = TILE_LAYERS[tileLayer];
      if (tileDef) {
        L.tileLayer(tileDef.url, {
          maxZoom: tileDef.maxZoom,
          attribution: tileDef.attribution,
          keepBuffer: 8,
          updateWhenZooming: false,
          updateWhenIdle: true,
          opacity: tileDef.opacity || 1.0,
        }).addTo(map);
      }
    }

    // ─── Terrain type → display config ───
    // OUR terrain data painted in watercolor style directly on parchment.
    // This IS the map. What you see = what affects gameplay.
    // Warm, saturated watercolor-wash fills with soft organic feel.
    const TERRAIN_STYLES = {
      forest:      { color: '#7a9e55', fillColor: '#8db86a', opacity: 0.65, weight: 0.4, icon: '🌲', label: 'Woods' },
      hill:        { color: '#c4a65a', fillColor: '#d8be78', opacity: 0.50, weight: 0.4, icon: '⛰', label: 'High Ground' },
      sunken_road: { color: '#a08048', fillColor: '#c0a060', opacity: 0.50, weight: 1.5, icon: '🛤', label: 'Sunken Road' },
      river:       { color: '#5a98c0', fillColor: '#78b8e0', opacity: 0.70, weight: 0.6, icon: '🌊', label: 'River' },
      creek:       { color: '#68a8c8', fillColor: '#88c8e8', opacity: 0.60, weight: 0.4, icon: '💧', label: 'Creek' },
      marsh:       { color: '#7aaa80', fillColor: '#98c8a0', opacity: 0.45, weight: 0.3, icon: '🏚', label: 'Marsh' },
      wheat:       { color: '#d0b848', fillColor: '#e8d468', opacity: 0.45, weight: 0.3, icon: '🌾', label: 'Wheat Field' },
      orchard:     { color: '#80a858', fillColor: '#9cc870', opacity: 0.55, weight: 0.4, icon: '🍎', label: 'Orchard' },
      road:        { color: '#b09868', fillColor: '#c8b888', opacity: 0.35, weight: 1.2, icon: '🛣', label: 'Road' },
      bridge:      { color: '#a08848', fillColor: '#c0a868', opacity: 0.50, weight: 1.5, icon: '🌉', label: 'Bridge' },
      building:    { color: '#907868', fillColor: '#a89888', opacity: 0.60, weight: 0.8, icon: '🏠', label: 'Building' },
      fence_stone: { color: '#887868', fillColor: '#a09888', opacity: 0.35, weight: 1.8, dash: '5,3', icon: '🧱', label: 'Stone Wall' },
      fence_wood:  { color: '#a09070', fillColor: '#b8a888', opacity: 0.25, weight: 1.2, dash: '4,4', icon: '🪵', label: 'Fence' },
      trench:      { color: '#887048', fillColor: '#a89060', opacity: 0.40, weight: 1.0, icon: '⚒', label: 'Trench' },
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
