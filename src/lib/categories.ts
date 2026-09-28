export type Category = "frontend" | "backend" | "infra" | "mobile";

/**
 * 분야별 표시 정보. 사이트가 무채색이라 뱃지 색이 유일한 강조색이다.
 * 색은 shadcn/ui 테마 프리셋(ui.shadcn.com/themes)의 primary 값을 그대로 쓴다.
 *   Blue   light blue-600   dark blue-500
 *   Red    light red-600    dark red-600
 *   Violet light violet-600 dark violet-600
 *   Green  light green-600  dark green-500
 * 뱃지는 shadcn Badge 의 outline variant 에 분야 색을 옅게 얹은 형태. 단색 채움은 무채색 사이트에서 너무 튀었다.
 * chip 은 글 목록 필터 버튼이 선택됐을 때 같은 색을 쓰기 위한 클래스.
 */
export const CATEGORIES: Record<Category, { label: string; badge: string; chip: string }> = {
  frontend: {
    label: "Frontend",
    badge: "border-blue-600/25 bg-blue-600/10 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300",
    chip: "aria-pressed:border-blue-600/25 aria-pressed:bg-blue-600/10 aria-pressed:text-blue-700 dark:aria-pressed:border-blue-400/25 dark:aria-pressed:bg-blue-400/10 dark:aria-pressed:text-blue-300",
  },
  backend: {
    label: "Backend",
    badge: "border-red-600/25 bg-red-600/10 text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300",
    chip: "aria-pressed:border-red-600/25 aria-pressed:bg-red-600/10 aria-pressed:text-red-700 dark:aria-pressed:border-red-400/25 dark:aria-pressed:bg-red-400/10 dark:aria-pressed:text-red-300",
  },
  infra: {
    label: "Infra",
    badge: "border-violet-600/25 bg-violet-600/10 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300",
    chip: "aria-pressed:border-violet-600/25 aria-pressed:bg-violet-600/10 aria-pressed:text-violet-700 dark:aria-pressed:border-violet-400/25 dark:aria-pressed:bg-violet-400/10 dark:aria-pressed:text-violet-300",
  },
  mobile: {
    label: "Mobile",
    badge: "border-green-600/25 bg-green-600/10 text-green-700 dark:border-green-400/25 dark:bg-green-400/10 dark:text-green-300",
    chip: "aria-pressed:border-green-600/25 aria-pressed:bg-green-600/10 aria-pressed:text-green-700 dark:aria-pressed:border-green-400/25 dark:aria-pressed:bg-green-400/10 dark:aria-pressed:text-green-300",
  },
};

export const CATEGORY_ORDER: Category[] = ["frontend", "backend", "infra", "mobile"];
