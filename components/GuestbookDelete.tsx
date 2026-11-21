"use client";

import { useSearchParams } from "next/navigation";
import { deleteGuestbookEntryAction } from "@/lib/guestbook-actions";

// the action checks the key; this only decides whether to show the button
export default function GuestbookDelete({ id, className }: { id: string; className?: string }) {
  const modkey = useSearchParams().get("modkey");
  if (!modkey) return null;

  return (
    <form action={deleteGuestbookEntryAction} className={className}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="modkey" value={modkey} />
      <button type="submit">delete</button>
    </form>
  );
}
