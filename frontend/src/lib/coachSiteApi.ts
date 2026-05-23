import { apiPrefix, authHeaders } from "./api";

export type CoachSiteHero = {
  headline: string;
  subheadline: string;
  cta_label: string;
  hero_image_url: string | null;
};

export type CoachSiteAbout = {
  title: string;
  body: string;
  image_url: string | null;
};

export type CoachSiteService = {
  title: string;
  description: string;
};

export type CoachSiteContact = {
  email: string;
  phone: string;
  instagram: string;
  whatsapp: string;
};

export type CoachSiteContent = {
  hero: CoachSiteHero;
  about: CoachSiteAbout;
  services: CoachSiteService[];
  contact: CoachSiteContact;
};

export type CoachSiteCoachRead = {
  public_slug: string | null;
  site_published: boolean;
  content: CoachSiteContent;
  preview_path: string | null;
};

export type CoachPublicSiteRead = {
  slug: string;
  name: string;
  tagline: string | null;
  primary_color: string | null;
  logo_url: string | null;
  invite_code: string;
  content: CoachSiteContent;
};

export async function fetchMyCoachSite(): Promise<CoachSiteCoachRead> {
  const res = await fetch(`${apiPrefix}/me/site`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CoachSiteCoachRead>;
}

export async function patchMyCoachSite(body: {
  public_slug?: string | null;
  site_published?: boolean;
  content?: CoachSiteContent;
}): Promise<CoachSiteCoachRead> {
  const res = await fetch(`${apiPrefix}/me/site`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CoachSiteCoachRead>;
}

export async function fetchPublicCoachSite(slug: string): Promise<CoachPublicSiteRead> {
  const res = await fetch(`${apiPrefix}/public/site/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CoachPublicSiteRead>;
}
