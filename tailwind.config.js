/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        shelf: {
          50: "#eaf3ec",
          100: "#cfe4d4",
          400: "#2f7a4f",
          500: "#1f5c3a",
          600: "#164a2d",
          700: "#0f3a22",
          900: "#0a2818",
        },
        surface: "#f7f9f7",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};