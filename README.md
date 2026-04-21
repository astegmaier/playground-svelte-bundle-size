# playground-svelte-bundle-size

Minimal reproduction demonstrating the bundle-size impact of adding a
`"sideEffects"` field to Svelte's `package.json`. The change is upstream
candidate work — see the motivation section below.

## TL;DR

Two identical packages bundle `svelte/store` with webpack. They differ in
one thing: `test-svelte-patched` applies a `pnpm patch` to Svelte's
`package.json` that declares most of the package as side-effect-free.
That single change lets webpack tree-shake the unused parts of Svelte's
v5 runtime.

```
  metric          original         patched       savings
  ─────────────────────────────────────────────────────────────
  tree-shaken        280,760 B       43,041 B     237,719 B   (84.7%)
  minified            10,412 B        4,021 B       6,391 B   (61.4%)
```

The **tree-shaken** row is the direct signature of the patch working:
webpack drops 238 KB of Svelte source from the module graph. The
**minified** row shows the realistic production savings: 6.4 KB, in the
same ballpark as the ~6 KB minified savings observed in the original
private-repo measurements.

## Run it

```bash
pnpm test
```

That script:

1. Runs `pnpm install` in each package (applies the patch for the
   patched one — verify with
   `cat packages/test-svelte-patched/node_modules/svelte/package.json`).
2. Runs webpack twice per package — once with minification off (to
   reveal the tree-shaking effect directly), once with it on (realistic
   production output).
3. Prints a side-by-side comparison.

## Layout

```
playground-svelte-bundle-size/
├── package.json                 # root: just a test script
├── test.mjs                     # builds both and prints sizes
├── packages/
│   ├── test-svelte-original/    # plain svelte install
│   │   ├── package.json
│   │   ├── webpack.config.js
│   │   └── src/
│   │       ├── index.js
│   │       ├── stores/          # store factories (auth, router, theme, …)
│   │       ├── components/      # consumers that call .subscribe()
│   │       └── hooks/           # useSyncExternalStore-style adapter
│   └── test-svelte-patched/     # same code; pnpm patch on svelte
│       ├── package.json         # ← declares pnpm.patchedDependencies
│       ├── patches/svelte@5.55.4.patch
│       ├── webpack.config.js
│       └── src/                 # byte-identical to original
```

Each package is its own independent `pnpm` project (no workspace). This
keeps the two dependency graphs cleanly separate so the patch on one
can't leak into the other.

## The patch

`packages/test-svelte-patched/patches/svelte@5.55.4.patch`:

```diff
--- a/package.json
+++ b/package.json
@@ -19,6 +19,12 @@
   ],
   "module": "src/index-client.js",
   "main": "src/index-client.js",
+  "sideEffects": [
+    "./src/internal/disclose-version.js",
+    "./src/internal/flags/legacy.js",
+    "./src/internal/flags/async.js",
+    "./src/internal/flags/tracing.js"
+  ],
   "exports": {
```

This says: **every file in Svelte is side-effect-free, except these four
flag-setting modules.** The four exceptions mutate globals at import time
(`disclose-version.js` writes `window.__svelte`; the flag files toggle
runtime modes), so they must be preserved even when no one imports their
named exports.

### Why this claim is safe

Svelte's own CI already runs
[`check-treeshakeability.js`](https://github.com/sveltejs/svelte/blob/main/packages/svelte/scripts/check-treeshakeability.js)
before each publish. It walks `package.json#exports`, bundles
`import "svelte/<entry>"` through Rollup, and fails if the result isn't
empty. The upstream contract matches the `sideEffects` declaration
exactly — the patch just tells webpack what Rollup's CI has been
enforcing all along.

## What the demo code demonstrates

The demo mirrors how a private repo uses Svelte: only as a reactive
store library, called from non-Svelte code. Zero `.svelte` files. Store
factories live in `src/stores/` (auth, router, theme, workspaces, pages)
and return `{ subscribe, … }` wrappers. Consumer modules in
`src/components/` receive the stores as parameters and subscribe via a
`useSyncExternalStore`-style helper in `src/hooks/subscribeExternal.js`.
This is the pattern the real codebase uses to bridge Svelte stores to
React.

The demo imports exactly what the real codebase imports from
`svelte/store` (`writable`, `readable`, `derived`, `get`) and nothing
else.

## Why the minifier choice matters

The biggest factor in reproducing the 6 KB minified savings was matching
the real project's minifier. webpack's default minifier is **terser**,
which is extremely aggressive at cross-module dead-code elimination — in
a small self-contained bundle, terser can eliminate almost everything
that `sideEffects` would have eliminated anyway, leaving only ~440 B of
visible savings.

The private repo uses **SWC** via `TerserPlugin.swcMinify`. SWC is
faster but less aggressive at DCE across module boundaries. More
unreachable code survives into the final bundle, which is exactly the
code that `sideEffects` lets webpack remove earlier in the pipeline.

This demo's `webpack.config.js` uses the same SWC minifier, so the
numbers you see here line up with the real-repo numbers.

## Real-world validation

The private repo applies the same conceptual fix via webpack
`module.rules` (a downstream workaround equivalent to this upstream
patch). Measured in its production chunk that bundles `svelte/store`:

| Build                | Chunk size | vs baseline |
|----------------------|-----------:|------------:|
| Svelte v4 (baseline) | 38,255 B   | —           |
| Svelte v5, no fix    | 43,887 B   | +5,632 B    |
| **Svelte v5, fixed** | **37,858 B** | **−397 B**  |

The upstream `sideEffects` patch would save ~6 KB minified there and let
them delete the downstream webpack-rules workaround.

## Proposed upstream PR

This patch could go directly into
[`sveltejs/svelte`](https://github.com/sveltejs/svelte) at
`packages/svelte/package.json`. It's a ~5-line change with:

- A pre-existing CI contract (`check-treeshakeability.js`) that already
  enforces the invariant it declares.
- No runtime code changes.
- Universal bundler support — webpack, Rollup, Vite, esbuild all honor
  the `sideEffects` array form.

Existing issue for context (still open, not "no fix planned"):
[sveltejs/svelte#13855](https://github.com/sveltejs/svelte/issues/13855).
