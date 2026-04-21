const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

// Two builds: one minified (realistic prod output), one unminified
// (shows what tree-shaking alone kept vs. removed, before the minifier
// compresses the remainder).
//
// The minifier is SWC, invoked through terser-webpack-plugin — this
// matches the minifier used by the private repo whose numbers we're
// comparing against. SWC is less aggressive at cross-module dead-code
// elimination than terser's own minifier, which leaves more work for
// webpack's `sideEffects` tree-shaking to do, so the patch's effect
// shows up at a realistic magnitude.
module.exports = (env) => ({
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: env.raw ? 'bundle.unminified.js' : 'bundle.min.js',
  },
  optimization: {
    minimize: !env.raw,
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        terserOptions: { ecma: 2020, module: true },
      }),
    ],
  },
  resolve: {
    conditionNames: ['browser', 'import', 'default'],
  },
});
