'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  availableCount: number;
  vehicles: string[];
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

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([18.55, 73.82], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Custom SVG Marker Icon
      const customPin = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="background-color: #008069; color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid #ffffff;">
            <div style="transform: rotate(45deg); font-size: 14px;">🛵</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add markers
      locations.forEach((loc) => {
        const vehicleListHtml =
          loc.vehicles.length > 0
            ? loc.vehicles
                .map(
                  (v) =>
                    `<div style="font-size: 12px; color: #374151; padding: 2px 0;">• ${v}</div>`
                )
                .join('')
            : '<div style="font-size: 12px; color: #9ca3af; font-style: italic;">No vehicles available</div>';

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px;">
            <div style="font-weight: 700; color: #008069; font-size: 15px; margin-bottom: 2px;">${loc.name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${loc.address}</div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 4px 8px; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: 600; color: #166534;">Available Vehicles: ${loc.availableCount}</span>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 4px;">Vehicles:</div>
            ${vehicleListHtml}
          </div>
        `;

        L.marker([loc.latitude, loc.longitude], { icon: customPin })
          .addTo(map)
          .bindPopup(popupContent);
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations]);

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
