import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  speed: number | null;
  heading: number | null;
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
      // Try to get current position quickly
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (e) {
      location = await Location.getLastKnownPositionAsync({});
    }

    if (!location) return null;

    const { latitude, longitude, speed, heading } = location.coords;

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
      speed,
      heading,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};
