import { Create, useForm } from "@refinedev/antd";
import { Card, Form, Input, Space, Typography } from "antd";
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
    <Create
      saveButtonProps={saveButtonProps}
      title={t("nutritionTemplates.create.pageTitle")}
      contentProps={{
        styles: {
          body: { paddingTop: 8, paddingInline: 12 },
        },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: 880, margin: "0 auto" }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
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
          <Card size="small" title={t("nutritionTemplates.create.sectionDetails")}>
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              {t("nutritionTemplates.create.sectionDetailsHint")}
            </Typography.Paragraph>
            <Form.Item name="name" label={t("nutritionTemplates.form.name")} rules={[{ required: true }]}>
              <Input placeholder={t("nutritionTemplates.form.namePlaceholder")} />
            </Form.Item>
            <Form.Item name="description" label={t("nutritionTemplates.form.description")}>
              <Input.TextArea rows={2} placeholder={t("nutritionTemplates.form.descriptionPlaceholder")} />
            </Form.Item>
            <Form.Item name="notes_plan" label={t("nutritionTemplates.form.notesPlan")} style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={4}
                placeholder={t("nutritionTemplates.form.notesPlanPlaceholder")}
                showCount
                maxLength={32000}
              />
            </Form.Item>
          </Card>
          <Card size="small" title={t("nutritionTemplates.create.sectionMeals")}>
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              {t("nutritionTemplates.create.sectionMealsHint")}
            </Typography.Paragraph>
            <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />
          </Card>
        </Form>
      </Space>
    </Create>
  );
}
