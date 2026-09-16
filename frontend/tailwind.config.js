/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#142B45",
          light: "#1F3F63",
          dark: "#0B1B2E",
        },
        marigold: {
          DEFAULT: "#E2933D",
          light: "#F0B36B",
          dark: "#C77620",
        },
        teal: {
          DEFAULT: "#1F7A5C",
          light: "#2E9973",
          dark: "#155943",
        },
        alert: {
          DEFAULT: "#C1432E",
          light: "#E06A54",
        },
        paper: "#F5F3EE",
        paperDark: "#EAE6DC",
      },
      fontFamily: {
        display: ["Poppins", "Noto Sans Devanagari", "sans-serif"],
        body: ["Noto Sans", "Noto Sans Devanagari", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,43,69,0.06), 0 4px 16px rgba(20,43,69,0.06)",
      },
    },
  },
  plugins: [],
};
