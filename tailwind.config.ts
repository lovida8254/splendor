import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        velvet: { DEFAULT: "#161221", 2: "#1d1830" },
        panel: { DEFAULT: "#241d39", 2: "#2c2447" },
        line: { DEFAULT: "#3a3156", 2: "#4a4070" },
        ink: { DEFAULT: "#ece8f6", muted: "#a99fc6", muted2: "#7c719c" },
        gold: { DEFAULT: "#d8b25e", soft: "#caa860" },
        gem: {
          white: "#e9ecf6",
          blue: "#3a72df",
          green: "#21a06a",
          red: "#dd3a57",
          black: "#6a6188",
          gold: "#e6bd55",
        },
      },
      fontFamily: {
        serif: ["Cinzel", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        velvet: "0 8px 28px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};

export default config;
