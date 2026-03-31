const https = require('https');
const fs = require('fs');

const query = `
[out:json];
way["waterway"](39.45,-77.76,39.49,-77.71);
out geom;
way["highway"](39.45,-77.76,39.49,-77.71);
out geom;
`;

const options = {
  hostname: 'overpass-api.de',
  port: 443,
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': query.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const names = new Set();
      json.elements.forEach(el => {
        if (el.tags && el.tags.name) names.add(el.tags.name);
      });
      console.log("Found names:", Array.from(names).join(', '));
      
      const creek = json.elements.filter(el => el.tags && el.tags.name && el.tags.name.includes("Antietam Creek"));
      console.log(`Found ${creek.length} Antietam Creek segments`);
      
      if (creek.length > 0) {
         let points = [];
         creek.forEach(c => {
           if (c.geometry) {
             c.geometry.forEach(g => points.push([g.lon, g.lat]));
           }
         });
         fs.writeFileSync('/tmp/creek_real.json', JSON.stringify(points, null, 2));
      }

      const turnpike = json.elements.filter(el => el.tags && (el.tags.name === "Sharpsburg Pike" || el.tags.ref === "MD 65"));
      if (turnpike.length > 0) {
         let points = [];
         turnpike.forEach(c => {
           if (c.geometry) {
             c.geometry.forEach(g => points.push([g.lon, g.lat]));
           }
         });
         fs.writeFileSync('/tmp/turnpike_real.json', JSON.stringify(points, null, 2));
      }

    } catch(e) { console.error("Parse error:", e); }
  });
});

req.on('error', (e) => console.error(e));
req.write(query);
req.end();
