import { redis } from "./redis";

// preview deployments share the production redis, so they write to their own list
const GUESTBOOK_KEY = process.env.VERCEL_ENV === "preview" ? "guestbook:preview:entries" : "guestbook:entries";
const SHOWN = 50;
const MAX_ENTRIES = 500;

export type GuestbookEntry = {
  id: string;
  name: string;
  comment: string;
  createdAt: number;
};

export async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  if (!redis) return [];
  return redis.lrange<GuestbookEntry>(GUESTBOOK_KEY, 0, SHOWN - 1);
}

export async function addGuestbookEntry(name: string, comment: string): Promise<GuestbookEntry> {
  if (!redis) throw new Error("Guestbook storage is not configured.");

  const entry: GuestbookEntry = {
    id: crypto.randomUUID(),
    name,
    comment,
    createdAt: Date.now(),
  };

  await redis.lpush(GUESTBOOK_KEY, entry);
  await redis.ltrim(GUESTBOOK_KEY, 0, MAX_ENTRIES - 1);
  return entry;
}

export async function deleteGuestbookEntry(id: string): Promise<void> {
  if (!redis) return;

  const entries = await getGuestbookEntries();
  const remaining = entries.filter((entry) => entry.id !== id);

  await redis.del(GUESTBOOK_KEY);
  if (remaining.length > 0) {
    await redis.rpush(GUESTBOOK_KEY, ...remaining);
  }
}

const LINK_PATTERN = /https?:\/\/|www\./gi;

export function looksLikeSpam(comment: string): boolean {
  const matches = comment.match(LINK_PATTERN);
  return (matches?.length ?? 0) >= 2;
}
