import { useEffect } from "react";

import { HUB_FONTS, hubStylesheets, type HubTheme } from "./hubAssets";

type HubPageOptions = {
  bodyClass?: string;
  loadScripts?: boolean;
};

const HUB_SCRIPTS = [
  "vendors/jquery.min.js",
  "vendors/bootstrap/js/bootstrap.min.js",
  "js/theme.min.js",
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(el);
  });
}

/** Mount Hub HTML template CSS (and optional JS) for a public marketing page. */
export function useHubPage(theme: HubTheme, options: HubPageOptions = {}) {
  const { bodyClass = "", loadScripts = true } = options;

  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const sheets = [...hubStylesheets(theme), HUB_FONTS];

    for (const href of sheets) {
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      links.push(link);
    }

    const prevBodyClass = document.body.className;
    if (bodyClass) {
      document.body.className = bodyClass;
    }

    let cancelled = false;
    if (loadScripts) {
      void (async () => {
        try {
          for (const rel of HUB_SCRIPTS) {
            if (cancelled) return;
            await loadScript(`/hub/assets/${rel}`);
          }
        } catch {
          // Hub animations are optional; layout works with CSS alone.
        }
      })();
    }

    return () => {
      cancelled = true;
      for (const link of links) {
        link.remove();
      }
      document.body.className = prevBodyClass;
    };
  }, [theme, bodyClass, loadScripts]);
}
