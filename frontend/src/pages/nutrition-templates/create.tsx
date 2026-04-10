import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { NutritionMealsEditor } from "../../components/NutritionMealsEditor";
import { normalizeDietMealsForApi, type DietMeal } from "../../lib/nutritionTotals";

export function NutritionTemplateCreate() {
  const { t } = useTranslation();
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const { formProps, saveButtonProps, onFinish: refineOnFinish } = useForm({
    resource: "nutrition-templates",
  });

  return (
    <Create saveButtonProps={saveButtonProps} title={t("nutritionTemplates.create.pageTitle")}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t("nutritionTemplates.create.hint")}{" "}
        <Link to="/library/nutrition-templates">{t("nutritionTemplates.list.openCatalog")}</Link>
      </Typography.Paragraph>
      <Form
        {...formProps}
        layout="vertical"
        onFinish={(values) =>
          void refineOnFinish({
            ...values,
            meals: normalizeDietMealsForApi(dietMeals),
          })
        }
      >
        <Form.Item name="name" label={t("nutritionTemplates.form.name")} rules={[{ required: true }]}>
          <Input placeholder={t("nutritionTemplates.form.namePlaceholder")} />
        </Form.Item>
        <Form.Item name="description" label={t("nutritionTemplates.form.description")}>
          <Input.TextArea rows={2} placeholder={t("nutritionTemplates.form.descriptionPlaceholder")} />
        </Form.Item>
        <Form.Item name="notes_plan" label={t("nutritionTemplates.form.notesPlan")}>
          <Input.TextArea
            rows={4}
            placeholder={t("nutritionTemplates.form.notesPlanPlaceholder")}
            showCount
            maxLength={32000}
          />
        </Form.Item>
      </Form>
      <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />
    </Create>
  );
}
