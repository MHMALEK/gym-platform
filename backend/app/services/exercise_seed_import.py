from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.request import urlopen

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise, ExerciseVideoLink
from app.models.muscle_group import MuscleGroup
from app.services.exercise_muscles import replace_exercise_muscle_groups

DEFAULT_SOURCE_URL = "https://7rjbixjepp.ufs.sh/f/3TSyxQfJpchbFREfy5mwSaRJOTILDMBYzexUbq4u9ciXQ7Hp"
DEFAULT_EXTERNAL_SOURCE = "exercisedb_sample"
DEFAULT_LICENSE_STATUS = "mvp_unverified"


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    skipped: int = 0


def load_seed_payload_from_text(raw: str) -> list[dict[str, Any]]:
    """Accept plain JSON or the markdown wrapper Cursor stores uploaded URL content as."""
    text = raw.strip()
    if not text:
        return []
    if not text.startswith("["):
        start = text.find("[")
        end = text.rfind("]")
        if start < 0 or end < start:
            raise ValueError("Could not find a JSON array in the seed payload")
        text = text[start : end + 1]
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Exercise seed payload must be a JSON array")
    return [row for row in data if isinstance(row, dict)]


def load_seed_payload_from_url(url: str) -> list[dict[str, Any]]:
    with urlopen(url, timeout=30) as res:
        raw = res.read().decode("utf-8")
    return load_seed_payload_from_text(raw)


async def import_exercise_seed(
    db: AsyncSession,
    rows: list[dict[str, Any]],
    *,
    external_source: str = DEFAULT_EXTERNAL_SOURCE,
    source_url: str = DEFAULT_SOURCE_URL,
    license_status: str = DEFAULT_LICENSE_STATUS,
) -> ImportResult:
    muscle_ids = await _muscle_group_ids_by_alias(db)
    result = ImportResult()
    for row in rows:
        external_id = str(row.get("exerciseId") or "").strip()
        name = _clean_name(str(row.get("name") or ""))
        if not external_id or not name:
            result.skipped += 1
            continue

        existing = await db.scalar(
            select(Exercise).where(
                Exercise.coach_id.is_(None),
                Exercise.external_source == external_source,
                Exercise.external_id == external_id,
            )
        )
        enrichment = enrich_exercise_row(row)
        values = _exercise_values(row, enrichment, external_source, external_id, source_url, license_status)

        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
            exercise = existing
            result.updated += 1
        else:
            exercise = Exercise(coach_id=None, **values)
            db.add(exercise)
            await db.flush()
            result.created += 1

        await replace_exercise_muscle_groups(db, exercise.id, _mapped_muscle_ids(row, muscle_ids))
        await _replace_seed_video_links(db, exercise.id, row)

    await db.commit()
    return result


def enrich_exercise_row(row: dict[str, Any]) -> dict[str, str]:
    name = _clean_name(str(row.get("name") or "this exercise"))
    equipment = _first(row.get("equipments")) or "body weight"
    primary = _first(row.get("targetMuscles")) or _first(row.get("bodyParts")) or "target muscle"
    difficulty = str(row.get("difficulty") or "").lower()
    instructions = _instructions(row)

    movement = _movement_family(name, equipment, primary)
    tips = _tips_for(movement, name, equipment, primary)
    mistakes = _mistakes_for(movement)
    cues = _cues_for(movement)
    setup_notes = _setup_notes_for(movement, equipment)
    safety_notes = _safety_notes_for(movement, difficulty)

    if instructions:
        setup_notes = [instructions[0], *setup_notes]

    return {
        "tips": "\n".join(tips),
        "common_mistakes": "\n".join(mistakes),
        "correct_form_cues": "\n".join(cues),
        "setup_notes": "\n".join(dict.fromkeys(setup_notes)),
        "safety_notes": "\n".join(safety_notes),
    }


def _exercise_values(
    row: dict[str, Any],
    enrichment: dict[str, str],
    external_source: str,
    external_id: str,
    source_url: str,
    license_status: str,
) -> dict[str, Any]:
    exercise_types = _str_list(row.get("exerciseTypes"))
    secondary_muscles = _str_list(row.get("secondaryMuscles"))
    body_parts = _str_list(row.get("bodyParts"))
    equipment = _str_list(row.get("equipments"))
    instructions = _instructions(row)

    return {
        "external_source": external_source,
        "external_id": external_id,
        "name": _clean_name(str(row.get("name") or "")),
        "description": str(row.get("overview") or "").strip() or None,
        "category": exercise_types[0] if exercise_types else None,
        "equipment": ", ".join(equipment) or None,
        "venue_type": "commercial_gym" if _requires_gym(equipment) else "both",
        "tips": enrichment["tips"],
        "common_mistakes": enrichment["common_mistakes"],
        "correct_form_cues": enrichment["correct_form_cues"],
        "demo_media_url": _best_url(row.get("gifUrls")),
        "thumbnail_url": _best_url(row.get("imageUrls")),
        "difficulty": str(row.get("difficulty") or "").strip() or None,
        "exercise_type": exercise_types[0] if exercise_types else None,
        "body_parts": json.dumps(body_parts),
        "secondary_muscles": json.dumps(secondary_muscles),
        "instructions": json.dumps(instructions),
        "setup_notes": enrichment["setup_notes"],
        "safety_notes": enrichment["safety_notes"],
        "source_url": source_url,
        "license_status": license_status,
    }


async def _replace_seed_video_links(db: AsyncSession, exercise_id: int, row: dict[str, Any]) -> None:
    links = _video_links(row)
    await db.execute(
        delete(ExerciseVideoLink).where(
            ExerciseVideoLink.exercise_id == exercise_id,
            ExerciseVideoLink.source.in_(["seed", "generated"]),
        )
    )
    for index, link in enumerate(links):
        db.add(
            ExerciseVideoLink(
                exercise_id=exercise_id,
                provider="youtube",
                url=link["url"],
                title=link.get("title"),
                description=link.get("description"),
                sort_order=index,
                source="seed",
            )
        )
    await db.flush()


def _video_links(row: dict[str, Any]) -> list[dict[str, str]]:
    raw = row.get("youtubeTutorials") or row.get("youtubeUrls") or row.get("tutorialUrls") or []
    if isinstance(raw, str):
        raw = [raw]
    links: list[dict[str, str]] = []
    for item in raw if isinstance(raw, list) else []:
        if isinstance(item, str):
            url = item.strip()
            if url:
                links.append({"url": url, "title": "YouTube tutorial"})
        elif isinstance(item, dict):
            url = str(item.get("url") or "").strip()
            if url:
                links.append(
                    {
                        "url": url,
                        "title": str(item.get("title") or "YouTube tutorial").strip(),
                        "description": str(item.get("description") or "").strip(),
                    }
                )
    return links


async def _muscle_group_ids_by_alias(db: AsyncSession) -> dict[str, int]:
    rows = (await db.execute(select(MuscleGroup))).scalars().all()
    by_code = {row.code: row.id for row in rows}
    aliases = {
        "abs": "core",
        "abdominals": "core",
        "pectorals": "chest",
        "delts": "shoulders",
        "deltoids": "shoulders",
        "quadriceps": "quads",
        "traps": "traps",
        "trapezius": "traps",
        "lats": "lats",
        "latissimus dorsi": "lats",
        "spine": "lower_back",
        "erector spinae": "lower_back",
        "lower back": "lower_back",
        "upper back": "upper_back",
        "hip flexors": "hip_flexors",
    }
    mapped = {code.replace("_", " "): mid for code, mid in by_code.items()}
    mapped.update({code: mid for code, mid in by_code.items()})
    for alias, code in aliases.items():
        if code in by_code:
            mapped[alias] = by_code[code]
    return mapped


def _mapped_muscle_ids(row: dict[str, Any], muscle_ids: dict[str, int]) -> list[int]:
    names = [*_str_list(row.get("targetMuscles")), *_str_list(row.get("secondaryMuscles"))]
    out: list[int] = []
    for name in names:
        key = name.lower().strip()
        mid = muscle_ids.get(key)
        if mid and mid not in out:
            out.append(mid)
    return out


def _best_url(value: Any) -> str | None:
    if isinstance(value, dict):
        for quality in ("720p", "480p", "1080p", "360p"):
            url = value.get(quality)
            if isinstance(url, str) and url.strip():
                return url.strip()
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _instructions(row: dict[str, Any]) -> list[str]:
    return [_clean_step(x) for x in _str_list(row.get("instructions")) if _clean_step(x)]


def _str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _first(value: Any) -> str | None:
    items = _str_list(value)
    return items[0] if items else None


def _clean_step(value: str) -> str:
    return re.sub(r"^Step:\s*\d+\s*", "", value.strip(), flags=re.I)


def _clean_name(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    return cleaned[:1].upper() + cleaned[1:] if cleaned else cleaned


def _requires_gym(equipment: list[str]) -> bool:
    gym_terms = ("machine", "cable", "barbell", "smith", "sled", "lever")
    return any(any(term in eq.lower() for term in gym_terms) for eq in equipment)


def _movement_family(name: str, equipment: str, primary: str) -> str:
    text = f"{name} {equipment} {primary}".lower()
    if any(x in text for x in ("press", "push-up", "dip")):
        return "press"
    if any(x in text for x in ("row", "pulldown", "pull-up", "chin-up")):
        return "pull"
    if any(x in text for x in ("squat", "leg press", "lunge", "calf raise")):
        return "lower"
    if any(x in text for x in ("curl", "extension", "raise", "fly")):
        return "isolation"
    if any(x in text for x in ("crunch", "twist", "plank", "abs", "core", "waist")):
        return "core"
    return "general"


def _tips_for(movement: str, name: str, equipment: str, primary: str) -> list[str]:
    base = [f"Use a load that lets the {primary} do the work without rushing the reps."]
    by_family = {
        "press": ["Keep the ribs down and press with a stable torso.", "Lower under control before driving back up."],
        "pull": ["Start each rep by setting the shoulder blades, not by shrugging.", "Pull through the elbows and finish with control."],
        "lower": ["Keep pressure through the full foot and control the bottom position.", "Track knees in line with toes."],
        "isolation": ["Keep the working joint path consistent.", "Use a slow eccentric and avoid swinging the weight."],
        "core": ["Brace before each rep and move through the trunk with control.", "Keep the neck relaxed and avoid pulling with the arms."],
        "general": ["Prioritize clean range of motion over load.", "Pause briefly where the target muscle is most contracted."],
    }
    return [*base, *by_family.get(movement, by_family["general"]), f"Set up the {equipment} so {name.lower()} feels stable before starting."]


def _mistakes_for(movement: str) -> list[str]:
    common = ["Moving too fast and losing the target muscle.", "Using more weight than form allows."]
    by_family = {
        "press": ["Flaring the elbows aggressively.", "Arching the lower back to finish reps."],
        "pull": ["Shrugging instead of pulling with the back.", "Cutting the stretch or squeeze short."],
        "lower": ["Letting knees cave inward.", "Bouncing out of the bottom position."],
        "isolation": ["Swinging the torso to move the weight.", "Letting the non-working joints drift."],
        "core": ["Using momentum instead of a controlled brace.", "Straining the neck."],
        "general": ["Skipping setup and starting from an unstable position."],
    }
    return [*common, *by_family.get(movement, by_family["general"])]


def _cues_for(movement: str) -> list[str]:
    by_family = {
        "press": ["Brace, lower smooth, press away.", "Shoulders packed, wrists stacked."],
        "pull": ["Chest tall, elbows drive.", "Squeeze the back, then return slowly."],
        "lower": ["Tripod foot, knees track toes.", "Control down, drive up."],
        "isolation": ["Lock the setup, move only the target joint.", "Lift smooth, lower slower."],
        "core": ["Ribs down, brace first.", "Move slow enough to own every inch."],
        "general": ["Stable setup, clean reps.", "Stop the set when control breaks."],
    }
    return by_family.get(movement, by_family["general"])


def _setup_notes_for(movement: str, equipment: str) -> list[str]:
    notes = [f"Confirm the {equipment} is adjusted and secure before the first rep."]
    if movement in ("press", "pull", "lower"):
        notes.append("Take one light practice rep to confirm range of motion.")
    return notes


def _safety_notes_for(movement: str, difficulty: str) -> list[str]:
    notes = ["Stop if sharp pain, dizziness, or joint pinching shows up."]
    if difficulty == "advanced":
        notes.append("Use only with clients who already control the prerequisite movement.")
    if movement in ("press", "pull"):
        notes.append("Keep shoulder movement pain-free and reduce range if needed.")
    if movement == "lower":
        notes.append("Reduce depth or load if knees, hips, or lower back lose position.")
    return notes
