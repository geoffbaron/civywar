import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_LAYERS } from './BattlefieldMaps';

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
    const tileDef = TILE_LAYERS[tileLayer] || TILE_LAYERS.topo;
    L.tileLayer(tileDef.url, {
      maxZoom: tileDef.maxZoom,
      attribution: tileDef.attribution,
      keepBuffer: 8,
      updateWhenZooming: false,
      updateWhenIdle: true,
    }).addTo(map);

    // Terrain type → display config
    const TERRAIN_STYLES = {
      forest:      { color: '#0a6618', fill: '#1a9930', opacity: 0.6,  weight: 2.5, icon: '🌲', label: 'Woods' },
      hill:        { color: '#9a7040', fill: '#c49a60', opacity: 0.5,  weight: 2.5, dash: '5,3', icon: '⛰', label: 'High Ground' },
      sunken_road: { color: '#8B6914', fill: '#d4a520', opacity: 0.6,  weight: 3,   icon: '🛤', label: 'Sunken Road' },
      river:       { color: '#1540bb', fill: '#2860ee', opacity: 0.7,  weight: 2.5, icon: '🌊', label: 'River' },
      creek:       { color: '#1a50bb', fill: '#3878dd', opacity: 0.65, weight: 2.5, icon: '💧', label: 'Creek' },
      marsh:       { color: '#2a6080', fill: '#4a99bb', opacity: 0.55, weight: 1.5, icon: '🏚', label: 'Marsh' },
      wheat:       { color: '#c8a010', fill: '#eedd40', opacity: 0.5,  weight: 1.5, dash: '3,2', icon: '🌾', label: 'Wheat Field' },
      orchard:     { color: '#5a8825', fill: '#78bb38', opacity: 0.5,  weight: 1.5, icon: '🍎', label: 'Orchard' },
      road:        { color: '#8a7850', fill: '#bba878', opacity: 0.55, weight: 2.5, dash: '6,3', icon: '🛣', label: 'Road' },
      bridge:      { color: '#b0903a', fill: '#e0c870', opacity: 0.75, weight: 3.5, icon: '🌉', label: 'Bridge' },
      building:    { color: '#444',    fill: '#777',    opacity: 0.7,  weight: 2.5, icon: '🏠', label: 'Building' },
      fence_stone: { color: '#707070', fill: '#999',    opacity: 0.6,  weight: 3.5, icon: '🧱', label: 'Stone Wall' },
      fence_wood:  { color: '#7a6a4a', fill: '#988060', opacity: 0.55, weight: 2.5, icon: '🪵', label: 'Fence' },
      trench:      { color: '#4a3a1a', fill: '#6a5530', opacity: 0.6,  weight: 2.5, icon: '⚒', label: 'Trench' },
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

          // Show a centered label for larger features
          layer.bindTooltip(
            `<span class="terrain-tip-icon">${s.icon}</span> <b>${displayLabel}</b><br/><span class="terrain-tip-type">${s.label}</span>`,
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
