/* Small hand-drawn icon set — kept dependency-free and consistent (1.6 stroke, rounded caps). */
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconGrid = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconPulse = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);

export const IconBrain = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
    <path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M4.93 4.93l2.83 2.83" />
    <path d="M16.24 16.24l2.83 2.83" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="M4.93 19.07l2.83-2.83" />
    <path d="M16.24 7.76l2.83-2.83" />
  </svg>
);

export const IconCpu = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1.6" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </svg>
);

export const IconNetwork = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="5" cy="19" r="2.2" />
    <circle cx="19" cy="19" r="2.2" />
    <path d="M12 7.2V13M12 13L6.4 17.2M12 13l5.6 4.2" />
  </svg>
);

export const IconShield = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M12 3 19 6v6c0 5-3 8-7 9-4-1-7-4-7-9V6Z" />
  </svg>
);

export const IconAlert = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M12 3 21 19H3Z" />
    <path d="M12 9.5v4M12 16.5h.01" />
  </svg>
);

export const IconBolt = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

export const IconLayers = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
);

export const IconHistory = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const IconDatabase = (p) => (
  <svg viewBox="0 0 24 24" className="nav-icon" {...base} {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export const IconRefresh = (p) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...base} {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
