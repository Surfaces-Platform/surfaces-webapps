#!/usr/bin/env python3
"""Refresh compatible color aliases and the public kit from vendored canonical SVGs."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
public = root / "apps/surfaces-web/public/design-system"
logo = public / "logo"
light = (logo / "surfaces-lockup-horizontal.svg").read_text()
dark = (logo / "surfaces-lockup-horizontal-reverse.svg").read_text()
stacked = (logo / "surfaces-lockup-stacked.svg").read_text()
stacked_dark = stacked.replace("#0B0D0E", "#F7F6F2").replace(
    "Inter 780, light", "Inter 780, dark"
)

for layout, normal, reverse in [
    ("horizontal", light, dark),
    ("stacked", stacked, stacked_dark),
]:
    if layout == "stacked":
        (logo / "surfaces-lockup-stacked-reverse.svg").write_text(reverse)
    for suffix, source in [
        ("grayscale", normal),
        ("grayscale-reverse", reverse),
        ("monochrome", normal.replace("#8B9096", "#0B0D0E")),
        ("monochrome-reverse", reverse.replace("#8B9096", "#F7F6F2")),
    ]:
        (logo / f"surfaces-lockup-{layout}-{suffix}.svg").write_text(source)

files = {path.name: path for path in sorted(logo.glob("*.svg"))}
for name in ["surfaces.tokens.json", "surfaces.product.tokens.json", "surfaces.css"]:
    files[name] = public / "tokens" / name
files["README.txt"] = public / "brand-kit/README.txt"
files["surfaces-lockups.json"] = public / "surfaces-lockups.json"

archive = public / "brand-kit/surfaces-brand-kit-v0.2.zip"
with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as kit:
    for name in sorted(files):
        info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        kit.writestr(info, files[name].read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
print(f"Wrote {archive.relative_to(root)} with {len(files)} entries.")
