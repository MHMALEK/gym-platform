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
  MessageCircle,
  Receipt,
  Sparkles,
  Wallet,
  Wand2,
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

type Pillar = {
  id: string;
  icon: ReactNode;
  titleKey: string;
  descKey: string;
  bullets: string[];
  accent: string;
};

type MiniFeature = {
  icon: ReactNode;
  titleKey: string;
  descKey: string;
};

const PILLARS: Pillar[] = [
  {
    id: "ai",
    icon: <Bot size={26} strokeWidth={2} />,
    titleKey: "landing.pillars.ai.title",
    descKey: "landing.pillars.ai.desc",
    bullets: ["landing.pillars.ai.b1", "landing.pillars.ai.b2", "landing.pillars.ai.b3"],
    accent: "#818cf8",
  },
  {
    id: "finance",
    icon: <Wallet size={26} strokeWidth={2} />,
    titleKey: "landing.pillars.finance.title",
    descKey: "landing.pillars.finance.desc",
    bullets: ["landing.pillars.finance.b1", "landing.pillars.finance.b2", "landing.pillars.finance.b3"],
    accent: "#38bdf8",
  },
  {
    id: "programs",
    icon: <Wand2 size={26} strokeWidth={2} />,
    titleKey: "landing.pillars.programs.title",
    descKey: "landing.pillars.programs.desc",
    bullets: ["landing.pillars.programs.b1", "landing.pillars.programs.b2", "landing.pillars.programs.b3"],
    accent: "#f59e0b",
  },
];

const MINI_FEATURES: MiniFeature[] = [
  { icon: <Dumbbell size={20} />, titleKey: "landing.mini.trainingLog.title", descKey: "landing.mini.trainingLog.desc" },
  { icon: <MessageCircle size={20} />, titleKey: "landing.mini.messaging.title", descKey: "landing.mini.messaging.desc" },
  { icon: <ClipboardList size={20} />, titleKey: "landing.mini.desk.title", descKey: "landing.mini.desk.desc" },
  { icon: <Sparkles size={20} />, titleKey: "landing.mini.clientUx.title", descKey: "landing.mini.clientUx.desc" },
];

function PillarCard({ pillar, t, isDark }: { pillar: Pillar; t: (k: string) => string; isDark: boolean }) {
  return (
    <Box
      id={pillar.id}
      sx={{
        p: { xs: 2.5, md: 3 },
        height: "100%",
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#fff", 0.85),
        backdropFilter: "blur(12px)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          borderColor: alpha(pillar.accent, 0.5),
          boxShadow: `0 16px 48px -20px ${alpha(pillar.accent, 0.35)}`,
        },
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2.5,
          display: "grid",
          placeItems: "center",
          mb: 2,
          color: pillar.accent,
          bgcolor: alpha(pillar.accent, isDark ? 0.16 : 0.12),
        }}
      >
        {pillar.icon}
      </Box>
      <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
        {t(pillar.titleKey)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
        {t(pillar.descKey)}
      </Typography>
      <Stack spacing={1}>
        {pillar.bullets.map((key) => (
          <Stack key={key} direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: pillar.accent, mt: 0.85, flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
              {t(key)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function HeroPreview({ isDark, t }: { isDark: boolean; t: (k: string) => string }) {
  return (
    <Box
      sx={{
        borderRadius: 4,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        bgcolor: isDark ? alpha("#fff", 0.04) : "#fff",
        boxShadow: isDark
          ? "0 24px 80px -24px rgba(0,0,0,0.65)"
          : "0 24px 64px -28px rgba(15,23,42,0.18)",
      }}
    >
      <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", bgcolor: isDark ? alpha("#fff", 0.03) : "#f4f4f5" }}>
        <Typography variant="caption" color="text.secondary">
          {t("landing.preview.window")}
        </Typography>
      </Box>
      <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: alpha("#818cf8", 0.35),
            bgcolor: alpha("#818cf8", isDark ? 0.1 : 0.06),
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Sparkles size={16} color="#818cf8" />
            <Typography variant="caption" fontWeight={700} color="primary.main">
              {t("landing.preview.aiLabel")}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {t("landing.preview.aiPrompt")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("landing.preview.aiReply")}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
              <Receipt size={14} />
              <Typography variant="caption" fontWeight={700}>
                {t("landing.preview.financeLabel")}
              </Typography>
            </Stack>
            <Typography variant="h6" fontWeight={800} color="error.main">
              2
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("landing.preview.financeMeta")}
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider" }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
              <Dumbbell size={14} />
              <Typography variant="caption" fontWeight={700}>
                {t("landing.preview.programLabel")}
              </Typography>
            </Stack>
            <Typography variant="body2" fontWeight={600}>
              {t("landing.preview.programMeta")}
            </Typography>
            <Typography variant="caption" color="success.main" fontWeight={600}>
              {t("landing.preview.programTag")}
            </Typography>
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
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(129, 140, 248, 0.2) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 90% 10%, rgba(245, 158, 11, 0.14) 0%, transparent 50%),
        linear-gradient(180deg, ${coachBrand.layoutBg} 0%, #07090d 50%, ${coachBrand.layoutBg} 100%)
      `
    : `
        radial-gradient(ellipse 85% 55% at 15% -8%, ${alpha("#818cf8", 0.18)} 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 95% 5%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 50%),
        linear-gradient(180deg, ${coachBrandLight.layoutBg} 0%, #eef2f7 45%, ${coachBrandLight.layoutBg} 100%)
      `;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
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
            <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1 }}>
              <Button component="a" href="#ai" size="small" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                {t("landing.navAi")}
              </Button>
              <Button component="a" href="#finance" size="small" sx={{ display: { xs: "none", md: "inline-flex" } }}>
                {t("landing.navFinance")}
              </Button>
              <ThemeSwitcher />
              <LanguageSwitcher />
              {isCoachLoggedIn ? (
                <Button component={RouterLink} to="/desk" size="small" variant="contained">
                  {t("landing.navDashboard")}
                </Button>
              ) : (
                <Button component={RouterLink} to="/login" size="small" variant="contained">
                  {t("landing.navCoach")}
                </Button>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ background: shellBg, pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" }, gap: { xs: 4, md: 6 }, alignItems: "center" }}>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em", mb: 1.5, display: "block" }}>
                {t("landing.eyebrow")}
              </Typography>
              <Typography
                variant="h2"
                component="h1"
                sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, fontSize: { xs: "2.25rem", sm: "2.85rem", md: "3.35rem" }, mb: 2 }}
              >
                {t("landing.heroTitle")}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.65, mb: 3.5, maxWidth: 540 }}>
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
                  { value: "AI", label: t("landing.statAi") },
                  { value: "Auto", label: t("landing.statBilling") },
                  { value: "Log", label: t("landing.statTraining") },
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
            <HeroPreview isDark={isDark} t={t} />
          </Box>
        </Container>
      </Box>

      {/* Pillars */}
      <Box id="features" sx={{ py: { xs: 7, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 5, maxWidth: 720, mx: "auto" }}>
            <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing="0.1em">
              {t("landing.pillarsEyebrow")}
            </Typography>
            <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mt: 1, mb: 1.5 }}>
              {t("landing.pillarsTitle")}
            </Typography>
            <Typography color="text.secondary">{t("landing.pillarsSubtitle")}</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5 }}>
            {PILLARS.map((pillar) => (
              <PillarCard key={pillar.id} pillar={pillar} t={t} isDark={isDark} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* Mini features + client UX */}
      <Box sx={{ py: { xs: 7, md: 9 }, bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#fff", 0.55), borderTop: 1, borderBottom: 1, borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.1fr" }, gap: { xs: 4, md: 6 }, alignItems: "start" }}>
            <Box>
              <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing="0.1em">
                {t("landing.clientSectionEyebrow")}
              </Typography>
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" sx={{ mt: 1, mb: 1.5 }}>
                {t("landing.clientSectionTitle")}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.7 }}>
                {t("landing.clientSectionSubtitle")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
                {[t("landing.clientTagPlans"), t("landing.clientTagLog"), t("landing.clientTagPay")].map((tag) => (
                  <Box key={tag} sx={{ px: 1.5, py: 0.5, borderRadius: 99, border: 1, borderColor: "divider", fontSize: 13, fontWeight: 600 }}>
                    {tag}
                  </Box>
                ))}
              </Stack>
              <Button component={RouterLink} to="/client/login" variant="contained" sx={{ borderRadius: 2 }}>
                {t("landing.ctaClientPortal")}
              </Button>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              {MINI_FEATURES.map((item) => (
                <Box key={item.titleKey} sx={{ p: 2, borderRadius: 2.5, border: 1, borderColor: "divider", bgcolor: isDark ? alpha("#fff", 0.03) : "#fff" }}>
                  <Box sx={{ color: "primary.main", mb: 1 }}>{item.icon}</Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {t(item.titleKey)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {t(item.descKey)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer CTA */}
      <Box sx={{ py: { xs: 6, md: 8 }, background: isDark ? `linear-gradient(135deg, ${alpha("#818cf8", 0.12)} 0%, transparent 60%)` : `linear-gradient(135deg, ${alpha("#6366f1", 0.08)} 0%, transparent 60%)` }}>
        <Container maxWidth="sm" sx={{ textAlign: "center" }}>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
            {t("landing.footerTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
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
