/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rubik", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        // Brand palette taken from ordergenie.xtreme-media.com (#e14504)
        brand: {
          50: "#fdeee7",
          100: "#fbd5c5",
          200: "#f7b29a",
          300: "#f08a63",
          400: "#ea6630",
          500: "#e14504",
          600: "#c43c03",
          700: "#9e3103",
        },
        ink: {
          DEFAULT: "#5e5873", // headings
          soft: "#6e6b7b", // body text
          muted: "#82868b", // secondary
          line: "#ebe9f1", // light borders
        },
      },
    },
  },
  plugins: [],
};
