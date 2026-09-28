import type { Metadata, Site, Socials } from "@types";

export const SITE: Site = {
  TITLE: "songtomtom",
  DESCRIPTION: "Go, TypeScript, Flutter, Kubernetes를 다루는 풀스택 개발자 songtomtom의 기술 블로그",
  NUM_POSTS_ON_HOMEPAGE: 5,
  NUM_PROJECTS_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "홈",
  DESCRIPTION: "개발자 songtomtom의 기술 블로그",
};

export const BLOG: Metadata = {
  TITLE: "글",
  DESCRIPTION: "일하면서 배운 것, 문제를 해결한 과정, 설계 판단과 그 이유를 기록합니다.",
};

export const PROJECTS: Metadata = {
  TITLE: "프로젝트",
  DESCRIPTION: "공개 저장소가 있는 개인 프로젝트. 각 프로젝트의 글을 순서대로 모아 둡니다.",
};

export const RESUME: Metadata = {
  TITLE: "이력서",
  DESCRIPTION: "송준영(songtomtom)의 경력과 기술 스택",
};

export const SOCIALS: Socials = [
  {
    NAME: "GitHub",
    HREF: "https://github.com/songtomtom",
  },
  {
    NAME: "Email",
    HREF: "mailto:celvincolvumn@gmail.com",
  },
];
