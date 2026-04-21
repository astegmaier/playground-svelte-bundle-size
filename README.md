# playground-svelte-bundle-size

Minimal reproduction demonstrating the bundle-size regression introduced
by the Svelte v4 → v5 upgrade when using the package only as a reactive
store library, and the recovery from adding a `"sideEffects"` field to
Svelte's `package.json`. The patch is upstream candidate work — see the
motivation section below.

## TL;DR

Three packages bundle the exact same 12-line `src/index.js` (imports
`writable` / `readable` / `derived` / `get` from `svelte/store` and uses
each) with webpack + SWC. The only thing that varies is which Svelte
install they pull in:

| package                  | Svelte version                   |
| ------------------------ | -------------------------------- |
| `test-svelte-v4`         | 4.2.20 (pre-regression baseline) |
| `test-svelte-v5`         | 5.55.4 (stock)                   |
| `test-svelte-v5-patched` | 5.55.4 + `sideEffects` patch     |

```
 metric                 svelte v4         svelte v5        v5 patched
 ────────────────────────────────────────────────────────────────────
 tree-shaken      113,590 B         273,632 B          35,913 B
 minified           2,000 B           7,726 B           1,490 B

  vs. svelte v4 baseline (minified):
    svelte v4              0 B (0.0%)
    svelte v5      +   5,726 B (286.3%)
    v5 patched     −     510 B (-25.5%)

  vs. svelte v5 unpatched (minified):
    svelte v4      −   5,726 B (-74.1%)
    svelte v5              0 B (0.0%)
    v5 patched     −   6,236 B (-80.7%)
```

Upgrading from Svelte 4 to Svelte 5 adds **5.7 KB** minified to this
bundle — because v5 rebuilt its stores on top of the signals runtime,
which webpack can't fully tree-shake without a `sideEffects`
declaration. Applying the patch eliminates that regression and lands
**510 B below** the v4 baseline.

## Run it

```bash
pnpm test
```

That script installs and builds all three packages, then prints the
comparison above. Each package owns its own `pnpm` lockfile, so `pnpm
install` stays scoped to that package's deps — the `test-svelte-v5-patched`
pnpm patch only touches the svelte install under that directory.

## Layout

```
playground-svelte-bundle-size/
├── package.json                      # root: install:all / build:all / test
├── test.mjs                          # builds all three and prints sizes
└── packages/
    ├── test-svelte-v4/               # Svelte 4.2.20
    │   ├── package.json
    │   ├── webpack.config.js
    │   └── src/index.js
    ├── test-svelte-v5/               # Svelte 5.55.4 (stock)
    │   ├── package.json
    │   ├── webpack.config.js
    │   └── src/index.js
    └── test-svelte-v5-patched/       # Svelte 5.55.4 + pnpm patch
        ├── package.json              # ← declares pnpm.patchedDependencies
        ├── patches/svelte@5.55.4.patch
        ├── webpack.config.js
        └── src/index.js              # byte-identical to the others
```

All three `src/index.js` files are byte-identical. All three
`webpack.config.js` files are byte-identical and use SWC as the
minimizer (matching the real production app whose numbers these line up
with).

## The patch

`packages/test-svelte-v5-patched/patches/svelte@5.55.4.patch`:

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

This tells bundlers: **every file in Svelte is side-effect-free except
these four flag-setting modules.** The four exceptions mutate globals at
import time (`disclose-version.js` writes `window.__svelte`; the flag
files toggle runtime modes), so they must be preserved even when no one
imports their named exports.

### Why this claim is safe

Svelte's own CI already runs
[`check-treeshakeability.js`](https://github.com/sveltejs/svelte/blob/main/packages/svelte/scripts/check-treeshakeability.js)
before each publish. It walks `package.json#exports`, bundles
`import "svelte/<entry>"` through Rollup, and fails if the result isn't
empty. The upstream contract matches the `sideEffects` declaration
exactly — the patch just tells webpack what Rollup's CI has been
enforcing all along.

## What the demo code demonstrates

`src/index.js` mirrors how a private repo uses Svelte: only as a
reactive store library, called from non-Svelte code. Zero `.svelte`
files. It imports exactly what the real codebase imports from
`svelte/store` (`writable`, `readable`, `derived`, `get`) and exercises
each one. The savings come from the patch interacting with webpack and
SWC, not from how elaborate the app code is — a 12-line demo shows the
same delta as a multi-module version.

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

A production application's webpack build shows the same pattern, in a
larger chunk that bundles `svelte/store`:

| build                | chunk size   | vs v4 baseline |
|----------------------|-------------:|---------------:|
| Svelte v4 (baseline) | 38,255 B     | —              |
| Svelte v5, no fix    | 43,887 B     | +5,632 B       |
| **Svelte v5, fixed** | **37,858 B** | **−397 B**     |

Both the ~5.6 KB regression and the recovery-below-baseline match this
demo's numbers closely — evidence that the mechanism is general, not an
artifact of this particular reproduction.

## Proposed upstream PR

This patch could go directly into
[`sveltejs/svelte`](https://github.com/sveltejs/svelte) at
`packages/svelte/package.json`. It's a ~5-line change with:

- A pre-existing CI contract (`check-treeshakeability.js`) that already
  enforces the invariant it declares.
- No runtime code changes.
- Universal bundler support — webpack, Rollup, Vite, esbuild all honor
  the `sideEffects` array form.

Existing issue for context:
[sveltejs/svelte#13855](https://github.com/sveltejs/svelte/issues/13855).
