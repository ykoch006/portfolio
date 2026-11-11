import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Grenze, Spectral } from "next/font/google";
import HideoutApp from "./_components/HideoutApp";
import { getGhosts, type Ghost } from "./_lib/ghosts";
import { getWeather, WEATHER_PLACE } from "@/lib/weather";
import { getAllDemos } from "@/lib/demos";
import { redis } from "@/lib/redis";

const display = Grenze({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Spectral({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "the hideout — y.koc",
  description: "A candlelit lounge where the guestbook ghosts, the music orb, the weather and my projects live.",
};

export const viewport: Viewport = { themeColor: "#050708" };

export default async function HideoutPage() {
  // guestbook entries change outside this route, so read them per request like the homepage does
  await connection();
  const [weather, ghosts, demos] = await Promise.all([
    getWeather(),
    getGhosts().catch((): Ghost[] => []),
    getAllDemos().catch(() => []),
  ]);

  return (
    <div className={`${display.variable} ${body.variable}`}>
      <HideoutApp
        initialGhosts={ghosts}
        weather={weather}
        place={WEATHER_PLACE}
        demos={demos.map((d) => ({ title: d.title, src: d.src }))}
        guestbookOnline={Boolean(redis)}
      />
    </div>
  );
}
