// @vitest-environment jsdom

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { brandRevision, brandAssetBase, brandIcons, brandManifest, homeSocialImage, designSystemSocialImage } from "@/lib/brand-metadata";
import { metadata as rootMetadata } from "@/app/layout";
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
    const { revision, ...recipe } = contract;
    expect(revision).toBe(`canonical-${hash(Buffer.from(JSON.stringify(stable(recipe)))).slice(0, 16)}`);
    expect(brandRevision).toBe(revision);
    expect(contract.iconRaster).toEqual({ background: "none", density: 384, resize: "target!", strip: true, colorspace: "sRGB", format: "PNG32", opaqueFormat: "PNG24", excludePngChunks: ["date", "time"] });
    expect(Object.keys(exports.exports)).toHaveLength(30);
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
      const plate = doc.querySelector("rect")!;
      expect(plate.getAttribute("rx")).toBe("8");
      expect(plate.getAttribute("fill")).toBe(theme === "light" ? "#F7F6F2" : "#0B0D0E");
      const ink = transformedInk(svg, "browser-mark");
      expect(ink.maxY - ink.minY).toBeCloseTo(48, 8);
      expect((ink.minX + ink.maxX) / 2).toBeCloseTo(32, 8);
      expect((ink.minY + ink.maxY) / 2).toBeCloseTo(32, 8);
      expect(read(`public/${theme === "light" ? "favicon.svg" : "favicon-dark.svg"}`).toString()).toBe(svg);
    }
    const ico = read("public/favicon.ico");
    expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    for (const [index, size] of [16, 32, 48].entries()) {
      const directory = 6 + 16 * index;
      expect([ico[directory], ico[directory + 1]]).toEqual([size, size]);
      const length = ico.readUInt32LE(directory + 8);
      const offset = ico.readUInt32LE(directory + 12);
      expect(sizeOfPng(ico.subarray(offset, offset + length))).toEqual([size, size]);
      expect(ico.subarray(offset, offset + length)).toEqual(read(`public${brandAssetBase}/favicon-light-${size}.png`));
    }
    expect(existsSync("app/icon.svg")).toBe(false);
    expect(read("public/icon.svg").toString()).toContain("@media(prefers-color-scheme:dark)");
  });

  it("supplies opaque Apple/install icons and keeps all maskable ink inside the safe circle", () => {
    const manifest = json("public/site.webmanifest");
    expect(manifest).toMatchObject({ name: "Surfaces", start_url: "/", scope: "/", display: "standalone", background_color: "#F7F6F2", theme_color: "#0B0D0E" });
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
      expect(doc.querySelector("rect")?.getAttribute("fill")).toBe("#F7F6F2");
      expect([...doc.querySelectorAll("polygon")].map((p) => p.getAttribute("points"))).toEqual(contract.polygons);
      expect([...doc.querySelectorAll("polygon")].map((p) => p.getAttribute("fill"))).toEqual(["#0B0D0E", "#0B0D0E", "#8B9096"]);
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
    expect(read("public/design-system/logo/favicon.svg")).toEqual(read(`public${brandAssetBase}/favicon-light.svg`));
    const archive = "public/design-system/brand-kit/surfaces-brand-kit-v0.2.zip";
    for (const path of ["surfaces-social-card.png", "app-icon.svg"]) {
      expect(execFileSync("unzip", ["-p", archive, path])).toEqual(read(`public/design-system/logo/${path}`));
    }
    expect(execFileSync("unzip", ["-p", archive, "site-brand/site.webmanifest"])).toEqual(read("public/site.webmanifest"));
  });

  it("keeps the standalone HTML head aligned with the Next entrypoints", () => {
    const page = new DOMParser().parseFromString(read("app/homepage-content.html").toString(), "text/html");
    expect(page.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(`https://surfaces.systems${homeSocialImage.url}`);
    expect(page.querySelector('meta[name="twitter:image"]')?.getAttribute("content")).toBe(`https://surfaces.systems${homeSocialImage.url}`);
    expect(page.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe(brandManifest);
    expect(page.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href")).toBe(`${brandAssetBase}/apple-touch-icon-180.png`);
    const actualIcons = [...page.querySelectorAll('link[rel="icon"]')].map((icon) => ({
      url: icon.getAttribute("href"), sizes: icon.getAttribute("sizes"), type: icon.getAttribute("type"), media: icon.getAttribute("media"),
    }));
    if (!brandIcons || typeof brandIcons !== "object" || !("icon" in brandIcons) || !Array.isArray(brandIcons.icon)) {
      throw new Error("Expected the brand icon descriptor list.");
    }
    const expectedIcons = brandIcons.icon.map((icon) => {
      if (!icon || typeof icon !== "object" || !("url" in icon)) {
        throw new Error("Expected an explicit brand icon descriptor.");
      }
      return { ...icon, url: String(icon.url), media: icon.media ?? null };
    });
    expect(actualIcons).toEqual(expectedIcons);
  });
});
