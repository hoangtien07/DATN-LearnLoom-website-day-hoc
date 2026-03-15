import adapter from "@sveltejs/adapter-auto";
import sveltePreprocess from "svelte-preprocess";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: sveltePreprocess(),
  kit: {
    adapter: adapter(),
  },
  vitePlugin: {
    onwarn(warning, defaultHandler) {
      // Suppress a11y warnings from node_modules (e.g. cl-editor)
      if (
        warning.code?.startsWith("a11y") &&
        warning.filename?.includes("node_modules")
      ) {
        return;
      }
      defaultHandler(warning);
    },
  },
};

export default config;
