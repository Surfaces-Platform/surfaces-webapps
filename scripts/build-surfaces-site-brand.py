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
    light = source("markLight")
    dark = source("markDark")
    one_color = source("markOneColor")
    horizontal_light = source("lockupLight")
    horizontal_dark = source("lockupDark")
    social_copy = source("socialCopy")
    light_art, dark_art = slab_art(light), slab_art(dark)
    if "<text" in horizontal_light + horizontal_dark + social_copy:
        raise SystemExit("Social artwork must use checked-in vector outlines.")
    outputs = {}
    dimensions = {}

    def put(path, data, size=None):
        outputs[f"apps/surfaces-web/public/{path}"] = data
        if size:
            dimensions[f"apps/surfaces-web/public/{path}"] = size

    with tempfile.TemporaryDirectory(prefix="surfaces-brand-") as scratch:
        scratch = Path(scratch)

        def png(art, width, height, opaque=False):
            (scratch / "source.svg").write_bytes(art)
            dest = scratch / "render.png"
            vector = ET.fromstring(art)
            density = 72 * width / float(vector.attrib["width"])
            subprocess.run([
                "magick", "-background", "none", "-density", str(density), str(scratch / "source.svg"),
                "-resize", f"{width}x{height}!", "-strip",
                "-define", "png:exclude-chunks=date,time",
                f"PNG{24 if opaque else 32}:{dest}",
            ], check=True, capture_output=True)
            return dest.read_bytes()

        for theme, art in [("light", light_art), ("dark", dark_art)]:
            browser = svg(64, 64, art, f"Surfaces {theme} browser mark")
            put(f"brand/{VERSION}/favicon-{theme}.svg", browser)
            put("favicon.svg" if theme == "light" else "favicon-dark.svg", browser)
            for size in (16, 32, 48):
                put(f"brand/{VERSION}/favicon-{theme}-{size}.png", png(browser, size, size), [size, size])

        adaptive = svg(64, 64,
            '<style>.primary{fill:#0B0D0E}@media(prefers-color-scheme:dark){.primary{fill:#F7F6F2}}</style>'
            + light_art.replace('fill="#0B0D0E"', 'class="primary"'), "Surfaces adaptive browser mark")
        put("icon.svg", adaptive)  # Compatibility for the former Next app/icon.svg route.
        put(f"brand/{VERSION}/pinned-tab.svg", one_color.encode())

        # ICO PNG frames are opaque for browsers without SVG/theme support.
        fallback = svg(64, 64, '<rect width="64" height="64" fill="#F7F6F2"/>' + light_art,
                       "Surfaces legacy browser icon")
        frames = [(size, png(fallback, size, size, opaque=True)) for size in (16, 32, 48)]
        offset = 6 + 16 * len(frames)
        ico = struct.pack("<HHH", 0, 1, len(frames))
        for size, data in frames:
            ico += struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(data), offset)
            offset += len(data)
        ico += b"".join(data for _, data in frames)
        put("favicon.ico", ico)

        # Master ink is centered at (30,32). At 0.75 scale every polygon is
        # inside the maskable safe circle, radius 25.6 in this 64-unit canvas.
        plate = svg(64, 64,
            '<rect width="64" height="64" fill="#0B0D0E"/>'
            '<g data-role="safe-area-mark" transform="translate(9.5 8) scale(0.75)">'
            + dark_art + '</g>', "Surfaces opaque touch and install icon")
        put(f"brand/{VERSION}/install-icon.svg", plate)
        put("design-system/logo/app-icon.svg", plate)
        for size in (180, 192, 512):
            data = png(plate, size, size, opaque=True)
            name = "apple-touch-icon" if size == 180 else "icon"
            put(f"brand/{VERSION}/{name}-{size}.png", data, [size, size])
            if size == 180:
                put("apple-touch-icon.png", data, [size, size])
            else:
                put(f"brand/{VERSION}/icon-maskable-{size}.png", data, [size, size])

        width, height, scale = 1200, 630, 2.8
        lockup_width = float(ET.fromstring(horizontal_dark).attrib["width"])
        x, y = (width - lockup_width * scale) / 2, (height - 109 * scale) / 2
        home_social = svg(width, height,
            '<rect width="1200" height="630" fill="#0B0D0E"/>'
            f'<g data-role="canonical-lockup" transform="translate({x:.12f} {y:.12f}) scale({scale})">'
            + inner(horizontal_dark) + '</g>', "Surfaces")
        put(f"brand/{VERSION}/surfaces-social.svg", home_social)
        home_png = png(home_social, width, height, opaque=True)
        put(f"brand/{VERSION}/surfaces-social.png", home_png, [width, height])
        put("assets/surfaces-platform-og.png", home_png, [width, height])

        reference_social = svg(width, height,
            '<rect width="1200" height="630" fill="#F7F6F2"/>'
            '<rect x="72" y="72" width="1056" height="486" rx="8" fill="#FFFFFF" stroke="#DAD7CF" stroke-width="2"/>'
            '<g data-role="canonical-lockup" transform="translate(100 100) scale(1.9)">'
            + inner(horizontal_light) + '</g>' + inner(social_copy)
            + '<rect x="854" y="164" width="170" height="10" fill="#00A7C8"/>'
            '<rect x="854" y="204" width="202" height="1" fill="#DAD7CF"/>'
            '<rect x="854" y="244" width="138" height="1" fill="#DAD7CF"/>'
            '<rect x="854" y="284" width="186" height="1" fill="#DAD7CF"/>',
            "Surfaces design system. Design system for reviewable generated UI.")
        put("design-system/logo/surfaces-social-card.svg", reference_social)
        reference_png = png(reference_social, width, height, opaque=True)
        put(f"brand/{VERSION}/design-system-social.png", reference_png, [width, height])
        put("design-system/logo/surfaces-social-card.png", reference_png, [width, height])

        manifest = {
            "id": "/", "name": "Surfaces", "short_name": "Surfaces", "start_url": "/", "scope": "/",
            "display": "standalone", "background_color": "#0B0D0E", "theme_color": "#0B0D0E",
            "icons": [
                {"src": f"{BASE}/icon{'-maskable' if purpose == 'maskable' else ''}-{size}.png",
                 "sizes": f"{size}x{size}", "type": "image/png", "purpose": purpose}
                for purpose in ("any", "maskable") for size in (192, 512)
            ],
        }
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
