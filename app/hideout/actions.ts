"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis";
import { guestbookRatelimit } from "@/lib/ratelimit";
import { addGuestbookEntry, looksLikeSpam } from "@/lib/guestbook";
import { parseLook, lookFromId } from "./_data/looks";
import { saveLook, type Ghost } from "./_lib/ghosts";

export type SignState =
  | { status: "idle" }
  | { status: "ok"; ghost: Ghost }
  | { status: "error"; message: string };

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

// same checks as lib/guestbook-actions.ts, but reports back so the room can react
export async function signHideoutGuestbook(_prev: SignState, formData: FormData): Promise<SignState> {
  if (!redis) return { status: "error", message: "The guestbook is offline right now." };

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) return { status: "error", message: "Something went wrong." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);

  if (!name || !comment) return { status: "error", message: "A name and a message, please." };
  if (looksLikeSpam(comment)) return { status: "error", message: "Too many links in that one." };

  if (guestbookRatelimit) {
    const { success } = await guestbookRatelimit.limit(await getClientIp());
    if (!success) return { status: "error", message: "You've signed a lot recently. Try again in a few minutes." };
  }

  const entry = await addGuestbookEntry(name, comment);
  const look = parseLook(formData.get("look")) ?? lookFromId(entry.id);
  await saveLook(entry.id, look);

  revalidatePath("/");
  revalidatePath("/hideout");
  return { status: "ok", ghost: { ...entry, look } };
}
