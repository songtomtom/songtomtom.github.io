---
title: "React 프로젝트에 Scratch3 블럭 랜더링 하기"
description: "Rush 모노레포에 scratch-blocks와 React 앱을 묶고 inject 함수로 스크래치 블록 워크스페이스를 React 컴포넌트 안에 렌더링합니다."
date: "2025-01-10"
project: scratch-blocks
order: 1
canonical: "https://medium.com/@songtomtom/react-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%EC%97%90-scratch3-%EB%B8%94%EB%9F%AD-%EB%9E%9C%EB%8D%94%EB%A7%81-%ED%95%98%EA%B8%B0-23e2d90777af"
tags:
  - react
  - scratch
  - rush
  - monorepo
---

스크래치(Scratch3) 는 세계적인 오픈소스 블럭코딩 어플리케이션입니다. 스크래치 프로젝트에서 블럭만 분리하여 랜더링 해보겠습니다.

## 모노레포 구성

스크래치 블럭 라이브러리([scratch-blocks](https://velog.io/@songtomtom/git@github.com:LLK/scratch-blocks.git)), React UI(my-app) 프로젝트를 관리 하기 위해 [Rush](https://rushjs.io/) 를 사용하여 모노레포를 구성합니다.

모노레포 구성을 위해 Rush 를 설치합니다.

```bash
npm install -g @microsoft/rush
```

모노레포를 구성할 디렉토리를 만들고 rush init 명령어를 실행합니다.

```bash
mkdir my-monorepo
cd my-monorepo
rush init
```

모노레포가 성공적으로 구성 됬을 경우:

```text
.
├── common
│   ├── config
│   │   └── rush
│   │       ├── artifactory.json
│   │       ├── build-cache.json
│   │       ├── command-line.json
│   │       ├── common-versions.json
│   │       ├── experiments.json
│   │       ├── pnpm-config.json
│   │       ├── rush-plugins.json
│   │       └── version-policies.json
│   └── git-hooks
│       └── commit-msg.sample
└── rush.json
```

## 모노레포 패키지 구성

스크래치 블럭, React UI 패키지를 관리할 패키지 디렉토리를 만들고 각각의 프로젝트를 만듭니다.

```bash
mkdir packages
cd packages
```

/scratch-blocks

```bash
git clone git@github.com:LLK/scratch-blocks.git
```

/my-app

```bash
npx create-react-app my-app
```

프로젝트를 구성했으면 rush.json 에 패키지 설정을 추가 합니다.

```json
{
 ...
     {
      "packageName": "my-app",
      "projectFolder": "packages/my-app",
      "reviewCategory": "packages"
    },
    {
      "packageName": "scratch-blocks",
      "projectFolder": "packages/scratch-blocks",
      "reviewCategory": "packages"
    }
}
```

## scratch-blocks 모듈 추가

"scratch-blocks": "workspace:*" 를 dependencies 에 추가하고 rush update --full 명령어를 실행하여 React UI 프로젝트와 연결을 합니다.

```text
"dependencies": {
  ...
  "scratch-blocks": "workspace:*"
},
```

```bash
rush update --full
```

## Scratch3 블럭 랜더링

inject(location, options) 함수로 스크래치 블럭을 랜더링 할수 있습니다. 스크래치를 주입할 컨테이너를 만듭니다.

```html
<div id="scratch" className="scratch"></div>
```

블럭 렌더링에 필요한 옵션을 설정합니다.

- 스크래치 블럭을 랜더링 하기 위해서는 블럭 랜더링 정보를 정의 하고 있는 XML 파일이 필요합니다. [LLK/scratch-gui](https://github.com/LLK/scratch-gui) 프로젝트에서 make-toolbox-xml.js 를 가져옵니다. makeToolboxXML(true) 호출 결과를 옵션 toolbox 에 전달합니다.
- 블럭에 관련된 asset 파일을 적용하기 위해서 /scratch-blocks/media 을 /my-app/public/blocks-media 로 복사합니다.

`App.tsx`

```tsx
const workspaceConfiguration = {
  toolbox: makeToolboxXML(true),
  media: "/blocks-media/",
};
```

<a href="https://medium.com/media/ee7e9293217b7bf2403e942c26f76000/href">https://medium.com/media/ee7e9293217b7bf2403e942c26f76000/href</a>

옵션을 설정하고 inject(location, options) 를 useEffect 에서 실행합니다.

`App.tsx`

```tsx
useEffect(() => {
  ScratchBlocks.inject("scratch", {
    ...workspaceConfiguration,
  });
}, []);
```

<a href="https://medium.com/media/dbd534b7f934434e38cce99877784722/href">https://medium.com/media/dbd534b7f934434e38cce99877784722/href</a>

`App.tsx`

```tsx
import { useEffect } from "react";

import ScratchBlocks from "scratch-blocks";
import "./App.css";
import makeToolboxXML from "./make-toolbox-xml";

function App() {
  useEffect(() => {
    const workspaceConfiguration = {
      toolbox: makeToolboxXML(true),
      media: "/blocks-media/",
    };

    ScratchBlocks.inject("scratch", {
      ...workspaceConfiguration,
    });
  }, []);

  return (
      <div id="App">
        <div id="scratch" className="scratch"></div>
      </div>
  );
}

export default App;
```

<a href="https://medium.com/media/b22ca74d1fefa90365a61dd9c175431b/href">https://medium.com/media/b22ca74d1fefa90365a61dd9c175431b/href</a>

## React UI 실행

```bash
cd my-app
rushx start
```

스크래치 블럭 랜더링이 잘 되는지 확인합니다.

![](./ejK35MA5yqHGZp5D9aZUBw.png)

## Reference

- [LLK/scratch-blocks](https://github.com/LLK/scratch-blocks)
- [LLK/scratch-gui](https://github.com/LLK/scratch-gui)
- [Rush — Getting started](https://rushjs.io/pages/intro/get_started)
- [Rush로 프론트엔드 모노레포 도입기](https://medium.com/mildang/rush%EB%A1%9C-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EB%AA%A8%EB%85%B8%EB%A0%88%ED%8F%AC-%EB%8F%84%EC%9E%85%EA%B8%B0-5da0c5bc9b30)

## Github

- [songtomtom/scratch-blocks](https://github.com/songtomtom/scratch-blocks)
