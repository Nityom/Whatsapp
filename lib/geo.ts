/**
 * Haversine formula to compute distance between two GPS coordinates in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 1 decimal place (e.g. 1.2 km)
  return Math.round(distance * 10) / 10;
}

export interface GeoLocationItem {
  _id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  phone?: string;
}

export interface NearestLocationResult<T extends GeoLocationItem = GeoLocationItem> {
  location: T;
  distanceKm: number;
}

/**
 * Finds the closest rental location from a list of active locations based on user's GPS coordinates.
 */
export function findNearestLocation<T extends GeoLocationItem>(
  userLat: number,
  userLon: number,
  locations: T[]
): NearestLocationResult<T> | null {
  if (!locations || locations.length === 0) return null;

  let closest: T = locations[0];
  let minDistance = haversineDistanceKm(
    userLat,
    userLon,
    closest.latitude,
    closest.longitude
  );

  for (let i = 1; i < locations.length; i++) {
    const loc = locations[i];
    const dist = haversineDistanceKm(userLat, userLon, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  return {
    location: closest,
    distanceKm: minDistance,
  };
}

/**
 * Generates a dynamic Google Maps search URL from coordinates.
 * Format: https://www.google.com/maps/search/?api=1&query=LAT,LONG
 */
export function generateGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
