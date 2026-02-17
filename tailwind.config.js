/** @type {import('tailwindcss').Config} */
export default {
  // Binago natin ito para i-scan ang root folder dahil wala na ang src folder.
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",        // Lahat ng JS/JSX files sa root
    "./pages/**/*.{js,ts,jsx,tsx}", // Kung may pages folder ka pa rin sa root
    "./components/**/*.{js,ts,jsx,tsx}", // Kung may components folder ka pa sa root
    "./contexts/**/*.{js,ts,jsx,tsx}", // Kung may contexts folder ka pa sa root
  ],
  theme: {
    extend: {
      colors: {
        'apartment-dark': '#0f172a',
        'apartment-indigo': '#4f46e5',
      },
      boxShadow: {
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  // Naka-true para sigurado ang design sa Render.
  important: true, 
  plugins: [],
}
