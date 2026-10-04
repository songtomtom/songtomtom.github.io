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
    /** 이 글이 속한 시리즈 id (src/content/series/<id>) */
    series: z.string().optional(),
    /** 시리즈 안에서의 순서. 연재물의 편 번호 */
    order: z.number().optional(),
    /** 원문이 다른 곳에 있으면 그 주소 */
    canonical: z.url().optional(),
  }),
});

/** 시리즈: 공개 저장소 하나와 그 저장소를 다룬 연재 글 묶음 */
const series = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/series" }),
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

/** 프로젝트: 사내·개인 프로젝트의 기술 결정을 정리한 케이스. 이력서 항목에서 연결한다 */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** 시작 연월. 정렬 기준 */
    date: z.coerce.date(),
    /** 끝 연월. 없으면 진행 중 */
    endDate: z.coerce.date().optional(),
    draft: z.boolean().optional(),
    /** 소속 (회사명 또는 개인) */
    org: z.string().optional(),
    /** 맡은 역할 한 줄 */
    role: z.string().optional(),
    tech: z.array(z.string()).optional(),
    categories: z.array(category).optional(),
    links: z.array(z.object({ label: z.string(), href: z.url() })).optional(),
    /** 핵심 숫자. 상단에 크게 표시 */
    stats: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  }),
});

export const collections = { blog, series, projects };
