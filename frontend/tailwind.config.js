/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FBF6EC",
          100: "#F6EEDD",
          200: "#F0E4CB",
          300: "#E7D6B0",
        },
        ink: {
          900: "#1B1B1F",
          700: "#3A3A40",
          500: "#6B6B72",
          400: "#8A8A92",
        },
        flame: {
          50: "#FCEEE2",
          100: "#FADBC2",
          400: "#F39A6A",
          500: "#EE7A40",
          600: "#D9622A",
          700: "#B14E20",
        },
        leaf: {
          100: "#DDEBD8",
          500: "#5BA86A",
          600: "#43864F",
        },
      },
      fontFamily: {
        sans: [
          "InterVariable",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,27,31,0.04), 0 4px 12px rgba(27,27,31,0.04)",
      },
      borderRadius: {
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};
