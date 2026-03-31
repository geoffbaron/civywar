import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const TraceTool = ({ map }) => {
  const [points, setPoints] = useState([]);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const onGlobalClick = (e) => {
      if (!map.getContainer().contains(e.target)) return;
      
      const latlng = map.mouseEventToLatLng(e);
      const newPoints = [...points, [latlng.lng, latlng.lat]];
      setPoints(newPoints);
      
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(newPoints.map(p => [p[1], p[0]]));
      } else {
        polylineRef.current = L.polyline(newPoints.map(p => [p[1], p[0]]), { color: '#00ffff', weight: 4, opacity: 0.8 }).addTo(map);
      }
    };

    window.addEventListener('click', onGlobalClick, true);
    return () => {
      window.removeEventListener('click', onGlobalClick, true);
      if (polylineRef.current) polylineRef.current.remove();
    };
  }, [map, points]);

  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10000, background: 'rgba(0,0,0,0.85)', color: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #00ffff', width: '220px', pointerEvents: 'auto' }}>
      <div style={{ fontWeight: 'bold', color: '#00ffff', marginBottom: '10px' }}>🗺️ TERRAIN TRACER</div>
      <div id="trace-data-export" style={{ display: 'none' }}>{JSON.stringify(points)}</div>
      <div style={{ fontSize: '11px', maxHeight: '120px', overflowY: 'auto', background: '#222', padding: '5px', marginBottom: '10px' }}>
        {points.length > 0 ? points.map((p, i) => <div key={i}>{i}: {p[0].toFixed(5)}, {p[1].toFixed(5)}</div>) : "Click map to trace..."}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={(e) => { e.stopPropagation(); console.log("TRACE_DATA:", JSON.stringify(points)); setPoints([]); }} style={{ flex: '1 1 45%', background: '#2b5e2b', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Log & Reset</button>
        <button onClick={(e) => { e.stopPropagation(); setPoints([]); if (polylineRef.current) polylineRef.current.remove(); polylineRef.current = null; }} style={{ flex: '1 1 45%', background: '#5e2b2b', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
        <button onClick={(e) => { 
          e.stopPropagation();
          const latlng = map.getCenter();
          setPoints(prev => [...prev, [latlng.lng, latlng.lat]]);
        }} style={{ flex: '1 1 100%', background: '#444', color: '#0ff', border: '1px solid #0ff', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Add Center Point (Test)</button>
      </div>
    </div>
  );
};

export default TraceTool;
