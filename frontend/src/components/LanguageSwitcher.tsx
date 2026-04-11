import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useTranslation } from "react-i18next";

/** Compact language control; Persian default, English ready for future use. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const value = i18n.language.startsWith("fa") ? "fa" : "en";

  return (
    <FormControl size="small" sx={{ minWidth: 118 }}>
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
