/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0050cb",
        "primary-light": "#dae1ff",
        "primary-dark": "#003fa4",
        secondary: "#984800",
        "secondary-light": "#ffdbc8",
        tertiary: "#006914",
        "tertiary-light": "#72ff70",
        surface: "#eef2f6",
        "surface-dim": "#cfd3d9",
        "surface-container": "#e3e8ef",
        "on-surface": "#161b22",
        "on-primary": "#ffffff",
        outline: "#667086",
        "outline-variant": "#aab3c2",
        error: "#ba1a1a",
        background: "#e9eef4",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
}
