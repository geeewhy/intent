import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';

const config = {
  preprocess: preprocess(),
  kit: {
    adapter: adapter(),
    files: {
      routes: 'src/sidepanel/routes'
    }
  }
};

export default config;
