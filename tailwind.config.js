/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Maaari mong dagdagan ng custom colors dito kung kailangan
    },
  },
  // Inilipat natin ito para masiguradong walang conflict sa ibang CSS
  important: true, 
  plugins: [],
}
