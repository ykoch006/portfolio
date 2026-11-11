// One-off helper route for (re)authorizing the Spotify app with new scopes.
// Visit the authorize URL, Spotify redirects here with ?code=..., and this
// exchanges it for a refresh token to copy into SPOTIFY_REFRESH_TOKEN.

import { NextRequest, NextResponse } from "next/server";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(`Spotify returned an error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new NextResponse("Missing ?code param.", { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = "http://127.0.0.1:3000/api/spotify/callback";

  if (!clientId || !clientSecret) {
    return new NextResponse("Missing SPOTIFY_CLIENT_ID/SECRET env vars.", { status: 500 });
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    return new NextResponse(`Token exchange failed: ${res.status}\n${text}`, { status: 500 });
  }

  const data = JSON.parse(text);

  return new NextResponse(
    `<!doctype html><html><body style="font-family:monospace;padding:40px;max-width:700px;margin:0 auto">
<h2>Spotify authorized</h2>
<p>Copy this into <code>SPOTIFY_REFRESH_TOKEN</code> (Vercel env vars + your local .env.local):</p>
<textarea readonly style="width:100%;height:120px;font-family:monospace;font-size:13px;padding:10px">${data.refresh_token}</textarea>
<p>Granted scopes: <code>${data.scope}</code></p>
<p style="color:#888">You can close this tab after copying the token.</p>
</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
