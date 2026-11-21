"use client";

import { useSyncExternalStore } from "react";

// one id per page load, made in the browser so a cached page doesn't share it
const id = typeof window === "undefined" ? "" : Math.random().toString(16).slice(2, 6);
const noop = () => () => {};

export default function Session() {
  const value = useSyncExternalStore(noop, () => id, () => "····");
  return <>session {value}</>;
}
