import Image from "next/image";
import Link from "next/link";
import Moonscape from "@/components/Moonscape";
import WeatherFX from "@/components/WeatherFX";
import Signal from "@/components/Signal";
import FeaturedMix from "@/components/FeaturedMix";
import Vitals from "@/components/Vitals";
import GlitchText from "@/components/GlitchText";
import Guestbook from "@/components/Guestbook";
import AsciiSpinner from "@/components/AsciiSpinner";
import Mascot from "@/components/Mascot";
import Session from "@/components/Session";
import ThemeToggle from "@/components/ThemeToggle";
import { countDemos } from "@/lib/demos";
import { getWeather } from "@/lib/weather";
import { contact, release, youtube } from "@/lib/site";
import styles from "./page.module.css";

// weather caches for 10 minutes; guestbook actions revalidate this page on change
export const revalidate = 600;

export default async function HomePage() {
  const weather = await getWeather();
  const demos = countDemos();

  return (
    <>
      <a href="#main" className="skip">skip to content</a>

      <header className={styles.hero}>
        <Image
          src={release.banner}
          alt="a snowy road at dusk"
          fill
          preload
          unoptimized
          className={styles.heroImg}
        />
        <div className={styles.caption}>
          <h1>y.koc</h1>
          <p>ykoch006</p>
        </div>
      </header>

      <div className={styles.page}>
        <WeatherFX weather={weather} className={styles.weather} />

        <div className={styles.top}>
          <div className={styles.status}>
            <span>
              <AsciiSpinner className={styles.spinner} /> <Session />
            </span>
            <Vitals weather={weather} />
            <ThemeToggle className={styles.themeToggle} />
          </div>

          <p className={styles.lede}>
            personal projects <em>— computer science, university of reading</em>
          </p>
          <GlitchText text="記憶なんてただの記録。書き換えてしまえばいい。" className={styles.tag} />

          <nav className={styles.nav}>
            <Link href="/soft-shoulder">music</Link>
          </nav>
        </div>

        <main id="main" className={styles.grid}>
          <section id="music" aria-label="music">
            <div className={styles.head}>
              <a className={styles.cta} href={youtube.channelUrl} target="_blank" rel="noreferrer">
                more on youtube
              </a>
            </div>
            <FeaturedMix />
            <div className={styles.musicRow}>
              <Signal />
              <a href="/demos" className={styles.demosCard}>
                <span className={styles.label}>demos</span>
                <strong>{demos} unreleased tracks</strong>
                <span className={styles.mute}>listen</span>
              </a>
            </div>
          </section>

          <Guestbook />
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
