import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { 
  Map, MapPin, Compass, Info, AlertTriangle
} from 'lucide-react';

const GeospatialHeatmap = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapRef = useRef(null);
  const leafletMapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // 1. Fetch complaints data
  useEffect(() => {
    const loadCoordinates = async () => {
      try {
        const res = await api.get('/complaints?limit=100');
        const list = res.data.data.complaints.filter(c => c.location?.coordinates);
        setPins(list);
      } catch (err) {
        console.error('Failed to load geospatial pins:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCoordinates();
  }, []);

  // 2. Dynamically load Leaflet assets from CDN (highly reliable, no key required)
  useEffect(() => {
    if (loading || pins.length === 0) return;

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Load Leaflet CSS
    const cssId = 'leaflet-cdn-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.id = cssId;
      document.head.appendChild(link);
    }

    // Load Leaflet JS Script
    const scriptId = 'leaflet-cdn-js';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.id = scriptId;
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => setLeafletLoaded(true));
    }
  }, [loading, pins]);

  // 3. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    if (!leafletMapInstanceRef.current) {
      // Find average center coordinates from database to center map nicely
      let avgLat = 20.5937; // Standard India center fallback
      let avgLng = 78.9629;
      
      if (pins.length > 0) {
        const coords = pins.map(p => p.location.coordinates);
        avgLng = coords.reduce((acc, c) => acc + c[0], 0) / pins.length;
        avgLat = coords.reduce((acc, c) => acc + c[1], 0) / pins.length;
      }

      // Initialize Leaflet Map centered on coordinates
      const map = window.L.map(mapRef.current, {
        center: [avgLat, avgLng],
        zoom: pins.length > 0 ? 11 : 5,
        zoomControl: false, // Position zoom controls nicely
      });

      // Add elegant zoom control on top right
      window.L.control.zoom({ position: 'topright' }).addTo(map);

      // Load stunning premium dark mode tiles (CartoDB Dark Matter)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      leafletMapInstanceRef.current = map;
    }
  }, [leafletLoaded, pins]);

  // 4. Update and Filter Markers dynamically
  useEffect(() => {
    if (!leafletLoaded || !leafletMapInstanceRef.current) return;

    const map = leafletMapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Filter pins
    const filteredPins = pins.filter(p => selectedFilter === 'all' || p.category === selectedFilter);

    if (filteredPins.length === 0) return;

    const markerGroup = [];

    filteredPins.forEach(pin => {
      const [lng, lat] = pin.location.coordinates;

      // Custom marker colors based on priority
      let colorClass = 'marker-indigo'; // Low
      if (pin.priority === 'high') colorClass = 'marker-rose';
      else if (pin.priority === 'medium') colorClass = 'marker-amber';

      // Create a gorgeous custom HTML marker representing a glowing radar hotspot
      const customIcon = window.L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full animate-ping opacity-25 ${colorClass === 'marker-rose' ? 'bg-rose-500' : colorClass === 'marker-amber' ? 'bg-amber-500' : 'bg-indigo-500'}"></div>
            <div class="absolute w-6 h-6 rounded-full blur-[4px] opacity-60 ${colorClass === 'marker-rose' ? 'bg-rose-500' : colorClass === 'marker-amber' ? 'bg-amber-500' : 'bg-indigo-500'}"></div>
            <div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md relative z-10 ${colorClass === 'marker-rose' ? 'bg-rose-600' : colorClass === 'marker-amber' ? 'bg-amber-500' : 'bg-indigo-600'}"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      // Prepare styled popup content
      const priorityBadgeColor = 
        pin.priority === 'high' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
        pin.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
        'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';

      const statusBadgeColor =
        pin.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
        pin.status === 'Under Review' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
        'bg-gray-500/20 text-gray-300 border border-gray-500/30';

      const popupContent = `
        <div style="background-color: #111726; color: #fff; padding: 12px; border-radius: 12px; font-family: sans-serif; min-width: 210px; border: 1px solid #1e2b47; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #fff; border-bottom: 1px solid #1e2b47; padding-bottom: 6px;">${pin.title}</h4>
          <p style="margin: 6px 0; font-size: 11px; color: #9ca3af; line-height: 1.4;">${pin.description}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
            <span class="${priorityBadgeColor}" style="padding: 2px 6px; font-size: 9px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">${pin.priority}</span>
            <span class="${statusBadgeColor}" style="padding: 2px 6px; font-size: 9px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">${pin.status}</span>
            <span style="background-color: #1e293b; color: #cbd5e1; padding: 2px 6px; font-size: 9px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">${pin.category}</span>
          </div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 8px;">Address: ${pin.address}</div>
        </div>
      `;

      // Mount marker onto the Leaflet map instance
      const marker = window.L.marker([lat, lng], { icon: customIcon })
        .bindPopup(popupContent, {
          className: 'custom-leaflet-popup',
          closeButton: false
        })
        .addTo(map);

      markersRef.current.push(marker);
      markerGroup.push([lat, lng]);
    });

    // Auto fit camera view frame to encapsulate matching coordinates
    if (markerGroup.length > 0) {
      if (markerGroup.length === 1) {
        map.setView(markerGroup[0], 14);
      } else {
        map.fitBounds(markerGroup, { padding: [50, 50] });
      }
    }
  }, [leafletLoaded, selectedFilter, pins]);

  const filteredPins = pins.filter(p => selectedFilter === 'all' || p.category === selectedFilter);

  // Helper colors for side coordinates logs
  const getDotColors = (priority) => {
    switch (priority) {
      case 'high':   return { center: 'bg-rose-500' };
      case 'medium': return { center: 'bg-amber-500' };
      default:       return { center: 'bg-indigo-500' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-md bg-[#161d30] skeleton-loading relative overflow-hidden" />
        <div className="h-[450px] rounded-3xl bg-[#161d30] skeleton-loading relative overflow-hidden" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Dynamic injection of Leaflet Custom CSS Overrides */}
      <style>{`
        /* Remove default Leaflet white popup background styles */
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-container {
          background: #0c101b !important;
        }
      `}</style>

      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Geospatial Overlay</h1>
        <p className="text-sm text-gray-400">Live operational Map view plotting all reported civic complaints globally.</p>
      </div>

      {/* Real Map Mounted Status Banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping mt-2 shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-400">Interactive OpenStreetMap (Leaflet) Connected</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            Loaded a stunning <strong className="text-white">Dark Matter tilemap layer</strong>. No Google key restrictions or billing limitations! You can <strong className="text-white">pan, zoom, and click</strong> any marker to explore complaints dynamically.
          </p>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="rounded-2xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Interactive Legend</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { color: 'bg-rose-500', ring: 'ring-rose-500/30', label: 'High Priority (Red Pin)', desc: 'Urgent reports demanding immediate authority prioritization.', text: 'text-rose-400' },
            { color: 'bg-amber-500', ring: 'ring-amber-500/30', label: 'Medium Priority (Amber Pin)', desc: 'Standard reports in pipeline for operational tracking.', text: 'text-amber-400' },
            { color: 'bg-indigo-500', ring: 'ring-indigo-500/30', label: 'Low Priority (Indigo Pin)', desc: 'Minor reports with minimal operational urgency.', text: 'text-indigo-400' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl bg-[#0d1324] border border-[#1e2b47]/50 p-3.5">
              <div className={`mt-0.5 shrink-0 h-4 w-4 rounded-full ${item.color} ring-4 ${item.ring} shadow-lg`} />
              <div>
                <p className={`text-xs font-bold ${item.text}`}>{item.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map + Sidebar Controllers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

        {/* Left: Interactive Tilemap Container */}
        <div className="col-span-1 lg:col-span-3 rounded-3xl border border-[#1e2b47] overflow-hidden relative shadow-2xl h-[520px] bg-[#0c101b]">
          <div ref={mapRef} className="w-full h-full z-0" />

          {/* Compass Badge */}
          <div className="absolute left-6 bottom-6 rounded-2xl bg-[#0b101f]/85 border border-[#1e2b47]/80 p-3 shadow-xl flex items-center gap-2.5 pointer-events-none z-20">
            <Compass className="h-5 w-5 text-indigo-400" />
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">CityFix Geospatial Overlay</span>
          </div>
        </div>

        {/* Right: Controller Panel */}
        <div className="rounded-3xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl h-fit space-y-6">
          <div>
            <h3 className="text-base font-bold text-white font-outfit">Overlay Filter Panel</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Filter reported markers live on map by civic category.</p>
          </div>

          {/* Category Filters */}
          <div className="space-y-3 pt-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Category Filter</label>
            <div className="space-y-1.5">
              {['all', 'pothole', 'garbage', 'drainage', 'water_leakage', 'streetlight', 'other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFilter(cat)}
                  className={`w-full text-left rounded-xl px-3.5 py-2.5 text-xs font-semibold capitalize transition-all duration-150 ${
                    selectedFilter === cat
                      ? 'bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 font-bold'
                      : 'bg-[#0d1324] border border-[#1e2b47]/50 text-gray-500 hover:text-gray-400'
                  }`}
                >
                  {cat === 'all' ? 'Show All Areas' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* GPS Coordinates Log list */}
          <div className="space-y-3.5 pt-4 border-t border-[#1e2b47]/50">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-indigo-400" />
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Live Location Pins</label>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {filteredPins.length === 0 ? (
                <p className="text-[10px] text-gray-600 text-center py-4">No mapped pins in current view</p>
              ) : (
                filteredPins.map(pin => {
                  const colors = getDotColors(pin.priority);
                  return (
                    <div key={pin._id} className="rounded-lg bg-[#0d1324] border border-[#1e2b47]/30 p-2 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors.center}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-white truncate">{pin.title}</p>
                        <p className="text-[9px] text-indigo-400">
                          {pin.location.coordinates[1]?.toFixed(5)}, {pin.location.coordinates[0]?.toFixed(5)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GeospatialHeatmap;
