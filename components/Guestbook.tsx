import { getGuestbookEntries } from "@/lib/guestbook";
import { submitGuestbookEntry, deleteGuestbookEntryAction } from "@/lib/guestbook-actions";
import { redis } from "@/lib/redis";
import styles from "@/app/page.module.css";

function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default async function Guestbook({ modkey }: { modkey?: string }) {
  const entries = await getGuestbookEntries();
  const isModerator = Boolean(
    modkey && process.env.GUESTBOOK_ADMIN_KEY && modkey === process.env.GUESTBOOK_ADMIN_KEY
  );

  return (
    <section id="guestbook" className={styles.guestbook} aria-labelledby="gb-h">
      <h2 id="gb-h" className={styles.h2}>guestbook</h2>
      <p className={styles.mute}>leave a note. be nice.</p>

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
            {isModerator && (
              <form action={deleteGuestbookEntryAction} className={styles.guestbookDelete}>
                <input type="hidden" name="id" value={entry.id} />
                <input type="hidden" name="modkey" value={modkey} />
                <button type="submit">delete</button>
              </form>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
