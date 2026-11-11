import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { redis } from "./redis";

const DEMOS_DIR = path.join(process.cwd(), "public", "demos");
const TITLES_KEY = "demos:titles";

export type Demo = {
  file: string;
  src: string;
  title: string;
  sizeMb: string;
  dateAdded: string;
};

async function getTitleOverrides(): Promise<Record<string, string>> {
  if (!redis) return {};
  const map = await redis.hgetall<Record<string, string>>(TITLES_KEY);
  return map ?? {};
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/**
 * When the file was first committed to git (falls back to filesystem mtime
 * if there's no git history available, e.g. a shallow clone).
 */
function dateAddedFor(filePath: string): Date {
  try {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    const out = execSync(
      `git log --diff-filter=A --follow --format=%aI -1 -- "${relPath}"`,
      { cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] }
    )
      .toString()
      .trim();
    if (out) return new Date(out);
  } catch {
    // git unavailable or no history for this file — fall back below
  }
  return fs.statSync(filePath).mtime;
}

const AUDIO = /\.(mp3|wav|m4a|ogg)$/i;

export function countDemos(): number {
  return fs.existsSync(DEMOS_DIR) ? fs.readdirSync(DEMOS_DIR).filter((f) => AUDIO.test(f)).length : 0;
}

/**
 * Lists any mp3 (or wav/m4a/ogg) file dropped into public/demos/.
 * Filename becomes the title: "01-late-night-idea.mp3" -> "late night idea".
 */
export async function getAllDemos(): Promise<Demo[]> {
  if (!fs.existsSync(DEMOS_DIR)) return [];

  const files = fs
    .readdirSync(DEMOS_DIR)
    .filter((f) => AUDIO.test(f))
    .sort();

  const overrides = await getTitleOverrides();

  return files.map((file) => {
    const filePath = path.join(DEMOS_DIR, file);
    const { size } = fs.statSync(filePath);
    const defaultTitle = file
      .replace(/\.[^.]+$/, "")
      .replace(/^\d+[-_.]?\s*/, "")
      .replace(/[-_]/g, " ");
    return {
      file,
      src: `/demos/${file}`,
      title: overrides[file] ?? defaultTitle,
      sizeMb: (size / (1024 * 1024)).toFixed(1),
      dateAdded: formatDate(dateAddedFor(filePath)),
    };
  });
}
