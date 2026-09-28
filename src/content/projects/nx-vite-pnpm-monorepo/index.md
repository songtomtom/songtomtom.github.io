---
title: "Nx + pnpm 모노레포"
description: "단일 Vite React 앱을 Nx와 pnpm workspace로 앱 2개, 라이브러리 3개로 쪼갠 과정. 추론 플러그인, tsconfig paths 하나로 Vite와 Nx를 맞추는 방법, 의존 방향 강제와 affected 기반 CI를 다룹니다."
date: "2026-09-28T23:15"
repoURL: "https://github.com/songtomtom/nx-vite-pnpm-monorepo"
tech: ["Nx", "pnpm", "Vite", "React", "TypeScript"]
category: frontend
---

한 폴더에서 자라던 React 앱에 두 번째 앱이 필요해졌습니다. 같은 도메인 로직과 UI를 써야 하는데 복사할 수는 없어서, 앱을 쪼개고 공유할 것을 라이브러리로 뺐습니다. 도구는 Nx와 pnpm workspace입니다.

저장소는 전환 전과 후를 둘 다 담고 있습니다.

- `single-app` 태그: 전환 전. `src/` 하나에 UI, 도메인, API가 폴더로만 나뉘어 있습니다.
- `main`: 전환 후. `apps/` 2개와 `libs/` 3개. 라이브러리는 빌드하지 않고 `tsconfig.base.json`의 `paths`로 소스째 참조합니다. 타깃은 `project.json` 없이 Nx 추론 플러그인이 만듭니다.

1편은 쪼개는 과정과 Nx가 무엇을 자동으로 해 주는지, 2편은 경로 별칭을 Vite와 Nx가 같이 쓰게 하는 방법과 의존 방향 강제, affected 기반 CI입니다.
