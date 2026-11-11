import type { Weather } from "@/lib/weather";

export type Sky = {
  available: boolean;
  isDay: boolean;
  precip: "none" | "rain" | "snow";
  intensity: number;
  cloud: number;
  fog: number;
  storm: boolean;
};

export function skyFrom(weather: Weather | null): Sky {
  if (!weather) {
    return { available: false, isDay: false, precip: "none", intensity: 0, cloud: 0.35, fog: 0.15, storm: false };
  }
  const c = weather.condition;
  const sky: Sky = { available: true, isDay: weather.isDay, precip: "none", intensity: 0, cloud: 0.15, fog: 0.05, storm: false };

  if (c.includes("snow")) {
    sky.precip = "snow";
    sky.intensity = c.includes("heavy") ? 1 : c.includes("light") ? 0.4 : 0.7;
    sky.cloud = 0.85;
    sky.fog = 0.25;
  } else if (c.includes("rain") || c.includes("drizzle") || c.includes("showers") || c === "storm") {
    sky.precip = "rain";
    sky.intensity = c.includes("heavy") || c === "storm" ? 1 : c.includes("drizzle") || c.includes("light") ? 0.35 : 0.65;
    sky.cloud = 0.9;
    sky.fog = 0.2;
    sky.storm = c === "storm";
  } else if (c === "fog") {
    sky.cloud = 0.7;
    sky.fog = 0.85;
  } else if (c === "overcast") {
    sky.cloud = 0.95;
    sky.fog = 0.15;
  } else if (c === "partly cloudy") {
    sky.cloud = 0.55;
  } else if (c === "mostly clear") {
    sky.cloud = 0.3;
  } else if (c === "unsettled") {
    sky.cloud = 0.7;
  }
  return sky;
}
