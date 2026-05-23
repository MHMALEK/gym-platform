import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { apiClientPromotions, type ClientPromotion } from "../../lib/clientPortalApi";
import { formatMoney } from "../../lib/money";

export function ClientPromotionsPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ClientPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClientPromotions()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack spacing={2}>
      <Button component={RouterLink} to="/client" startIcon={<ArrowBackIcon />} sx={{ alignSelf: "flex-start" }}>
        {t("clientPortal.backHome")}
      </Button>
      <Typography variant="h5">{t("clientPortal.promotionsTitle")}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t("clientPortal.promotionsSubtitle")}
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          …
        </Typography>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("clientPortal.noPromotions")}
        </Typography>
      ) : (
        items.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Typography variant="h6">{p.title}</Typography>
                  {p.body ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {p.body}
                    </Typography>
                  ) : null}
                  {p.duration_days ? (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {t("clientPortal.promotionDuration", { days: p.duration_days })}
                    </Typography>
                  ) : null}
                </Box>
                {p.savings_pct ? <Chip size="small" color="success" label={`-${p.savings_pct}%`} /> : null}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1.5 }}>
                {p.discount_price != null ? (
                  <>
                    <Typography variant="h6" color="success.main">
                      {formatMoney(p.discount_price, p.currency, i18n.language)}
                    </Typography>
                    {p.price != null ? (
                      <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                        {formatMoney(p.price, p.currency, i18n.language)}
                      </Typography>
                    ) : null}
                  </>
                ) : p.price != null ? (
                  <Typography variant="h6">{formatMoney(p.price, p.currency, i18n.language)}</Typography>
                ) : null}
              </Stack>
              <Button component={RouterLink} to="/client/messages" size="small" sx={{ mt: 1.5 }}>
                {t("clientPortal.askCoachAboutPlan")}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </Stack>
  );
}
