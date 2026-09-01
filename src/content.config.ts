import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const publicationFields = {
  title: z.string().min(1),
  description: z.string().min(1),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  draft: z.boolean().default(false),
};

const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    ...publicationFields,
    tags: z.array(z.string().min(1)).default([]),
    readingMinutes: z.number().int().positive(),
    featured: z.boolean().default(false),
    relatedProjects: z.array(reference("projects")).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    ...publicationFields,
    year: z.number().int().min(2000).max(2100),
    status: z.enum(["launched", "experiment", "archive"]),
    role: z.string().min(1),
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative().default(0),
    accent: z.enum(["clay", "sage", "blue"]),
    privacyNote: z.string().optional(),
    relatedArticles: z.array(reference("articles")).default([]),
  }),
});

const photos = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/photos" }),
  schema: z.object({
    ...publicationFields,
    alt: z.string().default(""),
    sourceFile: z.string().min(1).optional(),
    albums: z.array(reference("albums")).default([]),
    tags: z.array(z.string().min(1)).default([]),
    publicMetadata: z.object({
      capturedAt: z.coerce.date().optional(),
      camera: z.string().optional(),
      lens: z.string().optional(),
      focalLength: z.string().optional(),
      aperture: z.string().optional(),
      shutterSpeed: z.string().optional(),
      iso: z.number().int().positive().optional(),
      place: z.string().optional(),
    }).default({}),
  }).superRefine((photo, context) => {
    if (photo.draft) return;
    if (!photo.alt) context.addIssue({ code: "custom", path: ["alt"], message: "正式发布的照片必须填写替代文本" });
  }),
});

const albums = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/albums" }),
  schema: z.object({
    ...publicationFields,
    dateRange: z.string().optional(),
    places: z.array(z.string().min(1)).default([]),
    photos: z.array(reference("photos")).default([]),
    coverPhoto: reference("photos").optional(),
  }),
});

const resume = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/resume" }),
  schema: z.object({
    name: z.string().min(1),
    publicName: z.string().min(1),
    title: z.string().min(1),
    location: z.string().min(1),
    email: z.email(),
    summary: z.string().min(1),
    experience: z.array(z.object({
      period: z.string().min(1),
      role: z.string().min(1),
      organization: z.string().min(1),
      summary: z.string().min(1),
    })).min(1),
    projects: z.array(z.object({
      name: z.string().min(1),
      summary: z.string().min(1),
      tags: z.array(z.string().min(1)).min(1),
    })).default([]),
    skills: z.array(z.object({
      label: z.string().min(1),
      items: z.array(z.string().min(1)).min(1),
    })).default([]),
    education: z.object({
      school: z.string().min(1),
      degree: z.string().min(1),
      period: z.string().min(1),
      place: z.string().min(1),
    }).optional(),
    links: z.array(z.object({
      label: z.string().min(1),
      href: z.url(),
    })).default([]),
  }),
});

export const collections = { articles, projects, albums, photos, resume };
