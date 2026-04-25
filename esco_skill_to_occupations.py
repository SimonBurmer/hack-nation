from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from textwrap import fill


DEFAULT_DATA_DIR = (
    Path.home()
    / "Downloads"
    / "ESCO dataset - v1.2.1 - classification - en - csv"
)

SKILLS_FILE = "skills_en.csv"
RELATIONS_FILE = "occupationSkillRelations_en.csv"
OCCUPATIONS_FILE = "occupations_en.csv"


def clean_text(value: str | None) -> str:
    return " ".join((value or "").split())


def normalize(value: str | None) -> str:
    return clean_text(value).casefold()


def split_label_field(value: str | None) -> list[str]:
    labels: list[str] = []
    for line in (value or "").splitlines():
        label = clean_text(line).strip(" ,")
        if label:
            labels.append(label)
    return labels


def iter_csv(path: Path):
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            yield from csv.DictReader(file)
    except FileNotFoundError:
        raise SystemExit(f"Datei nicht gefunden: {path}") from None


def skill_labels(skill: dict[str, str]) -> list[tuple[str, str]]:
    labels: list[tuple[str, str]] = []

    preferred_label = clean_text(skill.get("preferredLabel"))
    if preferred_label:
        labels.append(("preferredLabel", preferred_label))

    for field_name in ("altLabels", "hiddenLabels"):
        for label in split_label_field(skill.get(field_name)):
            labels.append((field_name, label))

    return labels


def find_exact_skills(data_dir: Path, skill_name: str) -> list[dict[str, str]]:
    query = normalize(skill_name)
    matches: list[dict[str, str]] = []

    for skill in iter_csv(data_dir / SKILLS_FILE):
        for field_name, label in skill_labels(skill):
            if normalize(label) == query:
                skill = dict(skill)
                skill["_matchedField"] = field_name
                skill["_matchedLabel"] = label
                matches.append(skill)
                break

    return matches


def suggest_skills(
    data_dir: Path,
    skill_name: str,
    max_suggestions: int,
) -> list[tuple[float, str, str]]:
    query = normalize(skill_name)
    suggestions: dict[str, tuple[float, str, str]] = {}

    for skill in iter_csv(data_dir / SKILLS_FILE):
        preferred_label = clean_text(skill.get("preferredLabel"))
        if not preferred_label:
            continue

        best_score = 0.0
        best_label = preferred_label

        for _, label in skill_labels(skill):
            label_norm = normalize(label)
            if not label_norm:
                continue
            contains_bonus = 0.20 if query in label_norm or label_norm in query else 0.0
            score = SequenceMatcher(None, query, label_norm).ratio() + contains_bonus
            if score > best_score:
                best_score = score
                best_label = label

        if best_score >= 0.62:
            uri = skill.get("conceptUri", "")
            current = suggestions.get(uri)
            if current is None or best_score > current[0]:
                suggestions[uri] = (best_score, preferred_label, best_label)

    return sorted(suggestions.values(), reverse=True)[:max_suggestions]


def find_relations(
    data_dir: Path,
    skill_uris: set[str],
) -> dict[str, list[dict[str, str]]]:
    relations_by_occupation: dict[str, list[dict[str, str]]] = defaultdict(list)

    for relation in iter_csv(data_dir / RELATIONS_FILE):
        if relation.get("skillUri") in skill_uris:
            occupation_uri = relation.get("occupationUri", "")
            if occupation_uri:
                relations_by_occupation[occupation_uri].append(dict(relation))

    return relations_by_occupation


def find_occupations(
    data_dir: Path,
    occupation_uris: set[str],
) -> dict[str, dict[str, str]]:
    occupations: dict[str, dict[str, str]] = {}

    for occupation in iter_csv(data_dir / OCCUPATIONS_FILE):
        uri = occupation.get("conceptUri", "")
        if uri in occupation_uris:
            occupations[uri] = dict(occupation)

    return occupations


def relation_rank(relations: list[dict[str, str]]) -> int:
    relation_types = {normalize(relation.get("relationType")) for relation in relations}
    if "essential" in relation_types:
        return 0
    if "optional" in relation_types:
        return 1
    return 2


def format_multiline(value: str | None, indent: str = "  ") -> str:
    text = clean_text(value)
    if not text:
        return "-"
    return fill(text, width=100, initial_indent=indent, subsequent_indent=indent)


def compact_labels(value: str | None) -> str:
    labels = split_label_field(value)
    return ", ".join(labels) if labels else "-"


def print_skill_matches(skills: list[dict[str, str]]) -> None:
    print("\nGefundene Skill-Einträge:")
    for index, skill in enumerate(skills, start=1):
        print(f"\n{index}. {skill.get('preferredLabel', '-')}")
        print(f"   Treffer über: {skill.get('_matchedField')} = {skill.get('_matchedLabel')}")
        print(f"   Typ: {skill.get('skillType', '-')}")
        print(f"   Reuse-Level: {skill.get('reuseLevel', '-')}")
        print(f"   URI: {skill.get('conceptUri', '-')}")
        description = clean_text(skill.get("description"))
        if description:
            print("   Beschreibung:")
            print(format_multiline(description, indent="     "))


def print_occupation(
    number: int,
    occupation_uri: str,
    occupation: dict[str, str] | None,
    relations: list[dict[str, str]],
) -> None:
    relation_types = sorted({clean_text(relation.get("relationType")) for relation in relations})
    matched_skill_labels = sorted({clean_text(relation.get("skillLabel")) for relation in relations})
    relation_skill_types = sorted({clean_text(relation.get("skillType")) for relation in relations})

    fallback_label = relations[0].get("occupationLabel", occupation_uri)
    label = occupation.get("preferredLabel") if occupation else fallback_label

    print(f"\n{number}. {label}")
    print(f"   Passung: {', '.join(relation_types) or '-'}")
    print(f"   Verknüpfter Skill: {', '.join(matched_skill_labels) or '-'}")
    print(f"   Skill-Typ in Relation: {', '.join(relation_skill_types) or '-'}")

    if occupation is None:
        print(f"   Occupation-Details nicht in {OCCUPATIONS_FILE} gefunden.")
        print(f"   URI: {occupation_uri}")
        return

    print(f"   Code: {occupation.get('code') or '-'}")
    print(f"   ISCO-Gruppe: {occupation.get('iscoGroup') or '-'}")
    print(f"   NACE-Code: {compact_labels(occupation.get('naceCode'))}")
    print(f"   URI: {occupation.get('conceptUri') or occupation_uri}")
    print(f"   Alternative Namen: {compact_labels(occupation.get('altLabels'))}")

    regulated_note = clean_text(occupation.get("regulatedProfessionNote"))
    if regulated_note:
        print("   Regulierung:")
        print(format_multiline(regulated_note, indent="     "))

    definition = clean_text(occupation.get("definition"))
    if definition:
        print("   Definition:")
        print(format_multiline(definition, indent="     "))

    description = clean_text(occupation.get("description"))
    if description:
        print("   Beschreibung:")
        print(format_multiline(description, indent="     "))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Findet zu einem exakt eingegebenen ESCO-Skill passende Occupations "
            "über skills_en.csv, occupationSkillRelations_en.csv und occupations_en.csv."
        )
    )
    parser.add_argument(
        "skill",
        nargs="?",
        help="Exakter Skill-Name, z. B. 'use climbing equipment'.",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help=f"Ordner mit den ESCO-CSV-Dateien. Default: {DEFAULT_DATA_DIR}",
    )
    parser.add_argument(
        "--max-suggestions",
        type=int,
        default=8,
        help="Anzahl Vorschläge, falls kein exakter Skill gefunden wird.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    data_dir = args.data_dir.expanduser()

    skill_name = args.skill or input("Bitte exakten Skill-Namen eingeben: ").strip()
    if not skill_name:
        print("Kein Skill eingegeben.")
        return 1

    required_files = [SKILLS_FILE, RELATIONS_FILE, OCCUPATIONS_FILE]
    missing_files = [name for name in required_files if not (data_dir / name).is_file()]
    if missing_files:
        print(f"ESCO-Ordner: {data_dir}")
        print("Diese Dateien fehlen:")
        for file_name in missing_files:
            print(f"- {file_name}")
        return 1

    skills = find_exact_skills(data_dir, skill_name)
    if not skills:
        print(f"\nKein exakter Skill gefunden für: {skill_name!r}")
        suggestions = suggest_skills(data_dir, skill_name, args.max_suggestions)
        if suggestions:
            print("\nMögliche ähnliche Skills:")
            for _, preferred_label, matched_label in suggestions:
                suffix = f" (Label: {matched_label})" if matched_label != preferred_label else ""
                print(f"- {preferred_label}{suffix}")
        return 1

    print_skill_matches(skills)

    skill_uris = {skill["conceptUri"] for skill in skills if skill.get("conceptUri")}
    relations_by_occupation = find_relations(data_dir, skill_uris)

    if not relations_by_occupation:
        print("\nFür diesen Skill wurden keine Occupations in der Relation-Datei gefunden.")
        return 0

    occupations = find_occupations(data_dir, set(relations_by_occupation))
    sorted_items = sorted(
        relations_by_occupation.items(),
        key=lambda item: (
            relation_rank(item[1]),
            normalize(
                occupations.get(item[0], {}).get("preferredLabel")
                or item[1][0].get("occupationLabel")
            ),
        ),
    )

    print(f"\nMögliche Occupations ({len(sorted_items)}):")
    for number, (occupation_uri, relations) in enumerate(sorted_items, start=1):
        print_occupation(number, occupation_uri, occupations.get(occupation_uri), relations)

    return 0


if __name__ == "__main__":
    sys.exit(main())
