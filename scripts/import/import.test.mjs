import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { exiftool } from "exiftool-vendored";
import { buildImportPlan } from "./plan.mjs";
import { commitImport } from "./commit.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "incessant-import-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const folder of ["projects", "articles", "photos"]) await mkdir(path.join(root, "src/content", folder), { recursive: true });
  return root;
}

test("project images match by slug without stealing another project's cover", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "src/content/projects/existing.md"), "---\ntitle: Existing\norder: 5\narchiveImages: []\n---\n");
  const image = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#abcdef" } }).jpeg().toBuffer();
  const plan = await buildImportPlan([
    { path: "new-work.md", buffer: Buffer.from("---\ntitle: 新项目\nyear: 2024\n---\n![封面](./cover.jpg)") },
    { path: "cover.jpg", buffer: image },
    { path: "existing-cover.jpg", buffer: image },
  ], root, "project");
  const project = plan.items.find((item) => item.kind === "project");
  assert.equal(project.payload.order, 6);
  assert.deepEqual(project.assets.map((asset) => asset.fileIndex), [1]);
  assert.equal(plan.items.find((item) => item.kind === "project-image").slug, "existing");
  await commitImport(plan, plan.items.filter((item) => item.action !== "skip").map((item) => item.id), root);
  assert.match(await readFile(path.join(root, "src/content/projects/new-work.md"), "utf8"), /cover: \/media\/projects\/new-work\//);
  assert.match(await readFile(path.join(root, "src/content/projects/existing.md"), "utf8"), /cover: \/media\/projects\/existing\//);
});

test("photo batch is drafted, ordered, and stripped of EXIF", async (t) => {
  const root = await fixture(t);
  const original = path.join(root, "original.jpg");
  await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#abcdef" } })
    .jpeg().toFile(original);
  await exiftool.write(original, {
    DateTimeOriginal: "2024:01:21 16:28:21",
    Make: "TEST",
    Model: "Camera 1",
    LensModel: "Test Lens",
    FocalLength: "74 mm",
    FNumber: 4,
    ExposureTime: "1/1000",
    ISO: 160,
    GPSLatitude: 23.125,
    GPSLongitude: 113.25,
    SerialNumber: "PRIVATE-123",
  });
  const image = await readFile(original);
  const plan = await buildImportPlan([
    { path: "photos/shore-2/src.jpg", buffer: image },
    { path: "photos/shore-1/src.jpg", buffer: image },
  ], root, "photo");
  assert.deepEqual(plan.items.map((item) => item.slug), ["shore-1", "shore-2"]);
  await commitImport(plan, plan.items.map((item) => item.id), root);
  const photo = JSON.parse(await readFile(path.join(root, "src/content/photos/shore-1.json"), "utf8"));
  const metadata = await sharp(path.join(root, "public", photo.src)).metadata();
  assert.equal(photo.draft, true);
  assert.equal(photo.order, 1);
  assert.equal(photo.width, 2400);
  assert.deepEqual(photo.publicMetadata, {
    capturedAt: "2024-01-21",
    camera: "TEST Camera 1",
    lens: "Test Lens",
    focalLength: "74 mm",
    aperture: "f/4",
    shutterSpeed: "1/1000 s",
    iso: 160,
  });
  assert.match(plan.items[0].metadataPreview, /TEST Camera 1/);
  assert.doesNotMatch(JSON.stringify(photo), /PRIVATE-123|23\.125|113\.25/);
  assert.equal(metadata.exif, undefined);
});

test("article relationship uses explicit project title", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "src/content/projects/known-work.md"), "---\ntitle: 已有项目\n---\n");
  const plan = await buildImportPlan([{ path: "story.md", buffer: Buffer.from("---\ntitle: 我的文章\nrelatedProjects: [已有项目]\n---\n正文。") }], root, "article");
  assert.deepEqual(plan.items[0].payload.relatedProjects, ["known-work"]);
});
