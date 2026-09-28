---
title: "블로그를 시작합니다"
description: "Astro와 GitHub Pages로 기술 블로그를 만든 이유와 구성"
date: "2026-09-28"
project: blog
category: frontend
tags:
  - blog
  - astro
---

기술 블로그를 시작합니다. 일하면서 배운 것, 문제를 해결한 과정, 설계 판단과 그 이유를 기록할 예정입니다.

## 구성

- 정적 사이트 생성기: [Astro](https://astro.build), 테마는 [Astro Micro](https://github.com/trevortylerlee/astro-micro)
- 호스팅: GitHub Pages
- 배포: GitHub Actions. `master` 브랜치에 푸시하면 자동으로 빌드되어 배포됩니다.
- 검색: Pagefind. 빌드 시 정적 인덱스를 만들어 서버 없이 검색합니다.

## 글 쓰는 방법

`src/content/blog/<slug>/index.md` 파일을 추가하면 글이 됩니다. 파일 상단의 frontmatter에 제목, 설명, 날짜, 태그를 적습니다.
