/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 设计系统颜色 - 基于 Architectural Workbench
        "on-tertiary-container": "#eaffe1",
        "on-primary": "#ffffff",
        "on-tertiary": "#ffffff",
        "on-primary-fixed": "#001849",
        "surface-dim": "#d9dadc",
        "on-background": "#191c1e",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e7e8ea",
        "surface": "#f8f9fb",
        "primary-fixed": "#dae1ff",
        "on-secondary": "#ffffff",
        "primary-container": "#0066ff",
        "inverse-primary": "#b3c5ff",
        "on-tertiary-fixed-variant": "#00530e",
        "secondary-fixed": "#ffdbc8",
        "on-primary-fixed-variant": "#003fa4",
        "on-error": "#ffffff",
        "on-surface": "#191c1e",
        "outline": "#727687",
        "tertiary-fixed-dim": "#4ee253",
        "outline-variant": "#c2c6d8",
        "primary": "#0050cb",
        "inverse-on-surface": "#f0f1f3",
        "surface-container-highest": "#e1e2e4",
        "tertiary-container": "#00851c",
        "on-secondary-fixed-variant": "#733500",
        "on-secondary-container": "#5c2900",
        "surface-container": "#edeef0",
        "secondary-fixed-dim": "#ffb689",
        "error-container": "#ffdad6",
        "secondary-container": "#fd7c00",
        "inverse-surface": "#2e3132",
        "on-secondary-fixed": "#311300",
        "tertiary-fixed": "#72ff70",
        "surface-container-low": "#f3f4f6",
        "surface-variant": "#e1e2e4",
        "secondary": "#984800",
        "error": "#ba1a1a",
        "surface-bright": "#f8f9fb",
        "on-surface-variant": "#424656",
        "background": "#f8f9fb",
        "on-tertiary-fixed": "#002203",
        "primary-fixed-dim": "#b3c5ff",
        "surface-tint": "#0054d6",
        "on-error-container": "#93000a",
        "on-primary-container": "#f8f7ff",
        "tertiary": "#006914"
      },
      fontFamily: {
        "headline": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "2.5": "0.5rem",
        "4": "0.9rem",
        "8": "1.8rem",
        "10": "2.25rem"
      }
    },
  },
  plugins: [],
}
