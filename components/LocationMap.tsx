'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  timings?: string;
  doctors?: string[];
}

interface LocationMapProps {
  locations: LocationItem[];
}

export default function LocationMap({ locations }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = (await import('leaflet')).default;

      if (!isMounted) return;

      const wardhaLat = 20.7453;
      const wardhaLng = 78.5992;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([wardhaLat, wardhaLng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Custom Hospital Pin Marker
      const hospitalPin = L.divIcon({
        className: 'custom-hospital-marker',
        html: `
          <div style="background-color: #7B1828; color: white; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(123,24,40,0.4); border: 2.5px solid #ffffff;">
            <div style="transform: rotate(45deg); font-size: 16px;">🏥</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      const hospitalLocations =
        locations.length > 0
          ? locations
          : [
              {
                id: 'cortex',
                name: 'Cortex Hospital',
                address: 'Aarti Chowk, Nagpur Road, Wardha - 442001',
                latitude: wardhaLat,
                longitude: wardhaLng,
                phone: '07152-255795 / +91 9373280505',
                timings: '10:00 AM – 1:00 PM & 6:00 PM – 8:00 PM',
              },
            ];

      hospitalLocations.forEach((loc) => {
        const marker = L.marker([loc.latitude, loc.longitude], { icon: hospitalPin }).addTo(map);

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-weight: 700; color: #7B1828; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <span>🏥</span> ${loc.name}
            </div>
            <div style="font-size: 11px; color: #4b5563; margin-bottom: 6px;">
              ${loc.address}
            </div>
            <div style="font-size: 11px; color: #1f2937; margin-bottom: 4px;">
              <strong>⏰ OPD:</strong> ${loc.timings || '10 AM - 1 PM & 6 PM - 8 PM'}
            </div>
            <div style="font-size: 11px; color: #1f2937; margin-bottom: 8px;">
              <strong>📞 Ph:</strong> ${loc.phone || '07152-255795'}
            </div>
            <a 
              href="https://maps.google.com/?q=${loc.latitude},${loc.longitude}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="display: inline-block; background-color: #7B1828; color: #ffffff; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 11px; font-weight: 600;"
            >
              Get Directions ↗
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
      });
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [locations]);

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
