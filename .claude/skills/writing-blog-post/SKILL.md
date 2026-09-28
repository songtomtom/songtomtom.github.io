---
name: writing-blog-post
description: Use when asked to add, write, or expand a blog post, series, or project on this Astro blog (src/content/blog, src/content/projects), or to create the example code repository that a post cites.
---

# 블로그 글·프로젝트 만들기

## Overview
글은 저장소의 실제 코드를 인용하고, 코드 저장소와 글이 서로를 링크한다. 순서는 **코드 → 검증 → 푸시 → 글 → 검증 → 푸시 → 배포 확인**이다.

## 저장소가 말해 주지 않는 것
- **Node 24가 필요하다.** 기본 셸의 node는 v20이라 Astro가 거부한다. 매 명령 앞에:
  `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"`
- **푸시는 브랜치와 master 둘 다 직접.** PR을 만들지 않는다.
  `git push origin <branch> && git push origin HEAD:master`
- **빌드는 종료 코드로 판정한다.** `grep`으로 출력을 거르면 실패해도 성공으로 보인다. `npx astro check && npx astro build` 가 0으로 끝난 뒤에만 커밋한다.
- **배포 확인까지가 완료다.** `gh run list --limit 1`로 성공을 기다린 뒤, 배포된 페이지를 실제로 연다. Mermaid나 스크립트를 건드렸으면 브라우저에서 그림이 그려지는지 본다.
- **프론트매터 필드를 추가했으면** 개발 서버는 옛 스키마를 캐시한다. `rm -rf .astro` 후 재시작.

## 코드 저장소
- 이름은 프로젝트 id와 같게 `github.com/songtomtom/<kebab-id>`. 새로 만들 때 `gh repo create --public`. 로컬은 블로그 워크트리 밖에 둔다.
- 빌드·테스트에 더해 **실제로 실행해 결과를 얻는다** (컨테이너 띄우기, 스모크 테스트). 글의 출력은 이 결과만 쓴다.
- README에 구조, 실행법, 그리고 **블로그 글 링크**를 넣는다. 글 URL은 `https://songtomtom.github.io/blog/<글 디렉터리명>` 으로 배포 전에 확정된다. `.idea` 같은 IDE 파일은 지운다.

## 글
- 뼈대: 문제 정의와 만들 것 → 단계마다 "왜" → 동작 원리 섹션 → 한계와 다음 편 → Reference.
- 1인칭 "-습니다"체. "처음에 이렇게 했다가 고쳤다"는 실제 과정을 쓴다. 코드는 저장소 파일을 그대로 인용하고 앞에 `` `path/file` `` 한 줄.
- 그림은 ```mermaid 블록. 시리즈 1편에 전체 구조도.
- 프론트매터: `category`, `project`, `order` 필수. `date`는 작성일이고 시리즈 순서는 `order`가 정한다. 글 디렉터리명이 URL이므로 kebab-case 영문. 기존 글과 `src/content/projects/*/index.md`를 그대로 따른다.
- 프로젝트 `cover.png`는 선택. 없으면 넣지 않고 구조도는 Mermaid로 그린다.
- 커밋 메시지는 한국어 한 줄 제목, 끝에 Co-Authored-By 줄. `.claude/`는 커밋한다.
- **회사, 회사 제품, 사내 시스템 언급 금지.** 순수 기술만. 회사 경력은 이력서 페이지의 몫이다.
- 만들어 낸 수치, 실행하지 않은 출력, 확인 안 한 버전 주장은 넣지 않는다.

## Common Mistakes
| 실수 | 결과 |
|---|---|
| 빌드 출력을 grep으로 확인 | 실패한 커밋이 master에 올라가 배포가 깨진다 |
| 스크립트 수정 후 빌드만 확인 | 화면에서는 안 그려지는데 모른다 |
| 시리즈 전체를 한 번에 씀 | 검수 없이 같은 결함이 모든 편에 복제된다. 1편 먼저 검수받는다 |
