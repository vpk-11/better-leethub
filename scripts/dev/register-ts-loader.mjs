import { register } from 'node:module';

// import.meta.url is already a file:// URL string - register()'s second argument wants
// exactly that as the base to resolve the hook module's relative specifier against.
register('./ts-specifier-loader.mjs', import.meta.url);
