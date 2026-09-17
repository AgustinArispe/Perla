import type { Plugin } from 'vite';

// React Fast Refresh injects an inline preamble in development only.
// Packaged builds retain script-src 'self' in index.html.
export function developmentCsp(): Plugin {
  return {
    name: 'bocha-development-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';");
    },
  };
}
