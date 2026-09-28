# songtomtom.github.io

Astro로 만든 기술 블로그. https://songtomtom.github.io

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 미리보기
```

Node.js 22 이상이 필요합니다(`.nvmrc` 참고).

## 글 작성

`src/content/blog/` 에 마크다운(`.md`) 또는 MDX(`.mdx`) 파일을 추가합니다.

```md
---
title: '글 제목'
description: '한 줄 설명'
pubDate: '2026-09-28'
---

본문
```

## 배포

`master` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 GitHub Pages로 배포합니다.
