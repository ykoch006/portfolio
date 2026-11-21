import { Suspense } from "react";
import { getGuestbookEntries } from "@/lib/guestbook";
import { submitGuestbookEntry } from "@/lib/guestbook-actions";
import { redis } from "@/lib/redis";
import GuestbookDelete from "./GuestbookDelete";
import styles from "@/app/page.module.css";

function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default async function Guestbook() {
  const entries = await getGuestbookEntries();

  return (
    <section id="guestbook" className={styles.guestbook} aria-labelledby="gb-h">
      <h2 id="gb-h" className={styles.h2}>guestbook</h2>

      {redis ? (
        <form action={submitGuestbookEntry} className={styles.guestbookForm}>
          <input
            type="text"
            name="website"
            autoComplete="off"
            tabIndex={-1}
            className={styles.honeypot}
            aria-hidden="true"
          />
          <input type="text" name="name" placeholder="name" aria-label="name" required maxLength={60} />
          <textarea
            name="comment"
            placeholder="say something" aria-label="message"
            required
            maxLength={500}
            rows={2}
          />
          <button type="submit">sign</button>
        </form>
      ) : (
        <p className={styles.guestbookSub}>signing is offline right now — check back later.</p>
      )}

      <ol className={styles.guestbookEntries}>
        {entries.length === 0 && (
          <li className={styles.guestbookEmpty}>no entries yet — be the first.</li>
        )}
        {entries.map((entry) => (
          <li key={entry.id}>
            <div className={styles.guestbookEntryHead}>
              <span className={styles.guestbookName}>{entry.name}</span>
              <span className={styles.guestbookDate}>{formatDate(entry.createdAt)}</span>
            </div>
            <p className={styles.guestbookComment}>{entry.comment}</p>
            <Suspense fallback={null}>
              <GuestbookDelete id={entry.id} className={styles.guestbookDelete} />
            </Suspense>
          </li>
        ))}
      </ol>
    </section>
  );
}
