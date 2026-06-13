/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: "spoa-",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3858e9",
          hovered: "#3858ff",
        },
        secondary: {
          DEFAULT: "#f1f5f9",
        },
        danger: {
          DEFAULT: "#d63638",
        },
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-out": {
          "0%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(100%)" },
        },
        "tooltip-fade": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in": "slide-in 0.3s ease-out forwards",
        "slide-out": "slide-out 0.3s ease-in forwards",
        "tooltip-fade": "tooltip-fade 0.15s ease-out forwards",
      },
    },
  },
  plugins: [
    ({ addComponents }) => {
      addComponents({
        ".p-x-page-default": {
          paddingLeft: "12px",
          paddingRight: "12px",
          "@screen md": {
            paddingLeft: "24px",
            paddingRight: "24px",
          },
        },
        ".gap-default": {
          gap: "12px",
        },
        ".gap-default-big": {
          gap: "12px",
          "@screen xl": {
            gap: "36px",
          },
        },
        ".text-default": {
          fontSize: "13px",
          lineHeight: "20px",
        },
        ".text-secondary": {
          color: "#949494",
        },
        ".text-small": {
          fontSize: "12px",
          lineHeight: "16px",
        },
        ".border-default": {
          borderColor: "#e0e0e0",
        },
        ".table-responsive": {
          width: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        },
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        ".hide-spin-button": {
          "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
            "-webkit-appearance": "none",
            margin: "0",
          },
          "&[type='number']": {
            "-moz-appearance": "textfield",
            appearance: "none",
          },
        },
        ".animate-tooltip": {
          animation: "tooltip-fade 0.15s ease-out forwards",
        },
        ".animate-fade-in": {
          animation: "fade-in 0.3s ease-out forwards",
        },
      });
    },
  ],
};
