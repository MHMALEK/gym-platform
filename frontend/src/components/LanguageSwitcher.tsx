import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useTranslation } from "react-i18next";

type LanguageSwitcherProps = {
  /** Full-width row under the title (sidebar layout title). */
  layout?: "default" | "sider";
};

/** Compact language control; Persian default, English ready for future use. */
export function LanguageSwitcher({ layout = "default" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();

  const value = i18n.language.startsWith("fa") ? "fa" : "en";
  const fullWidth = layout === "sider";

  return (
    <FormControl
      size="small"
      fullWidth={fullWidth}
      sx={{ minWidth: fullWidth ? 0 : 118, maxWidth: "100%" }}
    >
      <Select
        value={value}
        onChange={(e) => void i18n.changeLanguage(String(e.target.value))}
        displayEmpty
        inputProps={{ "aria-label": t("language.switch") }}
      >
        <MenuItem value="fa">{t("language.fa")}</MenuItem>
        <MenuItem value="en">{t("language.en")}</MenuItem>
      </Select>
    </FormControl>
  );
}
