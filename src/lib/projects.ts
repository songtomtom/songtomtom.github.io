import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;
export type Series = CollectionEntry<"series">;
export type Project = CollectionEntry<"projects">;

/** 공개된 글 전체. 최신순 */
export async function getPosts(): Promise<Post[]> {
  return (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 공개된 시리즈 전체. 최신순 */
export async function getSeries(): Promise<Series[]> {
  return (await getCollection("series"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 시리즈에 속한 글을 order 오름차순, 없으면 날짜 오름차순으로 */
export function postsOfSeries(posts: Post[], seriesId: string): Post[] {
  return posts
    .filter((p) => p.data.series === seriesId)
    .sort((a, b) => {
      const ao = a.data.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.data.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.data.date.valueOf() - b.data.date.valueOf();
    });
}

/** 공개된 프로젝트(케이스) 전체. 시작일 최신순 */
export async function getProjects(): Promise<Project[]> {
  return (await getCollection("projects"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
