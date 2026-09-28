export type Category = "frontend" | "backend" | "infra" | "mobile";

/**
 * 분야별 표시 정보. 사이트가 무채색이라 뱃지 색이 유일한 강조색이다.
 * 색은 shadcn/ui 테마 프리셋(ui.shadcn.com/themes)의 primary 값을 그대로 쓴다.
 *   Blue   light blue-600   dark blue-500
 *   Red    light red-600    dark red-600
 *   Orange light orange-500 dark orange-600
 *   Violet light violet-600 dark violet-600
 * 뱃지는 shadcn Badge 의 default variant(단색 채움, 흰 글자).
 */
export const CATEGORIES: Record<Category, { label: string; badge: string; dot: string }> = {
  frontend: {
    label: "Frontend",
    badge: "border-transparent bg-blue-600 text-white dark:bg-blue-500",
    dot: "bg-blue-600 dark:bg-blue-500",
  },
  backend: {
    label: "Backend",
    badge: "border-transparent bg-red-600 text-white dark:bg-red-600",
    dot: "bg-red-600",
  },
  infra: {
    label: "Infra",
    badge: "border-transparent bg-orange-500 text-white dark:bg-orange-600",
    dot: "bg-orange-500 dark:bg-orange-600",
  },
  mobile: {
    label: "Mobile",
    badge: "border-transparent bg-violet-600 text-white dark:bg-violet-600",
    dot: "bg-violet-600",
  },
};

export const CATEGORY_ORDER: Category[] = ["frontend", "backend", "infra", "mobile"];
