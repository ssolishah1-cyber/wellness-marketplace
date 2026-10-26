/** @type {import('tailwindcss').Config} */
// Palette and type follow the approved mockup: leaf greens, citrus for
// calories, sky for water, amber reserved for sponsored labels.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef8f1", 100: "#dcf0e3", 200: "#b6e0c4", 500: "#2e9a63", 600: "#1c7a4b", 700: "#13603a", 900: "#0b3a23" },
        citrus: { 50: "#fef4ec", 100: "#fde7d6", 500: "#e2702a", 600: "#c95c1c" },
        sky: { 50: "#eef5fc", 100: "#dbeaf7", 500: "#2876bb", 600: "#1f62a0" },
        ground: "#f1f5f0",
        ink: { DEFAULT: "#13241b", 2: "#43554b", muted: "#728379" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Avenir Next"', '"Segoe UI"', "system-ui", "sans-serif"],
        sans: ["Figtree", '"Segoe UI"', "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(12px)" } },
        grow: { from: { transform: "scaleX(0)" } },
        pop: { "0%": { transform: "scale(.3)", opacity: "0" }, "70%": { transform: "scale(1.12)" } },
      },
      animation: {
        rise: "rise .5s cubic-bezier(.2,.8,.2,1) both",
        grow: "grow 1s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .45s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
