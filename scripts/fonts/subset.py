#!/usr/bin/env python3
"""Generate the published Chill Jinshu Song WOFF2 subsets from site source text."""

from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / "src"
FONT_SOURCE_ROOT = Path(__file__).resolve().parent / "source"
FONT_OUTPUT_ROOT = ROOT / "public" / "fonts" / "chill-jinshu-song"
TEXT_EXTENSIONS = {".astro", ".json", ".md", ".mdx", ".ts", ".tsx", ".yaml", ".yml"}
FONTS = {
    "compact-regular": ("ChillJinshuSong_CompactRegular.otf", "compact-regular-v3.woff2"),
    "compact-bold": ("ChillJinshuSong_CompactBold.otf", "compact-bold-v3.woff2"),
    "text-regular": ("ChillJinshuSongTextRegular.otf", "text-regular-v1.woff2"),
}


def collect_unicodes() -> list[int]:
    characters = set(chr(codepoint) for codepoint in range(0x20, 0x7F))
    characters.update("，。！？：；（）【】《》“”‘’、—…·")

    for path in SOURCE_ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
            characters.update(path.read_text(encoding="utf-8"))

    return sorted(ord(character) for character in characters)


def write_subset(source: Path, output: Path, unicodes: list[int]) -> tuple[int, bool, int]:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]

    font = subset.load_font(str(source), options)
    supported_unicodes = {
        codepoint
        for table in font["cmap"].tables
        for codepoint in table.cmap
    }
    included_unicodes = [codepoint for codepoint in unicodes if codepoint in supported_unicodes]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=included_unicodes)
    subsetter.subset(font)

    with tempfile.NamedTemporaryFile(suffix=".woff2", delete=False) as temporary:
        temporary_path = Path(temporary.name)

    try:
        subset.save_font(font, str(temporary_path), options)
        cmap = {codepoint for table in TTFont(temporary_path)["cmap"].tables for codepoint in table.cmap}
        missing = set(included_unicodes) - cmap
        if missing:
            raise RuntimeError(f"{source.name} lacks {len(missing)} required characters")

        generated = temporary_path.read_bytes()
        changed = not output.exists() or hashlib.sha256(generated).digest() != hashlib.sha256(output.read_bytes()).digest()
        if changed:
            os.replace(temporary_path, output)
        return len(generated), changed, len(included_unicodes)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> None:
    unicodes = collect_unicodes()
    FONT_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    for _, (filename, output_filename) in FONTS.items():
        source = FONT_SOURCE_ROOT / filename
        if not source.is_file():
            raise FileNotFoundError(f"Missing font source: {source}")
        output = FONT_OUTPUT_ROOT / output_filename
        size, changed, included = write_subset(source, output, unicodes)
        status = "updated" if changed else "unchanged"
        print(f"{output.name}: {status}, {size / 1024:.1f} KiB, {included} supported source characters")


if __name__ == "__main__":
    main()
