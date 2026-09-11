#!/usr/bin/env python3
"""Build the HSK 3.0 collection file used by the app.

Sources (downloaded into scripts/sources/ on first run, not committed):
  * ivankra/hsk30            - the official HSK 3.0 word list (11,092 terms) with
                               official pinyin, part of speech and level.
  * mapull/chinese-dictionary - monolingual Chinese dictionary (词语 explanations).

Hand-written Chinese definitions live in scripts/overrides/*.json and take
precedence over dictionary data. They cover single characters, affixes,
transparent compounds missing from the dictionary and garbled entries.

Output: public/collections/hsk30.json
"""
import csv
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources")
OVERRIDES = os.path.join(HERE, "overrides")
OUT = os.path.join(HERE, "..", "public", "collections", "hsk30.json")

SOURCES = {
    "hsk30.csv": "https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv",
    "mapull_word.json": "https://raw.githubusercontent.com/mapull/chinese-dictionary/main/word/word.json",
}


def fetch_sources():
    os.makedirs(SRC, exist_ok=True)
    for name, url in SOURCES.items():
        path = os.path.join(SRC, name)
        if not os.path.exists(path):
            print("downloading", url)
            urllib.request.urlretrieve(url, path)


def load_overrides():
    """Merge every overrides/*.json file into {hsk_id: definition}."""
    merged = {}
    if not os.path.isdir(OVERRIDES):
        return merged
    for name in sorted(os.listdir(OVERRIDES)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(OVERRIDES, name), encoding="utf-8") as f:
            data = json.load(f)
        for key, value in data.items():
            if isinstance(value, dict):
                value = value.get("definition", "")
            if value and value.strip():
                merged[key] = value.strip()
    return merged


PLACEHOLDER_EXAMPLE = re.compile(r"[：:][^；;。]*～[^；;。]*")
BAD_CHARS = re.compile(r"[─-╿-�└┘┐┌]")


def clean_definition(text):
    """Turn a dictionary explanation into a concise, example-free gloss."""
    if not text:
        return ""
    t = text.strip()
    t = t.replace("﹔", "；").replace("﹐", "，").replace(";", "；").replace(",", "，")
    t = t.replace("|", "｜")
    # drop usage examples that use the ～ placeholder ("：他～了｜～得很")
    t = PLACEHOLDER_EXAMPLE.sub("", t)
    # anything left that still contains the placeholder is an example fragment
    t = "；".join(seg for seg in re.split(r"[；]", t) if "～" not in seg)
    t = re.sub(r"｜[^；。]*", "", t)
    t = re.sub(r"\s+", "", t)
    t = re.sub(r"[；，、]+([；。])", r"\1", t)
    t = re.sub(r"；{2,}", "；", t)
    t = t.strip("；，、：")
    if not t:
        return ""
    if not t.endswith(("。", "！", "？")):
        t += "。"
    # keep it readable: cut at a sense boundary if it runs long
    if len(t) > 160:
        parts = re.split(r"(?<=[；。])", t)
        acc = ""
        for p in parts:
            if len(acc) + len(p) > 160 and acc:
                break
            acc += p
        t = acc.rstrip("；") + ("" if acc.endswith("。") else "。")
    return t


def looks_garbled(text):
    return bool(BAD_CHARS.search(text)) or "└" in text


def primary_form(row):
    """Return (written_form, pinyin, variants) for a CSV row."""
    if row["Variants"]:
        variants = [v for v in json.loads(row["Variants"]) if not v.get("Example")]
        examples = [v for v in json.loads(row["Variants"]) if v.get("Example")]
        main = variants[0]
        others = [v["Simplified"] for v in variants[1:]]
        return main["Simplified"], main["Pinyin"], others, [e["Simplified"] for e in examples]
    return row["Simplified"], row["Pinyin"], [], []


def official_pinyin(row):
    p = row["WebPinyin"] or row["Pinyin"]
    p = p.split("|")[0]
    return p


def display_pinyin(p):
    p = p.replace("∥", "").replace("·", "")
    p = p.replace("/", " / ")
    p = re.sub(r"\s+", " ", p).strip()
    return p


def main():
    fetch_sources()
    overrides = load_overrides()

    with open(os.path.join(SRC, "hsk30.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert len(rows) == 11092, len(rows)

    with open(os.path.join(SRC, "mapull_word.json"), encoding="utf-8") as f:
        dictionary = {e["word"]: e for e in json.load(f)}

    words = []
    missing = []
    sources = {}
    for index, row in enumerate(rows, start=1):
        form, _pinyin, variants, examples = primary_form(row)
        hsk_id = row["ID"]
        raw_pinyin = official_pinyin(row)
        pinyin = display_pinyin(raw_pinyin)
        level = row["Level"]

        definition = overrides.get(hsk_id, "")
        source = "manual" if definition else ""
        if not definition and len(form) > 1:
            entry = dictionary.get(form)
            if entry and entry.get("explanation"):
                cleaned = clean_definition(entry["explanation"])
                if cleaned and not looks_garbled(cleaned):
                    definition = cleaned
                    source = "dictionary"
        if not definition:
            missing.append({
                "id": hsk_id, "word": form, "pinyin": pinyin, "level": level,
                "pos": row["POS"], "raw": (dictionary.get(form) or {}).get("explanation", ""),
            })
        if variants:
            definition = definition.rstrip() + "也说“" + "”、“".join(variants) + "”。"

        metadata = {
            "hsk_system": "HSK 3.0",
            "hsk_level": level,
            "hsk_id": hsk_id,
            "pos": row["POS"],
        }
        # Only carry the official spellings when they differ from what is shown.
        if raw_pinyin != pinyin:
            metadata["hsk_pinyin"] = raw_pinyin
        if row["Traditional"] and row["Traditional"] != form:
            metadata["traditional"] = row["Traditional"]
        if row["Simplified"] != form:
            metadata["listed_form"] = row["Simplified"]
        if variants:
            metadata["variants"] = variants
        if examples:
            metadata["examples"] = examples
        sources[hsk_id] = source
        words.append({
            "id": index,
            "written_form": form,
            "pronunciation": pinyin,
            "definition": definition,
            "metadata": metadata,
        })

    collection = {
        "id": "hsk30",
        "name": "HSK 3.0 词汇",
        "language": "zh",
        "script": "Hans",
        "source": "《国际中文教育中文水平等级标准》(GF0025-2021) 词汇表",
        "version": "2021.03",
        "levels": ["1", "2", "3", "4", "5", "6", "7-9"],
        "words": words,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(collection, f, ensure_ascii=False, separators=(",", ":"))

    with open(os.path.join(HERE, "needs_definitions.json"), "w", encoding="utf-8") as f:
        json.dump(missing, f, ensure_ascii=False, indent=1)
    counts = {k: sum(1 for v in sources.values() if v == k) for k in ("manual", "dictionary", "")}
    print(f"words: {len(words)}  manual: {counts['manual']}  dictionary: {counts['dictionary']}  "
          f"missing definitions: {len(missing)}  output: {os.path.relpath(OUT)}")
    if missing and "--strict" in sys.argv:
        sys.exit(1)


if __name__ == "__main__":
    main()
