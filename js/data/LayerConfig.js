/**
 * LayerConfig.js — Central configuration for all map layers, groups, basemaps, and defaults.
 *
 * Every layer in the Naxos geomorphological web-GIS is defined here with its
 * group membership, GeoJSON filename, geometry type, default visibility,
 * z-index, and complete legend / symbology entries.
 *
 * Other modules (LayerManager, LegendPanel, FilterSidebar, StyleEngine)
 * import from this file exclusively — no symbology data lives elsewhere.
 */

// ---------------------------------------------------------------------------
// Layer groups — display order matches the ArcGIS layout legend
// ---------------------------------------------------------------------------
export const LAYER_GROUPS = [
    { id: 'general',        label: 'Topography',                labelGr: 'Τοπογραφία',              expanded: true  },
    { id: 'lithology',      label: 'Lithology',                 labelGr: 'Λιθολογία',               expanded: true  },
    { id: 'fluvial',        label: 'Fluvial Environment',       labelGr: 'Ποτάμιο Περιβάλλον',      expanded: true  },
    { id: 'karstic',        label: 'Karstic Environment',       labelGr: 'Καρστικό Περιβάλλον',     expanded: true  },
    { id: 'coastal',        label: 'Coastal Environment',       labelGr: 'Παράκτιο Περιβάλλον',     expanded: true  },
    { id: 'aeolian',        label: 'Aeolian Environment',       labelGr: 'Αιολικό Περιβάλλον',      expanded: false },
    { id: 'anthropogenic',  label: 'Anthropogenic Environment', labelGr: 'Ανθρωπογενές Περιβάλλον', expanded: false },
    { id: 'structural',     label: 'Structural',                labelGr: 'Τεκτονικά',               expanded: false },
];

// ---------------------------------------------------------------------------
// Individual layer definitions — keyed by unique layer id
// ---------------------------------------------------------------------------
export const LAYERS = {

    // ===================================================================
    //  GROUP: general (Topography)
    // ===================================================================

    surface_polygon: {
        id: 'surface_polygon',
        file: 'Surface_Polygon.geojson',
        group: 'general',
        label: 'Surface Polygon',
        labelGr: 'Επιφανειακά πολύγωνα',
        geomType: 'polygon',
        visible: true,
        zIndex: 10,
        legendEntries: [
            {
                label: 'Inselberg',
                labelGr: 'Λόφοι μάρτυρες',
                matchField: 'DSC_En',
                matchValues: ['Ιnselberg'],   // note: leading Greek iota in source data
                style: { color: '#000', weight: 1, dashArray: '5,3', fillColor: 'transparent', fillOpacity: 0 },
                patternType: 'hatch-dense',
            },
            {
                label: 'Planation surface',
                labelGr: 'Επιφάνεια επιπέδωσης',
                matchField: 'DSC_En',
                matchValues: ['Planation surface'],
                style: { color: '#000', weight: 0, fillColor: 'transparent', fillOpacity: 0 },
                patternType: 'hatch-horizontal-brown',
            },
            {
                label: 'Landslides',
                labelGr: 'Κατολισθήσεις',
                matchField: 'DSC_En',
                matchValues: ['Landslides'],
                style: { color: '#f00', weight: 0.5, fillColor: 'transparent', fillOpacity: 0 },
                patternType: 'dots-red',
            },
            {
                label: 'Tor',
                labelGr: 'Υπολειμματικοί ογκόλιθοι',
                matchField: 'DSC_En',
                matchValues: ['Tor'],
                style: { color: '#4e4e4e', weight: 0.5, fillColor: 'transparent', fillOpacity: 0 },
                patternIcon: 'pattern_tor.png',
            },
            {
                label: 'Tafoni',
                labelGr: 'Κυψελοειδείς μορφες αποσάθρωσης',
                matchField: 'DSC_En',
                matchValues: ['Tafoni'],
                style: { color: '#6e6e6e', weight: 0, fillColor: 'transparent', fillOpacity: 0 },
                patternIcon: 'pattern_tafoni.png',
            },
            {
                label: 'Core stones',
                labelGr: 'Σφαιροειδείς μορφές αποφλίωσης',
                matchField: 'DSC_En',
                matchValues: ['Core stones'],
                style: { color: '#000', weight: 0, fillColor: 'transparent', fillOpacity: 0 },
                patternType: 'dots-black',
            },
        ],
    },

    contours_100m: {
        id: 'contours_100m',
        file: 'Contours_100m.geojson',
        group: 'general',
        label: 'Contours 100 m',
        labelGr: 'Ισοϋψείς 100 μ',
        geomType: 'line',
        visible: true,
        zIndex: 5,
        legendEntries: [
            {
                label: 'Contours 100 m',
                labelGr: 'Ισοϋψείς 100 μ',
                lineWidth: 0.8,
                style: { color: '#4e4e4e', weight: 0.8 },
            },
        ],
    },

    contours_50m: {
        id: 'contours_50m',
        file: 'Contours_50m.geojson',
        group: 'general',
        label: 'Contours 50 m',
        labelGr: 'Ισοϋψείς 50 μ',
        geomType: 'line',
        visible: true,
        zIndex: 4,
        minZoom: 13,
        legendEntries: [
            {
                label: 'Contours 50 m',
                labelGr: 'Ισοϋψείς 50 μ',
                lineWidth: 0.5,
                style: { color: '#c7fccb', weight: 0.5 },
            },
        ],
    },

    hogbacks: {
        id: 'hogbacks',
        file: 'hogbacks.geojson',
        group: 'general',
        label: 'Hogback',
        labelGr: 'Αμφικλινής ράχη',
        geomType: 'line',
        visible: true,
        zIndex: 25,
        legendEntries: [
            {
                label: 'Hogback',
                labelGr: 'Αμφικλινής ράχη',
                symbolIcon: 'rocky_coast_pattern.png',
                lineWidth: 2,
                style: { color: '#000', weight: 2 },
            },
        ],
    },

    landmarks: {
        id: 'landmarks',
        file: 'Landmarks_EN.geojson',
        group: 'general',
        label: 'Place names',
        labelGr: 'Τοπωνύμια',
        geomType: 'point',
        visible: true,
        zIndex: 100,
        legendEntries: [
            {
                label: 'Place names',
                labelGr: 'Τοπωνύμια',
                fontSize: 12,
                // Text labels only — no symbol icon
            },
        ],
    },

    // ===================================================================
    //  GROUP: lithology
    // ===================================================================

    lithology: {
        id: 'lithology',
        file: 'Lithology.geojson',
        group: 'lithology',
        label: 'Lithology',
        labelGr: 'Λιθολογία',
        geomType: 'polygon',
        visible: true,
        zIndex: 1,
        legendEntries: [
            {
                label: 'Migmatite',
                labelGr: 'Μιγματίτης',
                matchField: 'Name_Eng',
                matchValues: ['Migmatite'],
                style: { color: '#6e6e6e', weight: 0.5, fillColor: '#ff7f7f', fillOpacity: 0.7 },
            },
            {
                label: 'Marbles-Schists',
                labelGr: 'Μάρμαρα-Σχιστόλιθοι',
                matchField: 'Name_Eng',
                matchValues: ['Marbles-Schists'],
                style: { color: '#6e6e6e', weight: 0.5, fillColor: '#d7c29e', fillOpacity: 0.7 },
            },
            {
                label: 'Granodiorite',
                labelGr: 'Γρανοδιορίτης',
                matchField: 'Name_Eng',
                matchValues: ['Granodiorite'],
                style: { color: '#6e6e6e', weight: 0.5, fillColor: '#ffdeff', fillOpacity: 0.7 },
            },
            {
                label: 'Neogene',
                labelGr: 'Νεογενή',
                matchField: 'Name_Eng',
                matchValues: ['Neogene'],
                style: { color: '#6e6e6e', weight: 0.5, fillColor: '#fef294', fillOpacity: 0.7 },
            },
            {
                label: 'Alluvium',
                labelGr: 'Αλλούβια',
                matchField: 'Name_Eng',
                matchValues: ['Alluvium'],
                style: { color: '#6e6e6e', weight: 0.5, fillColor: '#ffffc2', fillOpacity: 0.7 },
            },
        ],
    },

    // ===================================================================
    //  GROUP: fluvial (Fluvial Environment)
    // ===================================================================

    fluvial_polygon: {
        id: 'fluvial_polygon',
        file: 'other fluvial landforms.geojson',
        group: 'fluvial',
        label: 'Fluvial landforms',
        labelGr: 'Ποτάμιες γεωμορφές',
        geomType: 'polygon',
        visible: true,
        zIndex: 12,
        legendEntries: [
            {
                label: 'Alluvial fan',
                labelGr: 'Αλλουβιακό ριπίδιο',
                matchField: 'DSC_En',
                matchValues: ['Alluvial fan / Alluvial cone', 'Alluvial fan/ Alluvial cone'],
                style: { color: '#ffa77f', weight: 0.5, fillColor: '#ffffbe', fillOpacity: 0.6 },
            },
            {
                label: 'Alluvial plain',
                labelGr: 'Αλλουβιακή πεδιάδα',
                matchField: 'DSC_En',
                matchValues: ['Alluvial plain'],
                style: { color: '#000', weight: 0, fillColor: 'transparent', fillOpacity: 0 },
                patternType: 'dots-orange',
            },
            {
                label: 'Colluvium / Debris cone / Scree / Talus',
                labelGr: 'Κολλούβια / Κώνοι κορημάτων',
                matchField: 'DSC_En',
                matchValues: ['Colluvium/ Debris cone/ Scee/ Talus', 'Colluvium / Debris cone / Scree / Talus'],
                style: { color: '#000', weight: 0, fillColor: 'transparent', fillOpacity: 0 },
                patternIcon: 'colluvium_pattern.png',
            },
            {
                label: 'Travertine terrace',
                labelGr: 'Τραβερτινική αναβαθμίδα',
                matchField: 'DSC_En',
                matchValues: ['Traventine Terraces', 'Traventine terrace'],
                style: { color: '#6e6e6e', weight: 0.5, fillColor: '#ccebff', fillOpacity: 0.5 },
                patternType: 'crosshatch',
            },
        ],
    },

    valleys: {
        id: 'valleys',
        file: 'valleys.geojson',
        group: 'fluvial',
        label: 'Valleys',
        labelGr: 'Κοιλάδες',
        geomType: 'line',
        visible: true,
        zIndex: 20,
        legendEntries: [
            {
                label: 'V-shaped valley',
                labelGr: 'Κοιλάδα τύπου V',
                matchField: 'DSC_En',
                matchValues: ['V shaped valley', 'V-shaped valley'],
                symbolIcon: 'v_valley_marker.png',
                lineWidth: 1,
                style: { color: '#000', weight: 1 },
            },
            {
                label: 'Gorge / Gully',
                labelGr: 'Φαράγγι / Χαράδρωση',
                matchField: 'DSC_En',
                matchValues: ['Gorge/ Gully', 'Gorge / Gully'],
                symbolIcon: 'gorge_gully.png',
                lineWidth: 1.5,
                style: { color: '#000', weight: 1.5 },
            },
        ],
    },

    waterfalls: {
        id: 'waterfalls',
        file: 'waterfalls.geojson',
        group: 'fluvial',
        label: 'Waterfall',
        labelGr: 'Καταρράκτης',
        geomType: 'point',
        visible: true,
        zIndex: 65,
        legendEntries: [
            {
                label: 'Waterfall',
                labelGr: 'Καταρράκτης',
                symbolIcon: 'waterfall.png',
                symbolSize: 10,
            },
        ],
    },

    // ===================================================================
    //  GROUP: karstic (Karstic Environment)
    // ===================================================================

    karstic_points: {
        id: 'karstic_points',
        file: 'Small-scale karstic landforms.geojson',
        group: 'karstic',
        label: 'Karstic landforms (small-scale)',
        labelGr: 'Καρστικές γεωμορφές (μικρής κλίμακας)',
        geomType: 'point',
        visible: true,
        zIndex: 55,
        legendEntries: [
            {
                label: 'Spring',
                labelGr: 'Πηγή',
                matchField: 'DSC_En',
                matchValues: ['Spring', 'Spring font'],
                symbolIcon: 'spring.png',
                symbolSize: 8,
            },
            {
                label: 'Cave',
                labelGr: 'Σπήλαιο',
                matchField: 'DSC_En',
                matchValues: ['Cave'],
                symbolIcon: 'cave.png',
                symbolSize: 30,
            },
            {
                label: 'Cave shelter',
                labelGr: 'Βραχοσκεπή',
                matchField: 'DSC_En',
                matchValues: ['Cave shelter'],
                symbolIcon: 'cave_fill.png',
                symbolSize: 30,
            },
        ],
    },

    karst_polygon: {
        id: 'karst_polygon',
        file: 'Large-scale karstic areas.geojson',
        group: 'karstic',
        label: 'Karstic areas (large-scale)',
        labelGr: 'Καρστικές περιοχές (μεγάλης κλίμακας)',
        geomType: 'polygon',
        visible: true,
        zIndex: 11,
        legendEntries: [
            {
                label: 'Karren field',
                labelGr: 'Πεδίο γλυφών',
                matchField: 'DSC_En',
                matchValues: ['Karren', 'Karren field'],
                style: { color: '#000', weight: 0.5, fillColor: 'transparent', fillOpacity: 0 },
                patternType: 'karren-glyphs',
            },
            {
                label: 'Hum',
                labelGr: 'Καρστικός λόφος-μάρτυρας',
                matchField: 'DSC_En',
                matchValues: ['Hum'],
                style: { color: '#4e4e4e', weight: 0.5, fillColor: 'transparent', fillOpacity: 0 },
                patternIcon: 'pattern_hum.png',
            },
        ],
    },

    lakes: {
        id: 'lakes',
        file: 'Lakes.geojson',
        group: 'karstic',
        label: 'Marsh',
        labelGr: 'Έλος',
        geomType: 'polygon',
        visible: true,
        zIndex: 14,
        legendEntries: [
            {
                label: 'Marsh',
                labelGr: 'Έλος',
                matchField: 'DSC_En',
                matchValues: ['Marsh'],
                style: { color: '#000', weight: 0.4, fillColor: '#fff', fillOpacity: 0.8 },
                patternType: 'marsh',
            },
        ],
    },

    // ===================================================================
    //  GROUP: coastal (Coastal Environment)
    // ===================================================================

    coastal_points: {
        id: 'coastal_points',
        file: 'coastal erosional landforms.geojson',
        group: 'coastal',
        label: 'Coastal erosional landforms',
        labelGr: 'Παράκτιες γεωμορφές διάβρωσης',
        geomType: 'point',
        visible: true,
        zIndex: 70,
        legendEntries: [
            {
                label: 'Tidal notch',
                labelGr: 'Παλιρροιακή εγκοπή',
                matchField: 'DSC_En',
                matchValues: ['Notch', 'Double Notch', 'Tidal notch'],
                symbolIcon: 'tidal_notch.png',
                symbolSize: 19,
            },
            {
                label: 'Coastal cave',
                labelGr: 'Παράκτιο σπήλαιο',
                matchField: 'DSC_En',
                matchValues: ['Coastal cave'],
                symbolIcon: 'cave.png',
                symbolSize: 24,
            },
            {
                label: 'Marmite',
                labelGr: 'Μαρμίτα',
                matchField: 'DSC_En',
                matchValues: ['Marmite'],
                symbolIcon: 'marmite.png',
                symbolSize: 8,
            },
            {
                label: 'Sea arch',
                labelGr: 'Θαλάσσια αψίδα',
                matchField: 'DSC_En',
                matchValues: ['Sea Arch', 'Sea arch'],
                symbolIcon: 'sea_arch.png',
                symbolSize: 19,
            },
            {
                label: 'Sea stack',
                labelGr: 'Θαλάσσιος στύλος',
                matchField: 'DSC_En',
                matchValues: ['Stack', 'Sea stack'],
                symbolIcon: 'sea_stack.png',
                symbolSize: 12,
            },
            {
                label: 'Stump',
                labelGr: 'Θαλάσσιος υπολειμματικός στύλος',
                matchField: 'DSC_En',
                matchValues: ['Stump'],
                symbolIcon: 'stump.png',
                symbolSize: 8,
            },
        ],
    },

    coastline_char: {
        id: 'coastline_char',
        file: 'coastline characterization.geojson',
        group: 'coastal',
        label: 'Coastline characterization',
        labelGr: 'Χαρακτηρισμός ακτογραμμής',
        geomType: 'line',
        visible: true,
        zIndex: 22,
        legendEntries: [
            {
                label: 'Sandy coast',
                labelGr: 'Αμμώδης ακτή',
                matchField: 'DSC_En',
                matchValues: ['Sand Beach', 'Sandy coast'],
                lineWidth: 2.5,
                style: { color: '#a87000', weight: 2.5 },
            },
            {
                label: 'Rocky coast',
                labelGr: 'Βραχώδης ακτή',
                matchField: 'DSC_En',
                matchValues: ['Rocky Beach', 'Rocky coast'],
                lineWidth: 2.5,
                style: { color: '#9c9c9c', weight: 2.5 },
            },
            {
                label: 'Beachrock',
                labelGr: 'Ακτόλιθος',
                matchField: 'DSC_En',
                matchValues: ['Beachrock'],
                lineWidth: 2,
                style: { color: '#686868', weight: 2, dashArray: '8,4' },
            },
        ],
    },

    polygonal_coastal: {
        id: 'polygonal_coastal',
        file: 'polygonal coastal areas.geojson',
        group: 'coastal',
        label: 'Polygonal coastal areas',
        labelGr: 'Πολυγωνικές παράκτιες περιοχές',
        geomType: 'polygon',
        visible: true,
        zIndex: 13,
        legendEntries: [
            {
                label: 'Abrasion platform',
                labelGr: 'Πλατφόρμα απόξεσης',
                matchField: 'DSC_En',
                matchValues: ['Coastal platforms/ Abrasion platforms', 'Abrasion platform'],
                style: { color: '#000', weight: 0.5, fillColor: '#fefabc', fillOpacity: 0.6 },
                patternType: 'hatch-horizontal',
            },
            {
                label: 'Lagoon',
                labelGr: 'Λιμνοθάλασσα',
                matchField: 'DSC_En',
                matchValues: ['Lagoon'],
                style: { color: '#000', weight: 0.4, fillColor: '#00c5ff', fillOpacity: 0.6 },
            },
            {
                label: 'Tombolo',
                labelGr: 'Τόμπολο',
                matchField: 'DSC_En',
                matchValues: ['Tombolo'],
                style: { color: 'transparent', weight: 0, fillColor: '#fefabc', fillOpacity: 0.6 },
                patternIcon: 'pattern_tombolo_dot.png',
            },
            {
                label: 'Submerged tombolo',
                labelGr: 'Βυθισμένο τόμπολο',
                matchField: 'DSC_En',
                matchValues: ['Submerged tombolo'],
                style: { color: '#000', weight: 0.5, dashArray: '5,3', fillColor: '#fefabc', fillOpacity: 0.6 },
                patternIcon: 'pattern_tombolo_dot.png',
            },
        ],
    },

    // ===================================================================
    //  GROUP: aeolian (Aeolian Environment)
    // ===================================================================

    surface_points: {
        id: 'surface_points',
        file: 'muschroom rocks.geojson',
        group: 'aeolian',
        label: 'Mushroom rock',
        labelGr: 'Βράχος μορφής μανιταριού',
        geomType: 'point',
        visible: true,
        zIndex: 60,
        legendEntries: [
            {
                label: 'Mushroom rock',
                labelGr: 'Βράχος μορφής μανιταριού',
                symbolIcon: 'mushroom_rock.png',
                symbolSize: 19,
            },
        ],
    },

    sand_dunes: {
        id: 'sand_dunes',
        file: 'sand_dunes.geojson',
        group: 'aeolian',
        label: 'Coastal sand dunes',
        labelGr: 'Παράκτιες αμμοθίνες',
        geomType: 'polygon',
        visible: true,
        zIndex: 13,
        legendEntries: [
            {
                label: 'Coastal sand dunes',
                labelGr: 'Παράκτιες αμμοθίνες',
                matchField: 'DSC_En',
                matchValues: ['Coastal sand dunes'],
                style: { color: '#000', weight: 0.5, fillColor: 'transparent', fillOpacity: 0 },
                patternIcon: 'pattern_sand_dunes.png',
            },
        ],
    },

    // ===================================================================
    //  GROUP: anthropogenic (Anthropogenic Environment)
    // ===================================================================

    manmade_polygon: {
        id: 'manmade_polygon',
        file: 'Man_Made_lakes.geojson',
        group: 'anthropogenic',
        label: 'Man-made water bodies',
        labelGr: 'Ανθρωπογενή υδάτινα σώματα',
        geomType: 'polygon',
        visible: true,
        zIndex: 15,
        legendEntries: [
            {
                label: 'Dam',
                labelGr: 'Φράγμα',
                matchField: 'DSC_En',
                matchValues: ['Dam'],
                style: { color: '#9c9c9c', weight: 0.5, fillColor: '#ccdede', fillOpacity: 0.7 },
            },
            {
                label: 'Artificial lake',
                labelGr: 'Τεχνητή λίμνη',
                matchField: 'DSC_En',
                matchValues: ['Artificial Lake', 'Artificial lake'],
                style: { color: '#000', weight: 0.5, fillColor: '#335999', fillOpacity: 0.7 },
            },
        ],
    },

    man_made_forms: {
        id: 'man_made_forms',
        file: 'Man_Made_Forms.geojson',
        group: 'anthropogenic',
        label: 'Man-made forms',
        labelGr: 'Ανθρωπογενείς μορφές',
        geomType: 'point',
        visible: true,
        zIndex: 50,
        legendEntries: [
            {
                label: 'Port / Marina / Fishing shelter / Mole',
                labelGr: 'Λιμάνι / Μαρίνα / Αλιευτικό καταφύγιο / Μώλος',
                matchField: 'DSC_En',
                matchValues: [
                    'Port / Marine / Fishing shelter / Mole (sea wall)',
                    'Port/ Marine/ Fishing shelter/ Mole (sea wall)',
                ],
                symbolIcon: 'port.png',
                symbolSize: 18,
            },
            {
                label: 'Man-made terrace',
                labelGr: 'Αναβαθμός',
                matchField: 'DSC_En',
                matchValues: ['Man-made terraces', 'Man-made terrace'],
                symbolIcon: 'man_made_terrace.png',
                symbolSize: 7,
            },
            {
                label: 'Rainwater tank',
                labelGr: 'Υδροσυλλέκτης',
                matchField: 'DSC_En',
                matchValues: ['Rainwater tank'],
                symbolIcon: 'rainwater_tank.png',
                symbolSize: 7,
            },
            {
                label: 'Mine',
                labelGr: 'Ορυχείο',
                matchField: 'DSC_En',
                matchValues: ['Mine'],
                symbolIcon: 'mine.png',
                symbolSize: 24,
            },
            {
                label: 'Quarry',
                labelGr: 'Λατομείο',
                matchField: 'DSC_En',
                matchValues: ['Quarry'],
                symbolIcon: 'quarry.png',
                symbolSize: 18,
            },
            {
                label: 'Ancient quarry',
                labelGr: 'Αρχαίο λατομείο',
                matchField: 'DSC_En',
                matchValues: ['Ancient quarry'],
                symbolIcon: 'quarry.png',
                symbolSize: 18,
            },
        ],
    },

    // ===================================================================
    //  GROUP: structural
    // ===================================================================

    faults: {
        id: 'faults',
        file: 'Faults.geojson',
        group: 'structural',
        label: 'Faults',
        labelGr: 'Ρήγματα',
        geomType: 'line',
        visible: true,
        zIndex: 30,
        legendEntries: [
            {
                label: 'Faults',
                labelGr: 'Ρήγματα',
                lineWidth: 1.5,
                style: { color: '#e60000', weight: 1.5 },
            },
        ],
    },

    // ===================================================================
    //  Utility / base layers (not shown in legend groups)
    // ===================================================================

    perimeter: {
        id: 'perimeter',
        file: 'Perimeter_Naxos20210226.geojson',
        group: null,
        label: 'Perimeter',
        labelGr: 'Περίμετρος',
        geomType: 'polygon',
        visible: true,
        zIndex: 2,
        legendEntries: [
            {
                label: 'Perimeter',
                labelGr: 'Περίμετρος',
                style: { color: '#0100cc', weight: 1, fillColor: 'transparent', fillOpacity: 0 },
            },
        ],
    },

    coastline: {
        id: 'coastline',
        file: 'coastline.geojson',
        group: null,
        label: 'Coastline',
        labelGr: 'Ακτογραμμή',
        geomType: 'polygon',
        visible: true,
        zIndex: 3,
        legendEntries: [
            {
                label: 'Coastline',
                labelGr: 'Ακτογραμμή',
                style: { color: '#0100cc', weight: 0.5, fillColor: 'transparent', fillOpacity: 0 },
            },
        ],
    },

    primary_roads: {
        id: 'primary_roads',
        file: 'primary roads.geojson',
        group: null,
        label: 'Primary roads',
        labelGr: 'Κύριοι δρόμοι',
        geomType: 'line',
        visible: true,
        zIndex: 35,
        legendEntries: [
            {
                label: 'Primary roads',
                labelGr: 'Κύριοι δρόμοι',
                lineWidth: 2,
                style: { color: '#b9b7b9', weight: 2 },
            },
        ],
    },
};

// ---------------------------------------------------------------------------
// Basemap options
// ---------------------------------------------------------------------------
export const BASEMAP_OPTIONS = [
    {
        id: 'osm',
        label: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    },
    {
        id: 'topo',
        label: 'Topographic',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenTopoMap',
        maxZoom: 17,
    },
    {
        id: 'satellite',
        label: 'Satellite (ESRI)',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 19,
        default: true,
    },
    {
        id: 'light',
        label: 'Light Gray',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB',
        maxZoom: 20,
    },
    {
        id: 'dark',
        label: 'Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB',
        maxZoom: 20,
    },
];

// ---------------------------------------------------------------------------
// Map defaults
// ---------------------------------------------------------------------------
export const MAP_DEFAULTS = {
    center: [37.08, 25.50],   // Naxos centre
    zoom: 12,
    minZoom: 10,
    maxZoom: 19,
    referenceZoom: 12,  // Symbol sizes are defined at this zoom level
};

// ---------------------------------------------------------------------------
// Convenience: combined default export
// ---------------------------------------------------------------------------
const LAYER_CONFIG = {
    groups: LAYER_GROUPS,
    layers: LAYERS,
    basemapOptions: BASEMAP_OPTIONS,
    mapDefaults: MAP_DEFAULTS,
};

export default LAYER_CONFIG;
