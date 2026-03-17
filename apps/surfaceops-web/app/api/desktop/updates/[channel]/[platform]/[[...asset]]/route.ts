import { NextResponse } from "next/server";
import {
  buildDesktopLatestMacYml,
  buildDesktopUpdateAssetPath,
  getPromotedDesktopRelease,
  loadDesktopReleaseManifest,
  parseDesktopReleaseChannel,
  parseDesktopReleasePlatform,
  resolveDesktopArtifact,
} from "@/lib/desktop-release-manifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      channel: string;
      platform: string;
      asset?: string[];
    }>;
  },
) {
  const { channel: rawChannel, platform: rawPlatform, asset = [] } = await context.params;
  const channel = parseDesktopReleaseChannel(rawChannel);
  const platform = parseDesktopReleasePlatform(rawPlatform);

  if (!channel || !platform) {
    return notFound("Unknown desktop update channel or platform.");
  }

  const manifest = await loadDesktopReleaseManifest();
  const release = getPromotedDesktopRelease(manifest, channel);
  if (!release) {
    return notFound(`No promoted ${channel} release is available yet.`);
  }

  if (asset.length === 0) {
    const zipPath = resolveDesktopArtifact(release, platform, "zip")?.url
      ? buildDesktopUpdateAssetPath(channel, platform, "download.zip")
      : null;
    const dmgPath = resolveDesktopArtifact(release, platform, "dmg")?.url
      ? buildDesktopUpdateAssetPath(channel, platform, "download.dmg")
      : null;

    return NextResponse.json({
      ok: true,
      channel,
      platform,
      release: {
        id: release.id,
        version: release.version,
        name: release.name,
        publishedAt: release.publishedAt,
        availability: release.availability,
        notes: release.notes,
        assets: {
          zip: zipPath,
          dmg: dmgPath,
          latestMacYml: buildDesktopUpdateAssetPath(channel, platform, "latest-mac.yml"),
        },
      },
    });
  }

  const requestedAsset = asset[0];
  if (requestedAsset === "latest-mac.yml") {
    const yaml = buildDesktopLatestMacYml(release, channel, platform);
    if (!yaml) {
      return notFound("No published updater metadata is available for this channel yet.");
    }

    return new Response(`${yaml}\n`, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream; charset=utf-8",
      },
    });
  }

  if (requestedAsset === "download.zip" || requestedAsset === "download.dmg") {
    const kind = requestedAsset.endsWith(".zip") ? "zip" : "dmg";
    const artifact = resolveDesktopArtifact(release, platform, kind);
    if (!artifact?.url) {
      return notFound(`No ${kind.toUpperCase()} artifact is available for this release yet.`);
    }

    return NextResponse.redirect(artifact.url, {
      status: 307,
    });
  }

  const origin = new URL(request.url).origin;
  return notFound(`Unsupported update asset on ${origin}.`);
}
