/**
 * Node module-resolution hook (registered by register-ts-loader.mjs) for the test suite only.
 * Source imports use the explicit `.js` ESM specifier even for files that are `.ts` on disk
 * (webpack resolves that via extensionAlias in webpack.config.js - see that file's comment)
 * but plain Node, running spec files directly via jasmine, has no equivalent extension
 * remapping built in. Falls back from `.js` to `.ts` only when the `.js` file genuinely
 * doesn't exist - real missing-module errors for any other specifier still throw normally.
 * Node's own native TypeScript support (unflagged since Node 23.6) handles actually loading
 * the resolved `.ts` file's syntax - this hook only fixes resolution, not transforms.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND' && specifier.endsWith('.js')) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    throw err;
  }
}
