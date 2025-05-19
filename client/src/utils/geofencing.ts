interface GeoPosition {
  latitude: number;
  longitude: number;
}

interface OfficeLocation {
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

// Sample office locations (to be configured by master admin)
let officeLocations: OfficeLocation[] = [
  {
    name: "Main Office",
    latitude: 28.613939,
    longitude: 77.209023,
    radius: 100, // 100 meters radius
  }
];

/**
 * Calculate distance between two points in meters using Haversine formula
 */
function calculateDistance(pos1: GeoPosition, pos2: GeoPosition): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (pos1.latitude * Math.PI) / 180;
  const φ2 = (pos2.latitude * Math.PI) / 180;
  const Δφ = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const Δλ = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a position is within any office geofence
 */
export function isWithinOfficeGeofence(position: GeoPosition): boolean {
  for (const office of officeLocations) {
    const distance = calculateDistance(position, {
      latitude: office.latitude,
      longitude: office.longitude,
    });
    if (distance <= office.radius) {
      return true;
    }
  }
  return false;
}

/**
 * Get current geolocation
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

/**
 * Add a new office location
 */
export function addOfficeLocation(location: OfficeLocation): void {
  officeLocations.push(location);
  // In a real app, this would save to backend/database
  saveOfficeLocations();
}

/**
 * Update an existing office location
 */
export function updateOfficeLocation(index: number, location: OfficeLocation): void {
  if (index >= 0 && index < officeLocations.length) {
    officeLocations[index] = location;
    // In a real app, this would save to backend/database
    saveOfficeLocations();
  }
}

/**
 * Remove an office location
 */
export function removeOfficeLocation(index: number): void {
  if (index >= 0 && index < officeLocations.length) {
    officeLocations.splice(index, 1);
    // In a real app, this would save to backend/database
    saveOfficeLocations();
  }
}

/**
 * Get all office locations
 */
export function getOfficeLocations(): OfficeLocation[] {
  loadOfficeLocations();
  return [...officeLocations];
}

// Save office locations to localStorage (in real app, would be saved to database)
function saveOfficeLocations(): void {
  localStorage.setItem('officeLocations', JSON.stringify(officeLocations));
}

// Load office locations from localStorage
function loadOfficeLocations(): void {
  const saved = localStorage.getItem('officeLocations');
  if (saved) {
    try {
      officeLocations = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved office locations:', e);
    }
  }
}

// Initial load
loadOfficeLocations();