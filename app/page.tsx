import Moonscape from "@/components/Moonscape";
import WeatherFX from "@/components/WeatherFX";
import Signal from "@/components/Signal";
import Frames from "@/components/Frames";
import FeaturedMix from "@/components/FeaturedMix";
import Vitals from "@/components/Vitals";
import GlitchText from "@/components/GlitchText";
import Guestbook from "@/components/Guestbook";
import AsciiSpinner from "@/components/AsciiSpinner";
import Mascot from "@/components/Mascot";
import ThemeToggle from "@/components/ThemeToggle";
import { getAllPhotos } from "@/lib/posts";
import { countDemos } from "@/lib/demos";
import { getWeather } from "@/lib/weather";
import { contact, youtube } from "@/lib/site";
import styles from "./page.module.css";

function stamp() {
  return { session: Math.random().toString(16).slice(2, 6), now: Date.now() };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, weather] = await Promise.all([searchParams, getWeather()]);
  const modkey = Array.isArray(params.modkey) ? params.modkey[0] : params.modkey;
  const photos = getAllPhotos();
  const demos = countDemos();
  const { session, now } = stamp();

  return (
    <>
      <a href="#main" className="skip">skip to content</a>
      <WeatherFX weather={weather} className={styles.weather} />

      <div className={styles.page}>
        <header className={styles.top}>
          <div className={styles.status}>
            <span>
              <AsciiSpinner className={styles.spinner} /> session {session}
            </span>
            <Vitals weather={weather} initial={now} />
            <ThemeToggle className={styles.themeToggle} />
          </div>

          <div className={styles.brand}>
            <h1>
              y.koc <span>/ ykoch006</span>
            </h1>
            <p className={styles.lede}>
              personal projects <em>— computer science, university of reading</em>
            </p>
            <GlitchText text="記憶なんてただの記録。書き換えてしまえばいい。" className={styles.tag} />
          </div>

          <nav className={styles.nav} aria-label="sections">
            <a href="#music">music</a>
            <a href="#photos">photos</a>
            <a href="/demos">demos</a>
            <a href="#guestbook">guestbook</a>
            <a href="#contact">contact</a>
            <a href="/hideout">hideout</a>
          </nav>
        </header>

        <main id="main" className={styles.grid}>
          <section id="music" className={styles.music} aria-labelledby="music-h">
            <div className={styles.head}>
              <h2 id="music-h" className={styles.h2}>music</h2>
              <a className={styles.cta} href={youtube.channelUrl} target="_blank" rel="noreferrer">
                more on youtube →
              </a>
            </div>
            <FeaturedMix />
            <div className={styles.musicRow}>
              <Signal />
              <a href="/demos" className={styles.demosCard}>
                <span className={styles.label}>demos</span>
                <strong>{demos} unreleased tracks</strong>
                <span className={styles.mute}>listen →</span>
              </a>
            </div>
          </section>

          <section id="photos" className={styles.photos} aria-labelledby="photos-h">
            <div className={styles.head}>
              <h2 id="photos-h" className={styles.h2}>frames</h2>
              <span className={styles.mute}>photographs</span>
            </div>
            <Frames photos={photos} />
          </section>

          <Guestbook modkey={modkey} />
        </main>

        <footer id="contact" className={styles.foot}>
          <h2 className={styles.h2}>contact</h2>
          <ul className={styles.contact}>
            <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
            <li><a href={contact.github} target="_blank" rel="noreferrer">github / ykoch006</a></li>
            <li><a href={youtube.channelUrl} target="_blank" rel="noreferrer">youtube / {youtube.handle}</a></li>
          </ul>
        </footer>
      </div>

      <Moonscape className={styles.art} />
      <Mascot />
    </>
  );
}
