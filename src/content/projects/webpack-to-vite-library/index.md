---
title: "webpack에서 Vite 라이브러리 모드로"
description: "WebGL 스프라이트 렌더러 하나를 webpack 설정 세 개에서 Vite 라이브러리 모드 하나로 옮긴 과정. 세 포맷 출력, exports 맵, 셰이더 raw import, Buffer 폴리필, CommonJS 의존성 문제를 다룹니다."
date: "2026-09-28"
repoURL: "https://github.com/songtomtom/webpack-to-vite-library"
tech: ["Vite", "webpack", "WebGL", "Rollup"]
category: frontend
---

브라우저와 Node 양쪽에서 쓰는 WebGL 라이브러리를 webpack에서 Vite로 옮겼습니다. 원래는 web(UMD)·node(CommonJS)·playground 세 개의 webpack 설정이 하나의 파일에 들어 있었고, 셰이더 소스를 raw-loader로 읽고 Buffer 폴리필을 fallback으로 끼워 넣는 구조였습니다.

저장소는 전환 전과 후를 둘 다 담고 있습니다.

- `webpack` 태그: 전환 전. 하나의 `webpack.config.js`가 세 결과물을 만듭니다.
- `main`: 전환 후. `vite.config.mjs` 하나가 es·cjs·umd 세 포맷과 playground 모드를 담당하고, `package.json`의 `exports` 맵이 소비자별 진입점을 정합니다.

1편은 설정 구조를 어떻게 합쳤는지, 2편은 옮기며 걸린 것들(셰이더 import, Buffer, CommonJS 의존성, 소스맵 경고)을 어떻게 풀었는지입니다.
