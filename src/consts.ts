import type { Metadata, Site, Socials } from "@types";

export const SITE: Site = {
  TITLE: "songtomtom",
  DESCRIPTION: "Go, TypeScript, Flutter, Kubernetes를 다루는 풀스택 개발자 songtomtom의 기술 블로그",
  NUM_POSTS_ON_HOMEPAGE: 5,
  NUM_SERIES_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "홈",
  DESCRIPTION: "개발자 songtomtom의 기술 블로그",
};

export const BLOG: Metadata = {
  TITLE: "글",
  DESCRIPTION: "일하면서 배운 것, 문제를 해결한 과정, 설계 판단과 그 이유를 기록합니다.",
};

export const SERIES: Metadata = {
  TITLE: "시리즈",
  DESCRIPTION: "공개 저장소 하나와 그 저장소를 다룬 연재 글. 순서대로 읽을 수 있게 묶어 둡니다.",
};

export const PROJECTS: Metadata = {
  TITLE: "프로젝트",
  DESCRIPTION: "회사와 개인에서 만든 시스템의 기술 결정을 정리합니다. 화면과 업무 절차는 싣지 않고 구조와 이유만 담습니다.",
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
