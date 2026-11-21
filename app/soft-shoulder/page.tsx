import type { Metadata, Viewport } from "next";
import { release, youtube } from "@/lib/site";
import ReleasePlayer from "./_components/ReleasePlayer";
import styles from "./release.module.css";

export const metadata: Metadata = {
  title: `${release.title} — ${release.artist}`,
  description: `listen to ${release.title} by ${release.artist}.`,
};

export const viewport: Viewport = { themeColor: "#0c1019" };

export default function ReleasePage() {
  return (
    <div className={styles.shell}>
      <main>
        <ReleasePlayer
          title={release.title}
          artist={release.artist}
          audioSrc={release.audio}
          banner={release.banner}
          spotifyUrl={release.spotify}
          youtubeUrl={youtube.channelUrl}
        />
      </main>
    </div>
  );
}
