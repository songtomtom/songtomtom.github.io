# songtomtom.github.io

Astro([Astro Micro](https://github.com/trevortylerlee/astro-micro) 테마)로 만든 기술 블로그. https://songtomtom.github.io

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 미리보기
```

Node.js 22 이상이 필요합니다(`.nvmrc` 참고).

## 글 작성

`src/content/blog/<slug>/index.md` 파일을 추가합니다. 프로젝트는 `src/content/projects/<id>/index.md`에 추가하고, 글 프론트매터에 `project: <id>`와 `order: N`을 적으면 프로젝트 페이지에 순서대로 묶입니다. 

```md
---
title: '글 제목'
description: '한 줄 설명'
date: '2026-09-28'
tags: [tag1]
---

본문
```

## 배포

`master` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 GitHub Pages로 배포합니다.
