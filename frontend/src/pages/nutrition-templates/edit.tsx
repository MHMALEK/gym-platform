import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { NutritionMealsEditor } from "../../components/NutritionMealsEditor";
import { dietMealsFromApi, normalizeDietMealsForApi, type DietMeal } from "../../lib/nutritionTotals";

type RecordShape = {
  id?: number;
  name?: string;
  description?: string | null;
  notes_plan?: string | null;
  meals?: unknown[];
};

export function NutritionTemplateEdit() {
  const { t } = useTranslation();
  const { formProps, saveButtonProps, onFinish: refineOnFinish, query } = useForm({
    resource: "nutrition-templates",
  });
  const record = query?.data?.data as RecordShape | undefined;
  const [dietMeals, setDietMeals] = useState<DietMeal[]>([]);
  const hydratedIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!query?.isSuccess || record?.id == null) return;
    if (hydratedIdRef.current === record.id) return;
    hydratedIdRef.current = record.id;
    setDietMeals(dietMealsFromApi(record.meals ?? []));
  }, [query?.isSuccess, record?.id, record?.meals]);

  return (
    <Edit saveButtonProps={saveButtonProps} title={t("nutritionTemplates.edit.pageTitle")}>
      {query?.isLoading ? (
        <Spin style={{ marginTop: 24 }} />
      ) : (
        <>
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
              <Input />
            </Form.Item>
            <Form.Item name="description" label={t("nutritionTemplates.form.description")}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="notes_plan" label={t("nutritionTemplates.form.notesPlan")}>
              <Input.TextArea rows={4} showCount maxLength={32000} />
            </Form.Item>
          </Form>
          <NutritionMealsEditor meals={dietMeals} onChange={setDietMeals} />
        </>
      )}
    </Edit>
  );
}
