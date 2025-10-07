import json
from pathlib import Path
from typing import List

from .schemas import ReflectionResponse

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
REFLECTIONS_PATH = DATA_DIR / "reflections.json"


def load_reflections() -> List[ReflectionResponse]:
    if not REFLECTIONS_PATH.exists():
        return []

    with REFLECTIONS_PATH.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)

    reflections = []
    for item in raw:
        reflections.append(ReflectionResponse(**item))

    return reflections


def save_reflections(reflections: List[ReflectionResponse]) -> None:
    data = [
        {
            **reflection.model_dump(),
            "createdAt": reflection.createdAt.isoformat(),
        }
        for reflection in reflections
    ]
    with REFLECTIONS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
