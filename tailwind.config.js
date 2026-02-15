/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./popup.html", "./blocked.html"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#10b981",
          dark: "#059669",
          light: "#34d399",
        },
      },
    },
  },
  plugins: [],
};
