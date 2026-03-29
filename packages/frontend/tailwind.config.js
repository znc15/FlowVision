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
        "surface-dim": "#cfd3d9",
        "on-background": "#12161c",
        "surface-container-lowest": "#f4f6f8",
        "surface-container-high": "#d9dee5",
        "surface": "#eef2f6",
        "primary-fixed": "#dae1ff",
        "on-secondary": "#ffffff",
        "primary-container": "#0066ff",
        "inverse-primary": "#b3c5ff",
        "on-tertiary-fixed-variant": "#00530e",
        "secondary-fixed": "#ffdbc8",
        "on-primary-fixed-variant": "#003fa4",
        "on-error": "#ffffff",
        "on-surface": "#161b22",
        "outline": "#667086",
        "tertiary-fixed-dim": "#4ee253",
        "outline-variant": "#aab3c2",
        "primary": "#0050cb",
        "inverse-on-surface": "#f0f1f3",
        "surface-container-highest": "#d2d8e0",
        "tertiary-container": "#00851c",
        "on-secondary-fixed-variant": "#733500",
        "on-secondary-container": "#5c2900",
        "surface-container": "#e3e8ef",
        "secondary-fixed-dim": "#ffb689",
        "error-container": "#ffdad6",
        "secondary-container": "#fd7c00",
        "inverse-surface": "#2e3132",
        "on-secondary-fixed": "#311300",
        "tertiary-fixed": "#72ff70",
        "surface-container-low": "#e9edf3",
        "surface-variant": "#dbe1ea",
        "secondary": "#984800",
        "error": "#ba1a1a",
        "surface-bright": "#f1f4f8",
        "on-surface-variant": "#303748",
        "background": "#e9eef4",
        "on-tertiary-fixed": "#002203",
        "primary-fixed-dim": "#b3c5ff",
        "surface-tint": "#0054d6",
        "on-error-container": "#93000a",
        "on-primary-container": "#f8f7ff",
        "tertiary": "#006914"
      },
      fontFamily: {
        "headline": ["HarmonyOS_Regular", "sans-serif"],
        "body": ["HarmonyOS_Regular", "sans-serif"],
        "label": ["HarmonyOS_Regular", "sans-serif"]
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
  plugins: [require('@tailwindcss/typography')],
}
