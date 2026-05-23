import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Apple,
  Bot,
  ClipboardList,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Library,
  MessageCircle,
  MessagesSquare,
  Plug,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { BrandMark } from "../../components/BrandMark";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { getUserRole } from "../../lib/authApi";
import { coachBrand, coachBrandLight } from "../../theme/brand";
import { useThemeMode } from "../../theme/ThemeModeContext";

type FeatureItem = {
  icon: ReactNode;
  titleKey: string;
  descKey: string;
  accent: string;
};

const COACH_FEATURES: FeatureItem[] = [
  { icon: <Users size={22} />, titleKey: "landing.features.clients.title", descKey: "landing.features.clients.desc", accent: "#22c55e" },
  { icon: <Dumbbell size={22} />, titleKey: "landing.features.workouts.title", descKey: "landing.features.workouts.desc", accent: "#f59e0b" },
  { icon: <Apple size={22} />, titleKey: "landing.features.nutrition.title", descKey: "landing.features.nutrition.desc", accent: "#84cc16" },
  { icon: <FileText size={22} />, titleKey: "landing.features.invoices.title", descKey: "landing.features.invoices.desc", accent: "#38bdf8" },
  { icon: <MessagesSquare size={22} />, titleKey: "landing.features.messages.title", descKey: "landing.features.messages.desc", accent: "#a78bfa" },
  { icon: <ClipboardList size={22} />, titleKey: "landing.features.memberships.title", descKey: "landing.features.memberships.desc", accent: "#fb7185" },
  { icon: <Library size={22} />, titleKey: "landing.features.library.title", descKey: "landing.features.library.desc", accent: "#2dd4bf" },
  { icon: <LayoutDashboard size={22} />, titleKey: "landing.features.dashboard.title", descKey: "landing.features.dashboard.desc", accent: "#fbbf24" },
  { icon: <Bot size={22} />, titleKey: "landing.features.ai.title", descKey: "landing.features.ai.desc", accent: "#818cf8" },
  { icon: <Plug size={22} />, titleKey: "landing.features.mcp.title", descKey: "landing.features.mcp.desc", accent: "#94a3b8" },
];

const CLIENT_FEATURES: FeatureItem[] = [
  { icon: <Dumbbell size={20} />, titleKey: "landing.clientFeatures.plans.title", descKey: "landing.clientFeatures.plans.desc", accent: "#f59e0b" },
  { icon: <ClipboardList size={20} />, titleKey: "landing.clientFeatures.log.title", descKey: "landing.clientFeatures.log.desc", accent: "#22c55e" },
  { icon: <FileText size={20} />, titleKey: "landing.clientFeatures.invoices.title", descKey: "landing.clientFeatures.invoices.desc", accent: "#38bdf8" },
  { icon: <MessageCircle size={20} />, titleKey: "landing.clientFeatures.chat.title", descKey: "landing.clientFeatures.chat.desc", accent: "#a78bfa" },
  { icon: <Sparkles size={20} />, titleKey: "landing.clientFeatures.promos.title", descKey: "landing.clientFeatures.promos.desc", accent: "#fb7185" },
  { icon: <Smartphone size={20} />, titleKey: "landing.clientFeatures.mobile.title", descKey: "landing.clientFeatures.mobile.desc", accent: "#2dd4bf" },
];

function FeatureCard({ item, t }: { item: FeatureItem; t: (k: string) => string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 2.5,
        height: "100%",
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#fff", 0.72),
        backdropFilter: "blur(12px)",
        transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: alpha(item.accent, 0.45),
          boxShadow: `0 12px 40px -16px ${alpha(item.accent, 0.35)}`,
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          mb: 1.5,
          color: item.accent,
          bgcolor: alpha(item.accent, isDark ? 0.14 : 0.12),
        }}
      >
        {item.icon}
      </Box>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {t(item.titleKey)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
        {t(item.descKey)}
      </Typography>
    </Box>
  );
}

function HeroPreview({ isDark }: { isDark: boolean }) {
  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 4,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        bgcolor: isDark ? alpha("#fff", 0.04) : "#fff",
        boxShadow: isDark
          ? "0 24px 80px -24px rgba(0,0,0,0.65)"
          : "0 24px 64px -28px rgba(15,23,42,0.18)",
        minHeight: { xs: 280, md: 360 },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#f4f4f5", 0.9),
        }}
      >
        <Box sx={{ display: "flex", gap: 0.75 }}>
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c, opacity: 0.85 }} />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          coach.gym / desk
        </Typography>
      </Box>
      <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" }, gap: 2 }}>
        <Stack spacing={1}>
          {["Desk", "Clients", "Plans", "Invoices", "Messages"].map((label, i) => (
            <Box
              key={label}
              sx={{
                px: 1.25,
                py: 0.75,
                borderRadius: 1.5,
                fontSize: 12,
                fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? "primary.main" : "text.secondary",
                bgcolor: i === 0 ? alpha("#f59e0b", isDark ? 0.14 : 0.1) : "transparent",
              }}
            >
              {label}
            </Box>
          ))}
        </Stack>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Today
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            3 clients · 2 invoices due
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25 }}>
            {[
              { name: "Sara M.", tag: "Workout ready", color: "#22c55e" },
              { name: "Ali R.", tag: "Invoice overdue", color: "#f87171" },
              { name: "Neda K.", tag: "New message", color: "#a78bfa" },
            ].map((row) => (
              <Box
                key={row.name}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {row.name}
                </Typography>
                <Typography variant="caption" sx={{ color: row.color, fontWeight: 600 }}>
                  {row.tag}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const brand = isDark ? coachBrand : coachBrandLight;

  const isCoachLoggedIn =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("access_token")) &&
    getUserRole() === "coach";

  const shellBg = isDark
    ? `
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(245, 158, 11, 0.18) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 90% 10%, rgba(34, 197, 94, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse 50% 30% at 50% 100%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
        linear-gradient(180deg, ${coachBrand.layoutBg} 0%, #07090d 50%, ${coachBrand.layoutBg} 100%)
      `
    : `
        radial-gradient(ellipse 85% 55% at 15% -8%, ${alpha(theme.palette.primary.main, 0.22)} 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 95% 5%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
        linear-gradient(180deg, ${coachBrandLight.layoutBg} 0%, #eef2f7 45%, ${coachBrandLight.layoutBg} 100%)
      `;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* Nav */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: 1,
          borderColor: alpha(brand.border, 0.8),
          bgcolor: isDark ? alpha(coachBrand.layoutBg, 0.82) : alpha("#fff", 0.82),
          backdropFilter: "blur(16px)",
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5, gap: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.25} component={RouterLink} to="/" sx={{ textDecoration: "none", color: "inherit" }}>
              <BrandMark size={34} contrast={isDark ? coachBrand.layoutBg : "#fff"} />
              <Typography fontWeight={800} letterSpacing="-0.02em">
                {t("app.title")}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }} sx={{ flexShrink: 0 }}>
              <ThemeSwitcher />
              <LanguageSwitcher />
              {isCoachLoggedIn ? (
                <Button component={RouterLink} to="/desk" size="small" variant="contained" sx={{ ml: { sm: 0.5 } }}>
                  {t("landing.navDashboard")}
                </Button>
              ) : (
                <Button component={RouterLink} to="/login" size="small" variant="contained" sx={{ ml: { sm: 0.5 } }}>
                  {t("landing.navCoach")}
                </Button>
              )}
              <Button
                component={RouterLink}
                to="/client/login"
                size="small"
                variant="text"
                sx={{ display: { xs: "none", md: "inline-flex" }, minWidth: 0 }}
              >
                {t("landing.navClient")}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ background: shellBg, pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 4, md: 6 },
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  mb: 1.5,
                  display: "block",
                }}
              >
                {t("landing.eyebrow")}
              </Typography>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  fontSize: { xs: "2.25rem", sm: "2.75rem", md: "3.25rem" },
                  mb: 2,
                }}
              >
                {t("landing.heroTitle")}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.65, mb: 3.5, maxWidth: 520 }}>
                {t("landing.heroSubtitle")}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button component={RouterLink} to="/login" variant="contained" size="large" sx={{ px: 3, borderRadius: 2 }}>
                  {t("landing.ctaCoach")}
                </Button>
                <Button component={RouterLink} to="/client/login" variant="outlined" size="large" sx={{ px: 3, borderRadius: 2 }}>
                  {t("landing.ctaClient")}
                </Button>
              </Stack>
              <Stack direction="row" spacing={3} sx={{ mt: 4, flexWrap: "wrap", gap: 2 }}>
                {[
                  { value: "10+", label: t("landing.statFeatures") },
                  { value: "2", label: t("landing.statApps") },
                  { value: "fa/en", label: t("landing.statLang") },
                ].map((s) => (
                  <Box key={s.label}>
                    <Typography variant="h5" fontWeight={800} color="primary.main">
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <HeroPreview isDark={isDark} />
          </Box>
        </Container>
      </Box>

      {/* Coach features */}
      <Box id="features" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 5, maxWidth: 640, mx: "auto" }}>
            <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing="0.1em">
              {t("landing.coachSectionEyebrow")}
            </Typography>
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mt: 1, mb: 1.5 }}>
              {t("landing.coachSectionTitle")}
            </Typography>
            <Typography color="text.secondary">{t("landing.coachSectionSubtitle")}</Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(5, 1fr)" },
              gap: 2,
            }}
          >
            {COACH_FEATURES.map((item) => (
              <Box key={item.titleKey} sx={{ gridColumn: { lg: "span 1" } }}>
                <FeatureCard item={item} t={t} />
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Client section */}
      <Box
        sx={{
          py: { xs: 7, md: 10 },
          bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#fff", 0.55),
          borderTop: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1.1fr" },
              gap: { xs: 4, md: 6 },
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing="0.1em">
                {t("landing.clientSectionEyebrow")}
              </Typography>
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mt: 1, mb: 1.5 }}>
                {t("landing.clientSectionTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                {t("landing.clientSectionSubtitle")}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button component={RouterLink} to="/client/login" variant="contained" sx={{ borderRadius: 2 }}>
                  {t("landing.ctaClientPortal")}
                </Button>
                <Button component={RouterLink} to="/client/register" variant="text" sx={{ borderRadius: 2 }}>
                  {t("landing.ctaClientRegister")}
                </Button>
              </Stack>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              {CLIENT_FEATURES.map((item) => (
                <FeatureCard key={item.titleKey} item={item} t={t} />
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Platforms */}
      <Box sx={{ py: { xs: 7, md: 9 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
            {t("landing.platformsTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
            {t("landing.platformsSubtitle")}
          </Typography>
          <Stack direction="row" justifyContent="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            {[t("landing.platformCoachWeb"), t("landing.platformClientWeb"), t("landing.platformClientMobile"), t("landing.platformMcp")].map(
              (label) => (
                <Box
                  key={label}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 99,
                    border: 1,
                    borderColor: "divider",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "text.secondary",
                  }}
                >
                  {label}
                </Box>
              ),
            )}
          </Stack>
        </Container>
      </Box>

      {/* Footer CTA */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          background: isDark
            ? `linear-gradient(135deg, ${alpha("#f59e0b", 0.12)} 0%, transparent 60%)`
            : `linear-gradient(135deg, ${alpha("#d97706", 0.1)} 0%, transparent 60%)`,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
            {t("landing.footerTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t("landing.footerSubtitle")}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button component={RouterLink} to="/login" variant="contained" size="large" sx={{ borderRadius: 2 }}>
              {t("landing.ctaCoach")}
            </Button>
            <Button component={RouterLink} to="/register" variant="outlined" size="large" sx={{ borderRadius: 2 }}>
              {t("landing.ctaSignUp")}
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box component="footer" sx={{ py: 3, borderTop: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <BrandMark size={24} contrast={isDark ? coachBrand.layoutBg : "#fff"} />
              <Typography variant="body2" color="text.secondary">
                {t("landing.footerCopy")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button component={RouterLink} to="/login" size="small" color="inherit">
                {t("login.signIn")}
              </Button>
              <Button component={RouterLink} to="/client/login" size="small" color="inherit">
                {t("clientAuth.clientPortal")}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
