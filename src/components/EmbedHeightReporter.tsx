"use client";

import { useEffect } from "react";

export function EmbedHeightReporter() {
  useEffect(() => {
    const report = () => {
      window.parent.postMessage(
        { type: "cmResize", height: document.documentElement.scrollHeight },
        "*"
      );
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);
  return null;
}
