module.exports = {
  content: ['./src/sidepanel/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {}
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['dark']
  }
};
