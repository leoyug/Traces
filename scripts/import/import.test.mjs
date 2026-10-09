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

for (const [kind, collection] of [["project", "projects"], ["article", "articles"]]) {
  test(`${kind} import appends to current content despite an outdated preview and repeated source orders`, async t => {
    const root = await fixture(t);
    const folder = path.join(root, "src/content", collection);
    await writeFile(path.join(folder, "existing.md"), "---\ntitle: Existing\norder: 1\n---\n正文\n");
    const plan = await buildImportPlan([
      { path: "new-one.md", buffer: Buffer.from("---\ntitle: New One\norder: 1\n---\n正文\n") },
      { path: "new-two.md", buffer: Buffer.from("---\ntitle: New Two\norder: 1\n---\n正文\n") },
    ], root, kind);
    await writeFile(path.join(folder, "intervening.md"), "---\ntitle: Added After Preview\norder: 2\n---\n正文\n");
    await commitImport(plan, plan.items.map(item => item.id), root);
    for (const [slug, order] of [["existing", 1], ["intervening", 2], ["new-one", 3], ["new-two", 4]]) {
      assert.match(await readFile(path.join(folder, `${slug}.md`), "utf8"), new RegExp(`^order: ${order}$`, "m"));
    }
  });
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
  assert.equal(project.payload.order, 2);
  assert.equal(project.payload.period, "2024");
  assert.equal(project.payload.year, undefined);
  assert.equal(project.payload.role, undefined);
  assert.ok(project.warnings.every((warning) => !warning.includes("职责")));
  assert.deepEqual(project.assets.map((asset) => asset.fileIndex), [1]);
  assert.equal(plan.items.find((item) => item.kind === "project-image").slug, "existing");
  await commitImport(plan, plan.items.filter((item) => item.action !== "skip").map((item) => item.id), root);
  assert.match(await readFile(path.join(root, "src/content/projects/new-work.md"), "utf8"), /cover: \/media\/projects\/new-work\//);
  assert.match(await readFile(path.join(root, "src/content/projects/new-work.md"), "utf8"), /period: ['"]?2024['"]?/);
  assert.doesNotMatch(await readFile(path.join(root, "src/content/projects/new-work.md"), "utf8"), /^year:/m);
  assert.match(await readFile(path.join(root, "src/content/projects/existing.md"), "utf8"), /cover: \/media\/projects\/existing\//);
});

test("project import preserves an explicit period instead of a legacy year", async (t) => {
  const root = await fixture(t);
  const plan = await buildImportPlan([
    { path: "range.md", buffer: Buffer.from("---\ntitle: 时间范围\nyear: 2024\nperiod: 2022-2025\nstatus: archive\nlabel: 进行中\naccent: sage\n---\n正文。") },
  ], root, "project");
  assert.equal(plan.items[0].payload.period, "2022-2025");
  assert.equal(plan.items[0].payload.status, "ongoing");
  await commitImport(plan, [plan.items[0].id], root);
  const content = await readFile(path.join(root, "src/content/projects/range.md"), "utf8");
  assert.match(content, /period: 2022-2025/);
  assert.doesNotMatch(content, /^year:/m);
  assert.doesNotMatch(content, /^(label|accent):/m);
  assert.match(content, /^status: ongoing/m);
  assert.match(content, /^updatedAt: ['"]?\d{4}-\d{2}-\d{2}/m);
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
