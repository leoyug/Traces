import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exiftool } from "exiftool-vendored";

function safeText(value) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text && text !== "-" ? text.slice(0, 160) : undefined;
}

function dateOnly(value) {
  let year;
  let month;
  let day;
  if (value && typeof value === "object") {
    ({ year, month, day } = value);
  } else {
    const match = String(value ?? "").match(/^(\d{4})[:-](\d{1,2})[:-](\d{1,2})(?:\D|$)/);
    if (match) [year, month, day] = match.slice(1, 4).map(Number);
  }
  year = Number(year);
  month = Number(month);
  day = Number(day);
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cameraName(tags) {
  const make = safeText(tags.Make);
  const model = safeText(tags.Model ?? tags.CameraModelName);
  if (!make) return model;
  if (!model) return make;
  return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
}

function focalLength(value) {
  const text = safeText(value);
  if (!text) return undefined;
  const match = text.match(/^(\d+(?:\.\d+)?)\s*mm$/i) ?? text.match(/^(\d+(?:\.\d+)?)$/);
  return match && Number(match[1]) > 0 ? `${Number(match[1])} mm` : undefined;
}

function aperture(value) {
  const text = safeText(value);
  const match = text?.match(/^(?:f\s*\/\s*)?(\d+(?:\.\d+)?)$/i);
  return match && Number(match[1]) > 0 ? `f/${Number(match[1])}` : undefined;
}

function shutterSpeed(value) {
  const text = safeText(value)?.replace(/\s*(?:seconds?|secs?|s)$/i, "").trim();
  if (!text) return undefined;
  if (/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(text)) return `${text} s`;
  const seconds = Number(text);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  if (seconds < 1) {
    const denominator = Math.round(1 / seconds);
    if (denominator > 1 && Math.abs(1 / denominator - seconds) / seconds < 0.01) return `1/${denominator} s`;
  }
  return `${seconds} s`;
}

function isoValue(value) {
  const iso = Number(value);
  return Number.isInteger(iso) && iso > 0 ? iso : undefined;
}

function definedFields(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

export function publicMetadataFromTags(tags) {
  return definedFields({
    capturedAt: dateOnly(tags.DateTimeOriginal ?? tags.CreateDate),
    camera: cameraName(tags),
    lens: safeText(tags.LensModel ?? tags.LensID),
    focalLength: focalLength(tags.FocalLength),
    aperture: aperture(tags.FNumber),
    shutterSpeed: shutterSpeed(tags.ExposureTime),
    iso: isoValue(tags.ISO),
  });
}

export function explicitPublicPhotoMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return definedFields({
    capturedAt: dateOnly(value.capturedAt),
    place: safeText(value.place),
    camera: safeText(value.camera),
    lens: safeText(value.lens),
    focalLength: safeText(value.focalLength),
    aperture: safeText(value.aperture),
    shutterSpeed: safeText(value.shutterSpeed),
    iso: isoValue(value.iso),
  });
}

export async function readPublicPhotoMetadata(file) {
  return publicMetadataFromTags(await exiftool.read(file));
}

export async function readPublicPhotoMetadataFromBuffer(buffer, name) {
  const temporary = await mkdtemp(path.join(tmpdir(), "incessant-photo-metadata-"));
  const extension = /\.(jpe?g|png|webp|avif)$/i.exec(name)?.[0].toLowerCase() ?? ".jpg";
  try {
    const file = path.join(temporary, `original${extension}`);
    await writeFile(file, buffer, { flag: "wx", mode: 0o600 });
    return await readPublicPhotoMetadata(file);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
