import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      return null;
    }

    let location = null;
    try {
      // Try to get current position quickly, using lower accuracy which works better indoors/on emulators
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
    } catch (e) {
      // Silently fall back to last known location without throwing loud warnings
      location = await Location.getLastKnownPositionAsync({});
    }

    if (!location) return null;

    const { latitude, longitude } = location.coords;

    // Optional: Get reverse geocode for better context
    let address = '';
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const item = reverseGeocode[0];
        address = `${item.city || ''}, ${item.region || ''}, ${item.country || ''}`;
      }
    } catch (e) {
      console.warn('Failed to get reverse geocode', e);
    }

    return {
      latitude,
      longitude,
      address,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};
