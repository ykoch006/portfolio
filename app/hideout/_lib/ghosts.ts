import { redis } from "@/lib/redis";
import { getGuestbookEntries, type GuestbookEntry } from "@/lib/guestbook";
import { encodeLook, lookFromId, parseLook, type GhostLook } from "../_data/looks";

// mirrors the guestbook list key split so preview deployments keep their own looks
const LOOKS_KEY = process.env.VERCEL_ENV === "preview" ? "guestbook:preview:looks" : "guestbook:looks";

export type Ghost = GuestbookEntry & { look: GhostLook };

export async function getGhosts(): Promise<Ghost[]> {
  const entries = await getGuestbookEntries();
  if (!redis || entries.length === 0) return entries.map((e) => ({ ...e, look: lookFromId(e.id) }));

  const stored = await redis.hmget<Record<string, string>>(LOOKS_KEY, ...entries.map((e) => e.id));
  return entries.map((e) => ({ ...e, look: parseLook(stored?.[e.id]) ?? lookFromId(e.id) }));
}

export async function saveLook(id: string, look: GhostLook): Promise<void> {
  if (!redis) return;
  await redis.hset(LOOKS_KEY, { [id]: encodeLook(look) });
}
