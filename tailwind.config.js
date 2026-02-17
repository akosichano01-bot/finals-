/** @type {import('tailwindcss').Config} */
export default {
  // Siguraduhin na kasama ang lahat ng folders sa loob ng src
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Lahat ng files sa subfolders
    "./src/*.{js,ts,jsx,tsx}",   // Lahat ng files sa root ng src folder
  ],
  theme: {
    extend: {
      colors: {
        // Idinagdag natin ang exact colors base sa screenshot mo para madaling gamitin
        'apartment-dark': '#0f172a',
        'apartment-indigo': '#4f46e5',
      },
    },
  },
  // Ginawa nating true para ma-override ang anumang default browser styles 
  // na nagiging sanhi ng "plain text" look
  important: true, 
  plugins: [],
}
