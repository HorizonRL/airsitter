# AirSitter (web)

Pick the best airplane seat: which side gets the sunrise/sunset, which countries and how much water you'll see,
a seat-to-window map for 16 aircraft, and a simulated view from any seat.

```
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # static site in dist/ — host it anywhere (GitHub Pages, Netlify, any web server)
```

Everything runs in the browser. Flight routes come from a built-in list of well-known flights, then the free
adsbdb.com API. Country borders: Natural Earth 1:110m (public domain), served from `public/countries.tsv`.

**3-D views.** “Sit here” opens a walk-in 360° cabin (three.js) built from the seat map — real window positions,
seats, bins and the wing outside — and an Earth view (CesiumJS + Esri World Imagery) that shows the real surface
and sun lighting from the aircraft's position at any point of the flight. Paste your own Google Maps Platform key
in the Earth view to switch to Google Photorealistic 3D Tiles, or use “Google Earth” to open the same view there.
