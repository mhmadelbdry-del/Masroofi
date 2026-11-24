import { useEffect, useId, useState } from "react";

/** Reveal the original artwork's arrow pixels in place, following its path. */
export function AnimatedSplashIcon() {
  const [done, setDone] = useState(false);
  const maskId = `arrow-reveal-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const timer = window.setTimeout(() => setDone(true), 1450);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="masareef-splash-icon" role="img" aria-label="مصاريف، جارٍ التحميل">
      <img
        src={done ? "/masareef-icon.png" : "/splash-base.png"}
        alt=""
        className="h-full w-full object-contain"
      />
      {!done ? (
        <svg viewBox="0 0 508 508" className="masareef-splash-arrow" aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="508" height="508">
              <path
                className="masareef-arrow-reveal-path"
                d="M118 283 L218 179 L244 206 L294 147 L314 167 L393 72 L400 59"
                pathLength="1"
                fill="none"
                stroke="white"
                strokeWidth="48"
                strokeLinejoin="round"
                strokeLinecap="butt"
              />
            </mask>
          </defs>
          <image href="/masareef-icon.png" width="508" height="508" mask={`url(#${maskId})`} />
        </svg>
      ) : null}
    </div>
  );
}
