
import { NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";

const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

export async function GET() {
  try {
    const access_token = await getSpotifyAccessToken();

    const res = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      cache: "no-store",
    });

    const text = await res.text();

    if (res.status === 204) {
      return NextResponse.json({ isPlaying: false });
    }

    if (!res.ok) {
      throw new Error(`Now playing failed: ${res.status} ${text}`);
    }

    const data = JSON.parse(text);

    if (!data?.item) {
      return NextResponse.json({ isPlaying: false });
    }

    return NextResponse.json({
      isPlaying: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map((a: { name: string }) => a.name).join(", "),
      album: data.item.album.name,
      albumImageUrl: data.item.album.images?.[1]?.url ?? data.item.album.images?.[0]?.url ?? "",
      songUrl: data.item.external_urls?.spotify ?? "",
      progressMs: data.progress_ms ?? 0,
      durationMs: data.item.duration_ms ?? 0,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error("SPOTIFY ERROR:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}