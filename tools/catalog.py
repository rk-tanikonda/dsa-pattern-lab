"""Read reusable problem manifests; print a JSON catalog when run directly."""

import json
from pathlib import Path

if __package__:
    from .lab_runner import ROOT, SetupError, load_json, prepare_cases
else:
    from lab_runner import ROOT, SetupError, load_json, prepare_cases


def load_catalog(root=ROOT):
    root = Path(root).resolve()
    problems, seen = [], set()
    for path in sorted((root / "problems").rglob("problem.json")):
        metadata = load_json(path)
        if not isinstance(metadata, dict) or metadata.get("schema_version") != 1:
            raise SetupError(f"{path}: expected problem schema_version 1")
        for field in ("id", "title", "difficulty", "category", "description", "cases",
                      "default_language", "io_contract"):
            if not isinstance(metadata.get(field), str) or not metadata[field]:
                raise SetupError(f"{path}: missing string {field}")
        if metadata["id"] in seen:
            raise SetupError(f"duplicate problem id: {metadata['id']}")
        seen.add(metadata["id"])
        tags, starters = metadata.get("tags"), metadata.get("starters")
        if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
            raise SetupError(f"{path}: tags must be strings")
        if (not isinstance(starters, dict) or not starters
                or metadata["default_language"] not in starters
                or not all(isinstance(k, str) and isinstance(v, str) for k, v in starters.items())):
            raise SetupError(f"{path}: expected starter paths including the default language")
        for reference in [metadata["description"], metadata["cases"], *starters.values()]:
            target = (path.parent / reference).resolve()
            if path.parent.resolve() not in target.parents or not target.is_file():
                raise SetupError(f"{path}: missing or nonlocal file {reference}")
        prepare_cases(load_json(path.parent / metadata["cases"]))
        problems.append({**metadata, "directory": str(path.parent.relative_to(root))})
    return {"schema_version": 1, "problems": problems}


if __name__ == "__main__":
    print(json.dumps(load_catalog(), indent=2))
