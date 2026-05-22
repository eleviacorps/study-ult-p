export const colors = {
  bg: {
    base: "#09090B",
    surface: "#0F1117",
    elevated: "#151821",
    overlay: "#1A1D29",
  },
  glass: {
    light: "rgba(255,255,255,0.03)",
    medium: "rgba(255,255,255,0.05)",
    heavy: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.10)",
    glow: "rgba(255,255,255,0.12)",
  },
  accent: {
    primary: "#1856FF",
    cyan: "#06B6D4",
    emerald: "#10B981",
    purple: "#8B5CF6",
    orange: "#F97316",
    red: "#EF4444",
    amber: "#F59E0B",
    indigo: "#6366F1",
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#94A3B8",
    muted: "#475569",
    inverse: "#0F172A",
  },
};

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
};

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
};

export const glassStyles = {
  card: "bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.06] rounded-[24px]",
  cardHeavy:
    "bg-white/[0.05] backdrop-blur-[20px] border border-white/[0.08] rounded-[24px]",
  cardInteractive:
    "bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.06] rounded-[24px] hover:bg-white/[0.06] hover:border-white/[0.10] transition-all duration-200",
  panel:
    "bg-white/[0.02] backdrop-blur-[16px] border border-white/[0.04] rounded-[20px]",
} as const;

export const glowStyles = {
  primary:
    "shadow-[0_0_40px_rgba(24,86,255,0.08),0_0_80px_rgba(24,86,255,0.04)]",
  cyan: "shadow-[0_0_40px_rgba(6,182,212,0.08),0_0_80px_rgba(6,182,212,0.04)]",
  purple:
    "shadow-[0_0_40px_rgba(139,92,246,0.08),0_0_80px_rgba(139,92,246,0.04)]",
} as const;

export const animations = {
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] },
  },
  stagger: {
    container: {
      animate: { transition: { staggerChildren: 0.06 } },
    },
    item: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] },
    },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] },
  },
} as const;
