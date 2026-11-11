
import { NextRequest, NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const artist = req.nextUrl.searchParams.get("artist");

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube not configured" }, { status: 500 });
  }

  const query = `${title} ${artist ?? ""}`.trim();
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "1",
    q: query,
    key: apiKey,
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
      cache: "no-store",
    });
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`YouTube search failed: ${res.status} ${text}`);
    }

    const data = JSON.parse(text);
    const videoId = data.items?.[0]?.id?.videoId ?? null;

    return NextResponse.json({ videoId });
  } catch (error) {
    console.error("YOUTUBE SEARCH ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
