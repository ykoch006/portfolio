import styles from "@/app/page.module.css";

export default function Mascot() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascot.gif"
      alt=""
      width={90}
      height={76}
      loading="lazy"
      decoding="async"
      className={styles.mascot}
    />
  );
}
