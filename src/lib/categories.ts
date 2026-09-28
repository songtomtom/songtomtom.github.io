export type Category = "frontend" | "backend" | "infra" | "mobile";

/**
 * 분야별 표시 정보. 사이트가 무채색이라 뱃지 색이 유일한 강조색이다.
 * badge 는 shadcn/ui Badge 의 default variant(단색 채움)를 분야 색으로 바꾼 것.
 */
export const CATEGORIES: Record<Category, { label: string; badge: string; dot: string }> = {
  frontend: {
    label: "Frontend",
    badge: "border-transparent bg-sky-600 text-white dark:bg-sky-500",
    dot: "bg-sky-600 dark:bg-sky-500",
  },
  backend: {
    label: "Backend",
    badge: "border-transparent bg-emerald-600 text-white dark:bg-emerald-500",
    dot: "bg-emerald-600 dark:bg-emerald-500",
  },
  infra: {
    label: "Infra",
    badge: "border-transparent bg-amber-600 text-white dark:bg-amber-500",
    dot: "bg-amber-600 dark:bg-amber-500",
  },
  mobile: {
    label: "Mobile",
    badge: "border-transparent bg-violet-600 text-white dark:bg-violet-500",
    dot: "bg-violet-600 dark:bg-violet-500",
  },
};

export const CATEGORY_ORDER: Category[] = ["frontend", "backend", "infra", "mobile"];
