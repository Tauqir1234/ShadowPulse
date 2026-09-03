/**
 * The ShadowPulse signature element: a shield silhouette with an animated
 * ECG-style pulse line running through it. Used in the sidebar brand mark
 * and echoed (without the shield) as the live "system heartbeat" strip on
 * the dashboard header.
 */
export function PulseMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4 L41 10 V22 C41 33 34 41 24 44 C14 41 7 33 7 22 V10 Z"
        fill="url(#shieldFill)"
        stroke="var(--border)"
        strokeWidth="1"
      />
      <path
        className="pulse-svg-loop"
        d="M9 24 H16 L19 15 L24 33 L28 20 L30 24 H39"
        stroke="var(--pulse)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px rgba(6,182,212,0.7))" }}
      />
      <defs>
        <linearGradient id="shieldFill" x1="7" y1="4" x2="41" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f3f4f6" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Thin horizontal live-heartbeat strip used in the topbar. */
export function PulseStrip({ width = 120, height = 28, active = true }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 28" fill="none">
      <path
        className={active ? "pulse-svg-loop" : ""}
        d="M0 14 H30 L36 4 L44 24 L50 14 L54 18 L58 14 H120"
        stroke="var(--pulse)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px rgba(6,182,212,0.55))", opacity: active ? 1 : 0.35 }}
      />
    </svg>
  );
}
