
import { NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";

const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=50";

export async function GET() {
  try {
    const access_token = await getSpotifyAccessToken();

    const res = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Recently played failed: ${res.status} ${text}`);
    }

    const data = JSON.parse(text);
    const items = data.items ?? [];

    const seen = new Set();
    const albums = [];

    for (const item of items) {
      const album = item.track?.album;
      if (!album || seen.has(album.id)) continue;
      seen.add(album.id);
      albums.push({
        id: album.id,
        name: album.name,
        artist: item.track.artists.map((a: { name: string }) => a.name).join(", "),
        imageUrl: album.images?.[2]?.url ?? album.images?.[0]?.url ?? "",
      });
      if (albums.length >= 7) break;
    }

    return NextResponse.json({ albums });
  } catch (error) {
    console.error("SPOTIFY RECENTLY PLAYED ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
