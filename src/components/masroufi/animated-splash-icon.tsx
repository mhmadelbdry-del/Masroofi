import { useEffect, useId, useRef, useState } from "react";

export const ARROW_ASCENT_MS = 1100;

/** Reveal the original artwork's arrow pixels in place, following its path. */
export function AnimatedSplashIcon({ onComplete, alreadyComplete = false }: { onComplete?: () => void; alreadyComplete?: boolean }) {
  const [ready, setReady] = useState(alreadyComplete);
  const [done, setDone] = useState(alreadyComplete);
  const completed = useRef(false);
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const maskId = `arrow-reveal-${useId().replace(/:/g, "")}`;
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    setDone(true);
    callback.current?.();
  };
  useEffect(() => {
    if (alreadyComplete) return;
    let cancelled = false;
    const load = (src: string) => new Promise<void>((resolve) => {
      const image = new Image();
      const timer = window.setTimeout(resolve, 5000);
      const settled = () => { window.clearTimeout(timer); resolve(); };
      image.onload = () => { void image.decode().catch(() => {}).then(settled); };
      image.onerror = settled;
      image.src = src;
    });
    void Promise.all([load("/splash-base.png"), load("/masareef-icon.png")]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready || alreadyComplete) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    // Animationend is primary. Safety fallback only for disabled/broken animation events.
    const timer = window.setTimeout(finish, ARROW_ASCENT_MS + 1000);
    return () => window.clearTimeout(timer);
  }, [ready]);
  return (
    <div className="masareef-splash-icon" role="img" aria-label="مصاريف، جارٍ التحميل" data-arrow-phase={done ? "complete" : ready ? "ascending" : "loading-artwork"}>
      <img src={done ? "/masareef-icon.png" : "/splash-base.png"} alt="" className="h-full w-full object-contain" />
      {ready && !done ? (
        <svg viewBox="0 0 508 508" className="masareef-splash-arrow" aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="508" height="508">
              <path className="masareef-arrow-reveal-path" style={{ animationDuration: `${ARROW_ASCENT_MS}ms` }} onAnimationEnd={finish}
                d="M118 283 L218 179 L244 206 L294 147 L314 167 L393 72 L400 59" pathLength="1" fill="none" stroke="white" strokeWidth="48" strokeLinejoin="round" strokeLinecap="butt" />
            </mask>
          </defs>
          <image href="/masareef-icon.png" width="508" height="508" mask={`url(#${maskId})`} />
        </svg>
      ) : null}
    </div>
  );
}
