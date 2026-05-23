import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { BrandMark } from "../../components/BrandMark";
import { fetchPublicCoachSite, type CoachPublicSiteRead } from "../../lib/coachSiteApi";
import { mediaSrc } from "../../lib/exerciseMediaApi";

function accentColor(site: CoachPublicSiteRead): string {
  const c = site.primary_color?.trim();
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return "#d97706";
}

export function CoachPublicSitePage() {
  const { slug = "" } = useParams();
  const [site, setSite] = useState<CoachPublicSiteRead | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicCoachSite(slug)
      .then((data) => {
        if (!cancelled) {
          setSite(data);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSite(null);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const color = useMemo(() => (site ? accentColor(site) : "#d97706"), [site]);
  const registerUrl = site ? `/client/register?invite=${encodeURIComponent(site.invite_code)}` : "/client/register";

  if (error) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h5" fontWeight={700}>
            Site not found
          </Typography>
          <Typography color="text.secondary">This coach page is not published or does not exist.</Typography>
          <Button component={RouterLink} to="/" variant="outlined">
            Back to Gym Coach
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!site) {
    return <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0b" }} />;
  }

  const { content: c } = site;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa", color: "#111" }}>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: alpha("#fff", 0.92),
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid",
          borderColor: alpha("#000", 0.08),
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          {site.logo_url ? (
            <Box component="img" src={mediaSrc(site.logo_url)} alt="" sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: "cover" }} />
          ) : (
            <BrandMark size={36} radius={8} />
          )}
          <Typography fontWeight={700}>{site.name}</Typography>
          <Button
            component={RouterLink}
            to={registerUrl}
            size="small"
            variant="contained"
            sx={{ ml: "auto", bgcolor: color, "&:hover": { bgcolor: color, filter: "brightness(0.92)" }, textTransform: "none" }}
          >
            {c.hero.cta_label || "Become a client"}
          </Button>
        </Container>
      </Box>

      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(color, 0.14)} 0%, ${alpha(color, 0.03)} 55%, transparent 100%)`,
          borderBottom: "1px solid",
          borderColor: alpha("#000", 0.06),
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, alignItems: "center" }}>
            <Stack spacing={2}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                {c.hero.headline || site.name}
              </Typography>
              <Typography sx={{ fontSize: 18, lineHeight: 1.65, color: "text.secondary", maxWidth: 560 }}>
                {c.hero.subheadline || site.tagline || ""}
              </Typography>
              <Box>
                <Button
                  component={RouterLink}
                  to={registerUrl}
                  variant="contained"
                  size="large"
                  sx={{ bgcolor: color, px: 3, textTransform: "none", fontWeight: 600, "&:hover": { bgcolor: color, filter: "brightness(0.92)" } }}
                >
                  {c.hero.cta_label || "Become a client"}
                </Button>
              </Box>
            </Stack>
            <Box
              sx={{
                minHeight: 280,
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: alpha(color, 0.08),
                border: "1px solid",
                borderColor: alpha(color, 0.2),
                backgroundImage: c.hero.hero_image_url ? `url(${mediaSrc(c.hero.hero_image_url)})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "center" }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5 }}>
              {c.about.title}
            </Typography>
            <Typography sx={{ lineHeight: 1.75, color: "text.secondary", whiteSpace: "pre-wrap" }}>
              {c.about.body}
            </Typography>
          </Box>
          <Box
            sx={{
              minHeight: 240,
              borderRadius: 3,
              bgcolor: alpha("#000", 0.04),
              backgroundImage: c.about.image_url ? `url(${mediaSrc(c.about.image_url)})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </Box>
      </Container>

      <Box sx={{ bgcolor: "#fff", borderTop: "1px solid", borderColor: alpha("#000", 0.06) }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
            Services
          </Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            {(c.services.length ? c.services : [{ title: "Coaching", description: "" }]).map((s, i) => (
              <Box
                key={`${s.title}-${i}`}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: alpha("#000", 0.08),
                  bgcolor: "#fafafa",
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  {s.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {s.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: alpha(color, 0.06), borderTop: "1px solid", borderColor: alpha(color, 0.15) }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Contact
          </Typography>
          <Stack spacing={0.75} sx={{ color: "text.secondary", mb: 3 }}>
            {c.contact.email ? <Typography>{c.contact.email}</Typography> : null}
            {c.contact.phone ? <Typography>{c.contact.phone}</Typography> : null}
            {c.contact.instagram ? <Typography>Instagram: {c.contact.instagram}</Typography> : null}
            {c.contact.whatsapp ? <Typography>WhatsApp: {c.contact.whatsapp}</Typography> : null}
          </Stack>
          <Button component={RouterLink} to={registerUrl} variant="contained" sx={{ bgcolor: color, textTransform: "none", "&:hover": { bgcolor: color, filter: "brightness(0.92)" } }}>
            {c.hero.cta_label || "Become a client"}
          </Button>
        </Container>
      </Box>

      <Box sx={{ py: 2, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Powered by Gym Coach
        </Typography>
      </Box>
    </Box>
  );
}
