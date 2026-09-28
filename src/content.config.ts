import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/** 글과 프로젝트의 분야. 뱃지 색과 필터에 쓴다. */
const category = z.enum(["frontend", "backend", "infra", "mobile"]);

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    category: category.optional(),
    /** 이 글이 속한 프로젝트 id (src/content/projects/<id>) */
    project: z.string().optional(),
    /** 프로젝트 안에서의 순서. 연재물의 편 번호 */
    order: z.number().optional(),
    /** 원문이 다른 곳에 있으면 그 주소 */
    canonical: z.url().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
    repoURL: z.url().optional(),
    demoURL: z.url().optional(),
    tech: z.array(z.string()).optional(),
    category: category.optional(),
  }),
});

export const collections = { blog, projects };
