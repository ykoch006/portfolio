"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redis } from "./redis";
import { guestbookRatelimit } from "./ratelimit";
import { addGuestbookEntry, deleteGuestbookEntry, looksLikeSpam } from "./guestbook";

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

export async function submitGuestbookEntry(formData: FormData) {
  if (!redis) return;

  // honeypot — real visitors never fill this in
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);

  if (!name || !comment) return;
  if (looksLikeSpam(comment)) return;

  if (guestbookRatelimit) {
    const ip = await getClientIp();
    const { success } = await guestbookRatelimit.limit(ip);
    if (!success) return;
  }

  await addGuestbookEntry(name, comment);
  revalidatePath("/");
  revalidatePath("/hideout");
}

export async function deleteGuestbookEntryAction(formData: FormData) {
  const key = String(formData.get("modkey") ?? "");
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY;

  if (!adminKey || key !== adminKey) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteGuestbookEntry(id);
  revalidatePath("/");
  revalidatePath("/hideout");
}
