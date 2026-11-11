export type Weather = { tempC: number; condition: string; isDay: boolean };

export const WEATHER_PLACE = { name: "London", timeZone: "Europe/London" };

const LONDON = "latitude=51.5074&longitude=-0.1278";

const WEATHER_TEXT: Record<number, string> = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "fog",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "showers",
  81: "showers",
  82: "heavy showers",
  85: "snow showers",
  86: "snow showers",
  95: "storm",
  96: "storm",
  99: "storm",
};

export async function getWeather(): Promise<Weather | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${LONDON}&current=temperature_2m,weather_code,is_day&timezone=Europe%2FLondon`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      tempC: Math.round(data.current.temperature_2m),
      condition: WEATHER_TEXT[data.current.weather_code] ?? "unsettled",
      isDay: data.current.is_day === 1,
    };
  } catch {
    return null;
  }
}
