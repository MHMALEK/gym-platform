const HUB_BASE = "/hub/assets";

/** Resolve a path inside the copied Hub HTML template assets folder. */
export function hubAsset(path: string): string {
  const normalized = path.replace(/^\.\/?assets\//, "").replace(/^\//, "");
  return `${HUB_BASE}/${normalized}`;
}

export type HubTheme = "saas" | "modern-business";

const HUB_CSS: Record<HubTheme, string[]> = {
  saas: [
    "vendors/liquid-icon/lqd-essentials/lqd-essentials.min.css",
    "css/theme.min.css",
    "css/utility.min.css",
    "css/demo/saas.css",
  ],
  "modern-business": [
    "vendors/liquid-icon/lqd-essentials/lqd-essentials.min.css",
    "css/theme.min.css",
    "css/utility.min.css",
    "css/demo/modern-business/base.css",
    "css/demo/modern-business/modern-business.css",
  ],
};

export function hubStylesheets(theme: HubTheme): string[] {
  return HUB_CSS[theme].map((p) => hubAsset(p));
}

export const HUB_FONTS =
  "https://fonts.googleapis.com/css2?family=Chivo&family=Inter:wght@400;500;600;700&display=swap";
