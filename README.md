# portfolio

Source for my personal site, [yukselkoc.com](https://yukselkoc.com). It's a Next.js
App Router project, deployed on Vercel.

## What's on it

- **Guestbook**: entries are stored in Upstash Redis and written through server
  actions. Posting is rate limited per IP (sliding window, 5 posts per 10 minutes), and
  comments with several links are rejected as spam. Moderation is protected by an admin
  key held in an environment variable.
- **Now playing**: server-side Spotify Web API integration (refresh-token flow) for the
  current and recently played tracks. A YouTube Data API lookup provides a "listen along"
  link.
- **Weather**: current conditions from Open-Meteo drive a small visual effect on the
  home page.
- **Blog**: Markdown posts with front matter, parsed with gray-matter and remark. Still a
  work in progress, and some posts are placeholders.
- **Demos**: audio tracks served from `public/demos`, with admin-only renaming.
- Light and dark themes, with the choice saved and no flash on load.

The repo also hosts a few static showcase pages for GAMA (`public/gama-*`,
`app/gama-london`).

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Upstash Redis and Ratelimit,
gray-matter and remark.

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000
```

The site runs without any credentials. The integrations below return an error, and show
no data, until their variables are set in `.env.local`:

| Variable | Used for |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | guestbook storage and rate limiting (`KV_REST_API_*` also accepted) |
| `GUESTBOOK_ADMIN_KEY` | guestbook moderation and renaming demo tracks |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` | now playing / recently played |
| `YOUTUBE_API_KEY` | "listen along" search |

Secrets are only read on the server; nothing is committed.
