import { GeoLocation } from './types';
import { LOCATION_MAP } from './config';

/**
 * Extract geographic location from text using keyword matching.
 * Returns the first matched location, prioritizing more specific places.
 */
export function extractLocation(text: string): GeoLocation | null {
  const lowerText = text.toLowerCase();

  // Sort locations by name length (longer = more specific) to match specific first
  const sortedLocations = Object.entries(LOCATION_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [name, coords] of sortedLocations) {
    // Word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (regex.test(lowerText)) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        name: capitalize(name),
        country: coords.country,
      };
    }
  }

  return null;
}

/**
 * Extract all locations from text
 */
export function extractAllLocations(text: string): GeoLocation[] {
  const lowerText = text.toLowerCase();
  const locations: GeoLocation[] = [];
  const found = new Set<string>();

  const sortedLocations = Object.entries(LOCATION_MAP)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [name, coords] of sortedLocations) {
    if (found.has(coords.country + coords.lat)) continue;
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (regex.test(lowerText)) {
      locations.push({
        lat: coords.lat,
        lng: coords.lng,
        name: capitalize(name),
        country: coords.country,
      });
      found.add(coords.country + coords.lat);
    }
  }

  return locations;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(str: string): string {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
