// @vitest-environment jsdom

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { brandRevision, brandAssetBase, brandIcons, brandManifest, homeSocialImage, designSystemSocialImage } from "@/lib/brand-metadata";
import RootLayout, { metadata as rootMetadata } from "@/app/layout";
import { metadata as referenceMetadata } from "@/app/design-system/page";
import { generateMetadata } from "@/app/design-system/[section]/page";
import { navItems } from "@/app/design-system/referenceContent";

vi.mock("next/font/google", () => ({ Inter: () => ({ variable: "font-inter" }) }));

const read = (path: string) => readFileSync(path);
const json = (path: string) => JSON.parse(read(path).toString());
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const contract = json("brand-source/contract.json");
const exports = json(`public${brandAssetBase}/exports.json`);
const sizeOfPng = (bytes: Buffer) => [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
const rgbaPng = (bytes: Buffer) => {
  const [width, height] = sizeOfPng(bytes);
  expect([bytes[24], bytes[25], bytes[28]]).toEqual([8, 6, 0]);
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString("ascii", offset + 4, offset + 8) === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(height * stride);
  expect(raw.length).toBe(height * (stride + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++];
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const diagonal = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const prediction = left + up - diagonal;
      const paeth = Math.abs(prediction - left) <= Math.abs(prediction - up) && Math.abs(prediction - left) <= Math.abs(prediction - diagonal)
        ? left : Math.abs(prediction - up) <= Math.abs(prediction - diagonal) ? up : diagonal;
      if (filter > 4) throw new Error("Unsupported PNG row filter.");
      pixels[y * stride + x] = (raw[offset++] + [0, left, up, Math.floor((left + up) / 2), paeth][filter]) & 255;
    }
  }
  return { width, height, pixels };
};
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
const transformedInk = (svg: string, role: string) => {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const group = doc.querySelector(`[data-role="${role}"]`)!;
  const [tx, ty, scale] = group.getAttribute("transform")!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const points = [...group.querySelectorAll("polygon")].flatMap((p) => p.getAttribute("points")!.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return [tx + x * scale, ty + y * scale];
  }));
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  return { points, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

describe("browser, install, and sharing brand entrypoints", () => {
  it("pins canonical source bytes and checks every generated export fingerprint and dimension", () => {
    expect(contract.canonicalBrandCommit).toBe("1d29168a9d35bc4f45de857afd7b43ea404532f8");
    expect(contract.sources.lockupLight.sha256).toBe("32354a8c79fd7a174098fdb05debec61df946149054993dd97e523e28bd68fa6");
    expect(contract.sources.lockupDark.sha256).toBe("8174df02add7d2509950fad5c1d6d11492be0538ad12cfa3222f3bc6efac4987");
    for (const item of Object.values(contract.sources) as { path: string; sha256: string }[]) {
      expect(hash(read(item.path)), item.path).toBe(item.sha256);
    }
    expect(exports.sources).toEqual(contract.sources);
    expect(hash(read(contract.legacyExportsSource.path))).toBe(contract.legacyExportsSource.sha256);
    const { revision, ...recipe } = contract;
    expect(revision).toBe(`canonical-${hash(Buffer.from(JSON.stringify(stable(recipe)))).slice(0, 16)}`);
    expect(brandRevision).toBe(revision);
    expect(contract.iconRaster).toEqual({ background: "none", density: 384, resize: "target!", strip: true, colorspace: "sRGB", format: "PNG32", opaqueFormat: "PNG24", excludePngChunks: ["date", "time"] });
    expect(Object.keys(exports.exports)).toHaveLength(34);
    for (const [path, item] of Object.entries(exports.exports) as [string, { sha256: string; dimensions?: number[] }][]) {
      const bytes = read(`public/${path}`);
      expect(hash(bytes), path).toBe(item.sha256);
      if (item.dimensions) {
        expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        expect(sizeOfPng(bytes), path).toEqual(item.dimensions);
      }
    }
  });

  it("uses exact theme-aware slab geometry and a conventional ICO fallback at 16, 32, and 48 px", () => {
    for (const theme of ["light", "dark"]) {
      const svg = read(`public${brandAssetBase}/favicon-${theme}.svg`).toString();
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      expect(doc.documentElement.getAttribute("viewBox")).toBe("0 0 64 64");
      expect([...doc.querySelectorAll("polygon")].map((p) => p.getAttribute("points"))).toEqual(contract.polygons);
      expect([...doc.querySelectorAll("polygon")].map((p) => p.getAttribute("fill"))).toEqual([
        theme === "light" ? "#0B0D0E" : "#F7F6F2",
        theme === "light" ? "#0B0D0E" : "#F7F6F2",
        "#8B9096",
      ]);
      expect(svg).not.toContain("#00A7C8");
      expect(doc.querySelector("rect")).toBeNull();
      expect(doc.querySelector("[stroke]")).toBeNull();
      const ink = transformedInk(svg, "browser-mark");
      expect(ink.maxY - ink.minY).toBeCloseTo(48, 8);
      expect((ink.minX + ink.maxX) / 2).toBeCloseTo(32, 8);
      expect((ink.minY + ink.maxY) / 2).toBeCloseTo(32, 8);
      if (theme === "dark") expect(read("public/favicon-dark.svg").toString()).toBe(svg);
    }
    const ico = read("public/favicon.ico");
    expect(ico).toEqual(read(`public${brandAssetBase}/favicon.ico`));
    expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    expect(ico).toEqual(read(`public${brandAssetBase}/favicon-dark.ico`));
    for (const theme of ["light", "dark"]) {
      const themedIco = read(`public${brandAssetBase}/favicon-${theme}.ico`);
      expect([...themedIco.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
      for (const [index, size] of [16, 32, 48].entries()) {
        const directory = 6 + 16 * index;
        expect([themedIco[directory], themedIco[directory + 1]]).toEqual([size, size]);
        const length = themedIco.readUInt32LE(directory + 8);
        const offset = themedIco.readUInt32LE(directory + 12);
        expect(sizeOfPng(themedIco.subarray(offset, offset + length))).toEqual([size, size]);
        expect(themedIco.subarray(offset, offset + length)).toEqual(read(`public${brandAssetBase}/favicon-${theme}-${size}.png`));
      }
    }
    expect(existsSync("app/icon.svg")).toBe(false);
    for (const path of ["public/icon.svg", "public/favicon.svg", "public/design-system/logo/favicon.svg"]) {
      expect(read(path)).toEqual(read(`public${brandAssetBase}/favicon-dark.svg`));
    }
    expect(contract.browser.defaultTheme).toBe("dark");
  });

  it("keeps both browser themes transparent outside the mark, including the ICO fallback pixels", () => {
    expect(contract.browser.plates).toEqual({ light: null, dark: null });
    expect(contract.browser.radius).toBe(0);
    for (const theme of ["light", "dark"]) for (const size of [16, 32, 48]) {
      const { width, height, pixels } = rgbaPng(read(`public${brandAssetBase}/favicon-${theme}-${size}.png`));
      let visible = 0, transparent = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4, alpha = pixels[offset + 3];
        // Keep the outer pixel ring clear; resampling may antialias into the
        // second row at 16 px because the approved mark reaches y = 8 / 64.
        if (Math.min(x, y, width - 1 - x, height - 1 - y) === 0) expect(alpha).toBe(0);
        if (alpha > 0) {
          expect([...pixels.subarray(offset, offset + 3)]).not.toEqual(theme === "dark" ? [11, 13, 14] : [247, 246, 242]);
          visible++;
        } else {
          transparent++;
        }
      }
      expect(visible).toBeGreaterThan(0);
      expect(transparent).toBeGreaterThan(visible);
    }
  });

  it("selects exactly one typed ICO synchronously and updates the same link on appearance changes", () => {
    const controller = read("brand-source/favicon-theme.js");
    expect(hash(controller)).toBe("438e2c44cada8c2a0ae77ff4000d87f5d943b00afda39a786850f5fe3871140e");
    expect(read(`public${brandAssetBase}/favicon-theme.js`)).toEqual(controller);
    for (const initiallyDark of [false, true]) {
      const links: { rel?: string; type?: string; sizes?: string; href?: string; dataset: Record<string, string> }[] = [];
      let change = () => {};
      const appearance = { matches: initiallyDark, addEventListener: (event: string, callback: () => void) => {
        expect(event).toBe("change"); change = callback;
      } };
      runInNewContext(controller.toString(), {
        window: { matchMedia: (query: string) => { expect(query).toBe("(prefers-color-scheme: dark)"); return appearance; } },
        document: {
          currentScript: { dataset: { lightIcon: `${brandAssetBase}/favicon-light.ico`, darkIcon: `${brandAssetBase}/favicon-dark.ico` } },
          createElement: (tag: string) => { expect(tag).toBe("link"); return { dataset: {} }; },
          head: { append: (link: typeof links[number]) => links.push(link) },
        },
      });
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({ rel: "icon", type: "image/x-icon", sizes: "16x16 32x32 48x48", href: `${brandAssetBase}/favicon-${initiallyDark ? "dark" : "light"}.ico` });
      appearance.matches = !initiallyDark; change();
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe(`${brandAssetBase}/favicon-${initiallyDark ? "light" : "dark"}.ico`);
    }
  });

  it("supplies opaque Apple/install icons and keeps all maskable ink inside the safe circle", () => {
    const manifest = json("public/site.webmanifest");
    expect(manifest).toMatchObject({ name: "Surfaces", start_url: "/", scope: "/", display: "standalone", background_color: "#0B0D0E", theme_color: "#0B0D0E" });
    expect(manifest.icons).toHaveLength(4);
    expect(manifest.icons.map((item: { purpose: string }) => item.purpose)).toEqual(["any", "any", "maskable", "maskable"]);
    for (const item of manifest.icons) {
      const bytes = read(`public${item.src}`);
      const size = Number(item.sizes.split("x")[0]);
      expect(item.type).toBe("image/png");
      expect(sizeOfPng(bytes)).toEqual([size, size]);
      expect(bytes[25]).toBe(2); // RGB, no alpha channel.
    }
    const apple = read(`public${brandAssetBase}/apple-touch-icon-180.png`);
    expect(sizeOfPng(apple)).toEqual([180, 180]);
    expect(apple[25]).toBe(2);
    expect(read("public/apple-touch-icon.png")).toEqual(apple);
    for (const [file, height] of [["install-icon.svg", 48], ["maskable-install-icon.svg", 36]] as const) {
      const svg = read(`public${brandAssetBase}/${file}`).toString();
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      expect(doc.querySelector("rect")?.hasAttribute("rx")).toBe(false);
      expect(doc.querySelector("rect")?.getAttribute("fill")).toBe("#0B0D0E");
      expect([...doc.querySelectorAll("polygon")].map((p) => p.getAttribute("points"))).toEqual(contract.polygons);
      expect([...doc.querySelectorAll("polygon")].map((p) => p.getAttribute("fill"))).toEqual(["#F7F6F2", "#F7F6F2", "#8B9096"]);
      const ink = transformedInk(svg, "install-mark");
      expect(ink.maxY - ink.minY).toBeCloseTo(height, 8);
      expect((ink.minX + ink.maxX) / 2).toBeCloseTo(32, 8);
      expect((ink.minY + ink.maxY) / 2).toBeCloseTo(32, 8);
      if (file.startsWith("maskable")) for (const [x, y] of ink.points) expect(Math.hypot(x - 32, y - 32)).toBeLessThanOrEqual(25.6);
    }
  });

  it("wires root and every public reference metadata override to versioned crawler-compatible PNG previews", async () => {
    expect(rootMetadata.icons).toEqual(brandIcons);
    expect(rootMetadata.manifest).toBe(brandManifest);
    expect(rootMetadata.applicationName).toBe("Surfaces");
    expect(rootMetadata.appleWebApp).toMatchObject({ capable: true, title: "Surfaces" });
    expect(rootMetadata.openGraph).toMatchObject({ images: [homeSocialImage] });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary_large_image", images: [homeSocialImage] });
    expect(referenceMetadata.openGraph).toMatchObject({ images: [designSystemSocialImage] });
    expect(referenceMetadata.twitter).toMatchObject({ images: [designSystemSocialImage] });
    for (const section of navItems.filter((item) => item.slug !== "overview")) {
      const metadata = await generateMetadata({ params: Promise.resolve({ section: section.slug }) });
      expect(metadata.openGraph).toMatchObject({ images: [designSystemSocialImage] });
      expect(metadata.twitter).toMatchObject({ images: [designSystemSocialImage] });
    }
    for (const image of [homeSocialImage, designSystemSocialImage]) {
      expect(image.url).toBe(`${brandAssetBase}/surfaces-social.png`);
      expect(sizeOfPng(read(`public${image.url}`))).toEqual([1200, 630]);
    }
    expect(designSystemSocialImage).toEqual(homeSocialImage);
    const layout = read("app/layout.tsx").toString();
    expect(layout).toContain('rel="mask-icon"');
    expect(layout).toContain('color="#0B0D0E"');
  });

  it("preserves complete outlined logos in social sources and refreshes legacy/download aliases", () => {
    for (const path of [`public${brandAssetBase}/surfaces-social.svg`, "public/design-system/logo/surfaces-social-card.svg"]) {
      const svg = read(path).toString();
      expect(svg).not.toMatch(/<text\b/);
      expect(svg).toContain('data-role="canonical-lockup"');
      expect(svg).toContain('data-role="wordmark"');
      expect(svg).toContain("#8B9096");
    }
    expect(read("public/assets/surfaces-platform-og.png")).toEqual(read(`public${homeSocialImage.url}`));
    expect(read("public/design-system/logo/surfaces-social-card.png")).toEqual(read(`public${designSystemSocialImage.url}`));
    expect(hash(read(`public${homeSocialImage.url}`))).toBe("04bef1742a52021646d0a92a4f0367688b5a3754228498d830439b7f94d4af92");
    expect(read(`public${brandAssetBase}/design-system-social.png`)).toEqual(read(`public${homeSocialImage.url}`));
    expect(read(`public${brandAssetBase}/surfaces-social.svg`)).toEqual(read("public/design-system/logo/surfaces-social-card.svg"));
    expect(read("public/design-system/logo/favicon.svg")).toEqual(read(`public${brandAssetBase}/favicon-dark.svg`));
    const archive = "public/design-system/brand-kit/surfaces-brand-kit-v0.2.zip";
    const usage = read("public/design-system/brand-kit/README.txt");
    expect(execFileSync("unzip", ["-p", archive, "README.txt"])).toEqual(usage);
    expect(usage.toString()).toContain("same transparent reversed dark fallback mark");
    expect(usage.toString()).toContain("Ivory/Nickel mark on an opaque Ink square");
    for (const path of ["surfaces-social-card.png", "app-icon.svg"]) {
      expect(execFileSync("unzip", ["-p", archive, path])).toEqual(read(`public/design-system/logo/${path}`));
    }
    expect(execFileSync("unzip", ["-p", archive, "site-brand/site.webmanifest"])).toEqual(read("public/site.webmanifest"));
    for (const filename of ["favicon.ico", "favicon-light.ico", "favicon-dark.ico", "favicon-theme.js", "apple-touch-icon-180.png", "icon-maskable-512.png"]) {
      expect(execFileSync("unzip", ["-p", archive, `site-brand/${filename}`])).toEqual(read(`public${brandAssetBase}/${filename}`));
    }
  });

  it("synchronizes old icon URLs and fingerprints the bytes each legacy manifest serves", () => {
    expect(contract.legacyIconRevisions).toEqual(["canonical-1d29168", "canonical-e9bf2b4d7deef5c9", "canonical-a9b274d33abd0420"]);
    const snapshots = json(contract.legacyExportsSource.path).manifests;
    for (const revision of contract.legacyIconRevisions) {
      const legacy = json(`public/brand/${revision}/exports.json`);
      expect(legacy.aliasOf).toBe(`${brandAssetBase}/exports.json`);
      expect(legacy.sourcePolicy.provenanceSource).toEqual(contract.legacyExportsSource);
      expect(legacy.historicalSources).toEqual(snapshots[revision].sources);
      for (const filename of contract.iconAliasFiles) {
        const path = `brand/${revision}/${filename}`;
        expect(read(`public/${path}`)).toEqual(read(`public${brandAssetBase}/${filename}`));
        expect(legacy.exports[path].aliasOf).toBe(`${brandAssetBase}/${filename}`);
      }
      for (const [path, spec] of Object.entries(legacy.exports) as [string, { sha256: string }][]) {
        expect(hash(read(`public/${path}`)), path).toBe(spec.sha256);
      }
      for (const [path, spec] of Object.entries(legacy.historicalNonIconExports)) {
        expect(spec).toEqual(snapshots[revision].exports[path]);
      }
    }
  });

  it("keeps the standalone HTML head aligned with the Next entrypoints", () => {
    const page = new DOMParser().parseFromString(read("app/homepage-content.html").toString(), "text/html");
    expect(page.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(`https://surfaces.systems${homeSocialImage.url}`);
    expect(page.querySelector('meta[name="twitter:image"]')?.getAttribute("content")).toBe(`https://surfaces.systems${homeSocialImage.url}`);
    expect(page.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe(brandManifest);
    expect(page.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href")).toBe(`${brandAssetBase}/apple-touch-icon-180.png`);
    expect(brandIcons).not.toHaveProperty("icon");
    for (const html of [page.documentElement.outerHTML, renderToStaticMarkup(<RootLayout><main>Fixture</main></RootLayout>)]) {
      const document = new DOMParser().parseFromString(html, "text/html");
      const controller = document.querySelector(`head > script[src="${brandAssetBase}/favicon-theme.js"]`)!;
      expect(controller).not.toBeNull();
      expect(controller.getAttribute("data-light-icon")).toBe(`${brandAssetBase}/favicon-light.ico`);
      expect(controller.getAttribute("data-dark-icon")).toBe(`${brandAssetBase}/favicon-dark.ico`);
      for (const attribute of ["async", "defer", "type"]) expect(controller.hasAttribute(attribute)).toBe(false);
      const icons = [...document.querySelectorAll('link[rel="icon"]')];
      expect(icons).toHaveLength(1);
      expect(icons[0].parentElement?.tagName).toBe("NOSCRIPT");
      expect(icons[0].getAttribute("href")).toBe(`${brandAssetBase}/favicon-light.ico`);
      expect(icons[0].getAttribute("type")).toBe("image/x-icon");
      expect(html.indexOf("favicon-theme.js")).toBeLessThan(html.indexOf("<body"));
    }
  });
});
