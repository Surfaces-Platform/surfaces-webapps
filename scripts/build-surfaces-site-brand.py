#!/usr/bin/env python3
"""Generate the public site's brand entrypoints from pinned vector sources.

Requires Python 3 and ImageMagick. No installed font is used. --check renders to
a temporary directory and fails on drift without changing the checkout.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "apps/surfaces-web"
SOURCE = APP / "brand-source"
CONTRACT = json.loads((SOURCE / "contract.json").read_text())
VERSION = CONTRACT["revision"]
BASE = f"/brand/{VERSION}"
NS = "{http://www.w3.org/2000/svg}"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source(name):
    spec = CONTRACT["sources"][name]
    data = (APP / spec["path"]).read_bytes()
    if sha(data) != spec["sha256"]:
        raise SystemExit(f"Unapproved source drift: {spec['path']}")
    return data.decode()


def inner(svg):
    return svg[svg.index(">") + 1:svg.rindex("</svg>")]


def slab_art(svg):
    tree = ET.fromstring(svg)
    polygons = tree.findall(f".//{NS}polygon")
    actual = [polygon.attrib["points"] for polygon in polygons]
    if actual != CONTRACT["polygons"]:
        raise SystemExit("The master must contain the exact three approved slabs.")
    return "".join(
        f'<polygon points="{p.attrib["points"]}" fill="{p.attrib["fill"]}"/>'
        for p in polygons
    )


def svg(width, height, content, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img"><title>{title}</title>{content}</svg>\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    recipe = {key: value for key, value in CONTRACT.items() if key != "revision"}
    expected_revision = "canonical-" + sha(json.dumps(recipe, sort_keys=True, separators=(",", ":")).encode())[:16]
    if VERSION != expected_revision:
        raise SystemExit(f"Contract revision must be {expected_revision}; update the contract and standalone HTML head before rebuilding.")
    legacy_spec = CONTRACT["legacyExportsSource"]
    legacy_bytes = (APP / legacy_spec["path"]).read_bytes()
    if sha(legacy_bytes) != legacy_spec["sha256"]:
        raise SystemExit("Unapproved legacy export provenance drift.")
    legacy_sources = json.loads(legacy_bytes)["manifests"]
    light = source("markLight")
    dark = source("markDark")
    one_color = source("markOneColor")
    horizontal_light = source("lockupLight")
    horizontal_dark = source("lockupDark")
    favicon_controller = source("faviconThemeController")
    light_art, dark_art = slab_art(light), slab_art(dark)
    if "<text" in horizontal_light + horizontal_dark:
        raise SystemExit("Social artwork must use checked-in vector outlines.")
    outputs = {}
    dimensions = {}

    def put(path, data, size=None):
        outputs[f"apps/surfaces-web/public/{path}"] = data
        if size:
            dimensions[f"apps/surfaces-web/public/{path}"] = size

    with tempfile.TemporaryDirectory(prefix="surfaces-brand-") as scratch:
        scratch = Path(scratch)

        def png(art, width, height, opaque=False, icon=False):
            (scratch / "source.svg").write_bytes(art)
            dest = scratch / "render.png"
            vector = ET.fromstring(art)
            density = CONTRACT["iconRaster"]["density"] if icon else 72 * width / float(vector.attrib["width"])
            color_args = ["-colorspace", CONTRACT["iconRaster"]["colorspace"]] if icon else []
            subprocess.run([
                "magick", "-background", "none", "-density", str(density), str(scratch / "source.svg"),
                "-resize", f"{width}x{height}!", "-strip",
                *color_args,
                "-define", "png:exclude-chunks=date,time",
                f"PNG{24 if opaque else 32}:{dest}",
            ], check=True, capture_output=True)
            return dest.read_bytes()

        for theme, art in [("light", light_art), ("dark", dark_art)]:
            plate = CONTRACT["browser"]["plates"][theme]
            background = (f'<rect width="64" height="64" rx="{CONTRACT["browser"]["radius"]}" '
                          f'fill="{plate}"/>') if plate is not None else ""
            browser = svg(64, 64,
                background +
                f'<g data-role="browser-mark" transform="{CONTRACT["browser"]["markTransform"]}">'
                + art + '</g>', f"Surfaces {theme} browser mark")
            put(f"brand/{VERSION}/favicon-{theme}.svg", browser)
            if theme == "dark":
                put("favicon-dark.svg", browser)
            if theme == CONTRACT["browser"]["defaultTheme"]:
                put("favicon.svg", browser)
                put("icon.svg", browser)  # Unqualified compatibility fallback.
                put("design-system/logo/favicon.svg", browser)
            for size in (16, 32, 48):
                put(f"brand/{VERSION}/favicon-{theme}-{size}.png", png(browser, size, size, icon=True), [size, size])

        put(f"brand/{VERSION}/pinned-tab.svg", one_color.encode())

        # The controller selects one typed themed ICO before parsing finishes.
        put(f"brand/{VERSION}/favicon-theme.js", favicon_controller.encode())
        fallback = CONTRACT["browser"]["defaultTheme"]
        for theme in ("light", "dark"):
            frames = [(size, outputs[f"apps/surfaces-web/public/brand/{VERSION}/favicon-{theme}-{size}.png"])
                      for size in (16, 32, 48)]
            offset = 6 + 16 * len(frames)
            ico = struct.pack("<HHH", 0, 1, len(frames))
            for size, data in frames:
                ico += struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(data), offset)
                offset += len(data)
            ico += b"".join(data for _, data in frames)
            put(f"brand/{VERSION}/favicon-{theme}.ico", ico)
            if theme == fallback:
                put("favicon.ico", ico)
                put(f"brand/{VERSION}/favicon.ico", ico)

        def install_plate(purpose):
            return svg(64, 64,
                f'<rect width="64" height="64" fill="{CONTRACT["install"]["plate"]}"/>'
                f'<g data-role="install-mark" transform="{CONTRACT["install"][purpose]["markTransform"]}">'
                + (light_art if CONTRACT["install"]["theme"] == "light" else dark_art)
                + '</g>', f"Surfaces opaque {purpose} install icon")

        # Ordinary icons use the same centered 48-unit height as browser tiles.
        # The explicit maskable alternate uses 36 units to fit its safe circle.
        plate = install_plate("any")
        maskable_plate = install_plate("maskable")
        put(f"brand/{VERSION}/install-icon.svg", plate)
        put(f"brand/{VERSION}/maskable-install-icon.svg", maskable_plate)
        put("design-system/logo/app-icon.svg", plate)
        for size in (180, 192, 512):
            data = png(plate, size, size, opaque=True, icon=True)
            name = "apple-touch-icon" if size == 180 else "icon"
            put(f"brand/{VERSION}/{name}-{size}.png", data, [size, size])
            if size == 180:
                put("apple-touch-icon.png", data, [size, size])
            else:
                put(f"brand/{VERSION}/icon-maskable-{size}.png", png(maskable_plate, size, size, opaque=True, icon=True), [size, size])

        width, height = CONTRACT["social"]["dimensions"]
        lockup_width = float(ET.fromstring(horizontal_dark).attrib["width"])
        lockup_height = float(ET.fromstring(horizontal_dark).attrib["height"])
        scale = min(CONTRACT["social"]["maxWholeLockupScale"], CONTRACT["social"]["maxWholeLockupWidth"] / lockup_width)
        x, y = (width - lockup_width * scale) / 2, (height - lockup_height * scale) / 2
        home_social = svg(width, height,
            '<rect width="1200" height="630" fill="#0B0D0E"/>'
            f'<g data-role="canonical-lockup" transform="translate({x:.12f} {y:.12f}) scale({scale})">'
            + inner(horizontal_dark) + '</g>', "Surfaces")
        put(f"brand/{VERSION}/surfaces-social.svg", home_social)
        home_png = png(home_social, width, height, opaque=True)
        put(f"brand/{VERSION}/surfaces-social.png", home_png, [width, height])
        put("assets/surfaces-platform-og.png", home_png, [width, height])

        # Every public sharing entrypoint uses the same dark reference pattern.
        # Page titles and descriptions remain metadata outside the artwork.
        put("design-system/logo/surfaces-social-card.svg", home_social)
        put(f"brand/{VERSION}/design-system-social.png", home_png, [width, height])
        put("design-system/logo/surfaces-social-card.png", home_png, [width, height])

        manifest = {**CONTRACT["manifest"], "icons": [
            {**item, "src": f"{BASE}/{item['src']}"} for item in CONTRACT["manifest"]["icons"]
        ]}
        put("site.webmanifest", (json.dumps(manifest, indent=2) + "\n").encode())
        exports = {
            "revision": VERSION, "canonicalBrandCommit": CONTRACT["canonicalBrandCommit"],
            "sources": CONTRACT["sources"],
            "policy": "Pinned vector outlines, uniform whole-lockup scaling, no font fallback; PNG metadata stripped.",
            "exports": {
                name.removeprefix("apps/surfaces-web/public/"): {
                    "sha256": sha(data), **({"dimensions": dimensions[name]} if name in dimensions else {})
                } for name, data in sorted(outputs.items())
            },
        }
        put(f"brand/{VERSION}/exports.json", (json.dumps(exports, indent=2) + "\n").encode())

        # Older URLs remain compatibility aliases. Read checked-in provenance,
        # never the generated alias manifests, so rebuilds stay idempotent.
        for revision in CONTRACT["legacyIconRevisions"]:
            historical = legacy_sources[revision]
            alias_targets = {}
            for filename in CONTRACT["iconAliasFiles"]:
                current = f"apps/surfaces-web/public/brand/{VERSION}/{filename}"
                alias = f"brand/{revision}/{filename}"
                put(alias, outputs[current], dimensions.get(current))
                alias_targets[alias] = f"{BASE}/{filename}"
            records = {}
            original = historical["exports"]
            for path in sorted(set(original) | set(alias_targets)):
                full_path = f"apps/surfaces-web/public/{path}"
                data = outputs.get(full_path)
                if data is None:
                    data = (ROOT / full_path).read_bytes()
                size = dimensions.get(full_path, original.get(path, {}).get("dimensions"))
                records[path] = {
                    "sha256": sha(data),
                    **({"dimensions": size} if size else {}),
                    **({"aliasOf": alias_targets[path]} if path in alias_targets else {}),
                }
            legacy_exports = {
                "revision": revision,
                "aliasOf": f"{BASE}/exports.json",
                "canonicalBrandCommit": CONTRACT["canonicalBrandCommit"],
                "sources": CONTRACT["sources"],
                "sourcePolicy": {
                    "icons": "Compatibility aliases generated from the current icon sources and presentation contract.",
                    "nonIcons": "File bytes are preserved; records fingerprint the actual served bytes. Original non-icon provenance remains below.",
                    "provenanceSource": legacy_spec,
                },
                "historicalSources": historical["sources"],
                "historicalNonIconExports": {path: spec for path, spec in original.items()
                                             if path not in alias_targets and not any(
                                                 token in path for token in ("favicon", "icon.svg", "icon-", "apple-touch", "site.webmanifest"))},
                "exports": records,
            }
            put(f"brand/{revision}/exports.json", (json.dumps(legacy_exports, indent=2) + "\n").encode())

        changed = []
        for name, data in outputs.items():
            path = ROOT / name
            if not path.exists() or path.read_bytes() != data:
                changed.append(name)
                if not args.check:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(data)
        if args.check and changed:
            raise SystemExit("Generated brand asset drift:\n" + "\n".join(changed))
        print(f"{'Verified' if args.check else 'Generated'} {len(outputs)} site brand assets; {len(changed)} changed.")


if __name__ == "__main__":
    main()
