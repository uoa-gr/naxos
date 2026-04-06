# Naxos Geomorphological Map — WebGIS

Interactive web mapping application presenting the **Geomorphological Map of Naxos Island** at a scale of 1:50,000.

A scientific cartographic project by the **National and Kapodistrian University of Athens (N.K.U.A.)** and the **Hellenic Survey of Geology & Mineral Exploration (H.S.G.M.E. / E.A.G.M.E.)**.

Διαδραστικός γεωμορφολογικός χάρτης της Νάξου σε κλίμακα 1:50.000.

---

## Features

- 25 vector layers (coastal, fluvial, karstic, surface, anthropogenic, structural, geological)
- Faithful symbology reproduction from ArcGIS Pro CIM definitions
- Scale-dependent symbol sizing
- Bilingual interface (English / Greek)
- Dual collapsible sidebars (filters + legend / project info)
- 5 basemaps (OSM, OpenTopoMap, ESRI Satellite, Carto Light/Dark)
- Mobile-first responsive layout
- Feature search, click-to-inspect, hover tooltips
- Reference inset maps (Naxos location in Greece, geological overview)

## Stack

- **Frontend:** vanilla ES6 modules, Leaflet 1.9.4
- **Data:** Supabase Storage (private bucket, RLS-protected) with local fallback
- **Hosting:** Vercel
- **PWA-ready:** web manifest, installable on mobile

## Local development

```bash
# Clone
git clone https://github.com/uoa-gr/naxos.git
cd naxos

# Copy the example config and add real Supabase credentials
cp config.example.js config.js
# Edit config.js with your SUPABASE_URL and SUPABASE_ANON_KEY

# Serve locally (any static server)
python -m http.server 8080
# or:  npx serve .

# Open http://localhost:8080
```

> ⚠️ ES modules require an HTTP server — opening `index.html` directly via `file://` will not work.

## Deployment

Deployed to Vercel automatically on push to `main`. Supabase credentials are injected via repository secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

See `.github/workflows/deploy.yml`.

## Project structure

```
naxos/
├── index.html              # Main HTML, dual-sidebar layout
├── styles.css              # All styling
├── config.example.js       # Supabase config template
├── vercel.json             # Vercel routing & headers
├── site.webmanifest        # PWA manifest
├── data/                   # 25 GeoJSON layers (WGS84)
├── assets/
│   ├── symbols/            # Geomorphological symbol PNGs
│   └── images/             # Logos, insets
└── js/
    ├── main.js             # App orchestrator
    ├── core/               # EventBus, StateManager, CacheManager
    ├── data/               # DataManager, LayerConfig
    ├── map/                # MapManager, LayerManager, SvgPatterns
    ├── ui/                 # Sidebars, legend, modals, controls
    └── utils/              # Helpers
```

## Scientific Team

- Dr. Dr. MSc Niki Evelpidou (Professor, N.K.U.A.)
- Dr. Irene Zananiri (H.S.G.M.E.)
- MSc Alexandra Zervakou (H.S.G.M.E.)
- Dr. Giannis Saitis (N.K.U.A.)
- MSc Evangelos Spyrou (N.K.U.A.)

**Publication year:** 2025

**Reference System:** EGSA'87 / WGS'84

## License

© 2025 N.K.U.A. & H.S.G.M.E. All rights reserved.
