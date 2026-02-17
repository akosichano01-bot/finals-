/** @type {import('tailwindcss').Config} */
export default {
  // Pinalawak natin ang scope para siguradong pati ang pages at components folders ay ma-scan
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apartment-dark': '#0f172a',
        'apartment-indigo': '#4f46e5',
      },
      // Nagdagdag tayo ng default spacing at shadows para sa card
      boxShadow: {
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  // Naka-true ito para siguradong manalo ang Tailwind classes mo sa Render environment
  important: true, 
  plugins: [],
}
