/* Firefox only. Firefox's content_scripts "world": "MAIN" landed in Firefox 128, but the
   Firefox build targets 109+ (browser_specific_settings.gecko.strict_min_version), so it
   can't rely on that key. This runs as a normal isolated-world content script at
   document_start and self-injects interceptor.js via a <script src> tag, which executes in
   true page (MAIN world) context - so interceptor.js itself stays byte-identical between
   the Chrome build (which uses "world": "MAIN" directly) and this one. */
const script = document.createElement('script');
script.src = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL(
  'scripts/interceptor.js'
);
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
