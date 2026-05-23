from pydantic import BaseModel


class DemoSeedSummary(BaseModel):
    coach_id: int
    invite_code: str | None
    clients: int
    training_plans: int
    nutrition_templates: int
    plan_templates: int
    invoices: int
    messages: int
    workout_sessions: int


class DemoActionResponse(BaseModel):
    ok: bool = True
    action: str
    summary: DemoSeedSummary | None = None
