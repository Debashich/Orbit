import axios from 'axios';

export interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
}

export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    // Open-Meteo current weather endpoint
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.current) {
      const current = data.current;
      
      // Map WMO weather codes to simple descriptions
      // https://open-meteo.com/en/docs
      const getCondition = (code: number) => {
        if (code === 0) return 'Clear sky';
        if (code === 1) return 'Mainly clear';
        if (code === 2) return 'Partly cloudy';
        if (code === 3) return 'Overcast';
        if (code <= 48) return 'Foggy';
        if (code <= 55) return 'Drizzle';
        if (code <= 67) return 'Rainy';
        if (code <= 77) return 'Snowy';
        if (code <= 82) return 'Rain showers';
        if (code <= 99) return 'Thunderstorm';
        return 'Cloudy';
      };

      return {
        temperature: Math.round(current.temperature_2m),
        description: getCondition(current.weather_code),
        windSpeed: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        weatherCode: current.weather_code,
      };
    }
    return null;
  } catch (error) {
    console.error('[Weather] Error fetching weather from Open-Meteo:', error);
    return null;
  }
};
