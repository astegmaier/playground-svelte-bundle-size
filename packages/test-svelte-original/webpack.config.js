const path = require('path');

// Two builds: one minified (realistic prod output), one unminified
// (shows what tree-shaking alone kept vs. removed, before terser
// compresses the remainder).
module.exports = (env) => ({
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: env.raw ? 'bundle.unminified.js' : 'bundle.min.js',
  },
  optimization: {
    minimize: !env.raw,
  },
  resolve: {
    // svelte ships source files directly; its package.json "exports" map
    // uses "browser" / "default" conditions. We want the browser entry so
    // the tree-shakable client runtime is used.
    conditionNames: ['browser', 'import', 'default'],
  },
});
