import { defineConfig } from "vite";
import type { Logger as SassLogger } from "sass";

// Bootstrap's SCSS still uses APIs (color.red()/green()/blue(), darken(), etc.)
// that Dart Sass's modern API deprecated, and its color-contrast() helper
// emits plain `@warn` calls (not deprecations) when it can't find a
// 4.5:1-contrast color in our theme. These all come from node_modules/bootstrap,
// not our own styles, so they're silenced here rather than fixed upstream.
// quietDeps + silenceDeprecations cover the deprecation warnings; the custom
// logger drops plain @warn/@debug messages whose source span points into
// node_modules while still printing anything raised from our own client/scss.
// https://github.com/silviogutierrez/reactivated/discussions/388
const quietVendorWarnings: SassLogger = {
  warn(message, options) {
    if (options.stack !== undefined && options.stack.includes("node_modules")) {
      return;
    }
    console.warn(message);
  },
};

// vite.config.ts runs under ESLint's default-project fallback (see eslint.config.ts
// allowDefaultProject), whose moduleResolution can't follow vite's package "exports" map,
// so defineConfig resolves untyped here even though it's fully typed under tsc.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ["color-functions", "import", "global-builtin"],
        logger: quietVendorWarnings,
      },
    },
  },
});
