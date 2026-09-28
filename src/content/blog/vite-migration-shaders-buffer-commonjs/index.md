---
title: "셰이더, Buffer, CommonJS: Vite로 옮기며 걸린 것들"
description: "설정을 합치고 나서 남은 네 가지를 정리합니다. raw-loader 대신 ?raw로 셰이더를 읽으면서 소스맵 경고를 없애고, Buffer 폴리필 30KB를 btoa로 대체하고, CommonJS 전용 의존성이 세 포맷과 dev 서버에서 어떻게 처리되는지 보고, Vite 8의 Rolldown minifier에서 console을 제거하는 방법을 찾았습니다."
date: "2026-09-28T23:05"
project: webpack-to-vite-library
order: 2
category: frontend
tags:
  - vite
  - rolldown
  - webgl
  - commonjs
---

[1편](/blog/webpack-to-vite-library-mode)에서 webpack 설정 세 개를 Vite 라이브러리 모드 하나로 합쳤습니다. 빌드는 됐고 스모크 테스트도 통과했지만 마무리라고 부르기엔 걸리는 게 넷 있었습니다. 빌드 로그에 찍히는 소스맵 경고, 3.7KB였던 Node 번들이 30KB가 된 것, 아직 넣지 않은 CommonJS 전용 의존성, 그리고 webpack 시절 TerserPlugin이 하던 `console` 제거가 빠진 것. 하나씩 처리한 기록입니다. 커밋은 [저장소](https://github.com/songtomtom/webpack-to-vite-library)에 항목 순서대로 남아 있습니다.

## 셰이더: 플러그인 대신 ?raw

webpack에서는 `raw-loader`가 `.vert`, `.frag` 파일을 문자열로 바꿔 줬습니다. 1편에서는 같은 자리에 `vite-raw-plugin`을 넣어 import 문을 하나도 고치지 않고 넘어갔습니다. 그런데 빌드할 때마다 포맷당 두 줄씩 경고가 찍혔습니다.

```
[plugin vite-raw-plugin] [SOURCEMAP_BROKEN] Sourcemap is likely to be incorrect:
a plugin (vite-raw-plugin) was used to transform files, but didn't generate a sourcemap for the transformation.
```

플러그인이 `transform` 훅에서 코드만 돌려주고 `map`을 안 돌려줘서 생기는 경고입니다. 셰이더 문자열에 소스맵이 무슨 의미가 있나 싶지만 Rolldown은 변환이 있었는데 맵이 없으면 무조건 경고합니다.

Vite에는 이 용도의 기능이 내장돼 있습니다. import 경로 끝에 `?raw`를 붙이면 파일 내용을 문자열로 가져옵니다. 플러그인을 지우고 import 두 줄을 고쳤습니다.

`src/SpriteRenderer.js`

```js
import vertexShader from './shaders/sprite.vert?raw';
import fragmentShader from './shaders/sprite.frag?raw';
```

경고는 사라졌고 설정에서 `plugins` 배열이 통째로 없어졌습니다. 트레이드오프는 import 문에 번들러 문법이 들어간다는 것입니다. 셰이더 파일이 수십 개면 경로를 다 고쳐야 하고, 그래서 처음엔 플러그인이 편해 보였습니다. 하지만 `raw-loader`를 쓰던 시절에도 webpack 설정이라는 다른 자리에 같은 정보가 있었을 뿐입니다. 파일 두 개면 import 쪽에 두는 게 낫다고 판단했습니다.

## Buffer: 폴리필을 없애는 쪽으로

1편 끝의 표에서 Node용 CommonJS 번들이 webpack 3.7KB에서 Vite 30KB로 커졌습니다. 이유는 스냅샷 유틸이 쓰던 `Buffer`입니다. webpack의 node 타깃은 `Buffer`를 Node 전역으로 남겨 두지만, Vite는 세 포맷을 같은 소스에서 뽑기 때문에 `import {Buffer} from 'buffer'`를 npm 폴리필로 해석해 셋 다에 넣습니다.

선택지는 둘이었습니다. `buffer`를 external로 빼서 소비자가 해결하게 하거나, `Buffer`를 안 쓰거나. external로 빼면 브라우저 소비자는 `buffer` 패키지를 직접 설치해야 하고 UMD 사용자는 전역을 만들어 줘야 합니다. 라이브러리가 하는 일이 base64 인코딩뿐인데 그 부담을 지우는 건 과했습니다.

`btoa`와 `atob`는 브라우저와 Node 16 이상 양쪽에 있습니다. 바이트 배열을 바이너리 문자열로 바꿔 넘기면 됩니다.

`src/util/snapshot.js`

```js
const CHUNK = 0x8000;

export const encodeSnapshot = pixels => {
    const bytes = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels);
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
};

export const decodeSnapshot = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
```

`String.fromCharCode(...bytes)`를 한 번에 하면 안 됩니다. 스냅샷은 캔버스 픽셀 전체라 수십만 바이트이고, 스프레드 인자가 그만큼 들어가면 호출 스택 한도에 걸립니다. 32K씩 잘라 이어 붙였습니다. `Uint8Array.prototype.toBase64`가 표준화되고 있지만 이 글을 쓰는 시점의 Node 24에는 아직 없어서 쓰지 않았습니다.

`buffer` 의존성을 지우고 다시 빌드한 결과입니다.

| 결과물 | Buffer 폴리필 포함 | btoa/atob |
|---|---|---|
| ES | 38.7 KB | 3.5 KB |
| CommonJS | 30.2 KB | 3.4 KB |
| UMD | 30.4 KB | 3.5 KB |

라이브러리 코드는 처음부터 3KB대였고 나머지는 전부 폴리필이었습니다. 1편에서 "Vite로 옮기니 번들이 작아졌다"고 쓸 뻔했는데, 실제로는 twgl을 external로 뺀 만큼 줄고 Buffer 폴리필만큼 늘어난 것을 합친 숫자였습니다. 무엇이 번들에 들어갔는지 보지 않고 크기만 비교하면 이런 식으로 잘못 읽습니다.

## CommonJS 의존성: 걱정보다 조용했다

webpack 시절 설정에 `commonjsOptions`나 `optimizeDeps` 같은 항목이 있었던 기억이 있어서, CommonJS로만 배포되는 의존성이 들어오면 뭔가 손을 봐야 할 거라고 예상했습니다. 실제로 넣어 봤습니다. 볼록 껍질을 구하는 `hull.js`는 `module.exports = hull` 하나뿐인 CommonJS 패키지입니다.

`src/SpriteRenderer.js`

```js
import hull from 'hull.js';
```

```js
    /**
     * 모든 스프라이트 꼭짓점을 감싸는 볼록 껍질. 드래그 선택 영역 같은 데 쓴다.
     * hull.js는 CommonJS로만 배포되는 패키지다.
     */
    getHull () {
        const points = [];
        for (const s of this._sprites) {
            const half = s.size / 2;
            points.push([s.x - half, s.y - half], [s.x + half, s.y - half],
                [s.x - half, s.y + half], [s.x + half, s.y + half]);
        }
        return hull(points, Infinity);
    }
```

세 경로를 각각 확인했습니다.

**번들에 포함시킬 때.** `external`에 넣지 않고 빌드하면 Rolldown이 `module.exports`를 ESM으로 바꿔 세 포맷 모두에 인라인합니다. 출력에 `require(`가 남지 않고, ES 번들을 Node에서 `import`해도 정상입니다. 별도 설정이 없었습니다.

**external로 뺄 때.** ES 번들에는 `import t from "hull.js"`가, CommonJS 번들에는 `require("hull.js")`가 남습니다. 소비자 쪽에서 ES 문법으로 CommonJS 패키지를 default import하는 셈인데, Node와 번들러 모두 `module.exports`를 default로 감싸 주므로 동작합니다. UMD는 `globals`에 `'hull.js': 'hull'`을 추가해야 전역에서 찾습니다. 저는 twgl과 같은 이유로 external을 택했습니다.

**dev 서버에서.** `vite --mode playground`로 띄우면 첫 요청 때 `node_modules/.vite/deps/` 아래에 `hull__js.js`와 `twgl__js.js`가 생깁니다. dev 서버는 소스를 번들하지 않고 ESM 그대로 브라우저에 보내는데 브라우저는 `require`를 모르니, 의존성만 미리 esbuild로 ESM으로 바꿔 두는 것입니다. 이것도 자동입니다.

결국 설정에 손댈 게 없었습니다. `commonjsOptions`가 필요한 경우는 한 파일 안에 `import`와 `require`가 섞인 패키지를 번들에 포함할 때이고, `optimizeDeps.include`가 필요한 경우는 dev 서버가 스캔에서 놓치는 동적 import 뒤의 의존성이 있을 때입니다. 둘 다 이 라이브러리에는 없었습니다. 예전 설정에 있던 항목이라고 옮겨 적을 필요는 없습니다.

한 가지 부수적으로 나온 게 있습니다. 빌드할 때마다 이런 안내가 찍혔습니다.

```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`:
  - ESM syntax in a file loaded as CommonJS (vite.config.js:1:1).
    Use a `.mjs` extension or set `"type": "module"` in the closest package.json
```

1편에서 `"type": "module"`을 일부러 넣지 않았기 때문에 `.js` 설정 파일은 CommonJS로 취급되고, Vite가 내부적으로 변환해서 읽고 있었던 것입니다. 설정 파일 이름을 `vite.config.mjs`로 바꿨습니다.

## console 제거: esbuild 키는 조용히 무시된다

webpack 설정의 TerserPlugin에는 `drop_console: true`가 있었습니다. 릴리스 번들에서 디버그 로그를 걷어내는 용도입니다. Vite에서 같은 일을 하려고 처음 떠올린 건 `esbuild: {drop: ['console', 'debugger']}`였습니다. Vite 5, 6 시절 문서와 블로그에 그렇게 나옵니다.

넣고 빌드했더니 경고도 없이 `console.debug`가 그대로 남았습니다. Vite 8은 minifier가 esbuild에서 Rolldown 내장(oxc)으로 바뀌었고, `esbuild` 키는 deprecated 상태로 남아 있지만 minify 단계에는 관여하지 않습니다. 옵션 이름이 틀린 게 아니라 옵션을 읽는 주체가 바뀐 것이라 에러가 나지 않습니다.

Rolldown의 minify 옵션은 `output.minify`에 객체로 줍니다.

`vite.config.mjs`

```js
            rollupOptions: {
                // 의존성은 번들에 넣지 않는다. 소비자의 번들러가 해결한다.
                external: ['twgl.js', 'hull.js'],
                output: {
                    // UMD는 전역 변수로 의존성을 찾는다
                    globals: {'twgl.js': 'twgl', 'hull.js': 'hull'},
                    // webpack의 TerserPlugin drop_console 자리. Vite 8은 esbuild 대신 Rolldown(oxc) minifier를 쓴다.
                    ...(mode === 'production' && {
                        minify: {compress: {dropConsole: true, dropDebugger: true}, mangle: true, codegen: true}
                    })
                }
            },
            // 소스맵은 개발 빌드에만. 배포 파일 옆에 소스가 통째로 붙는 걸 막는다.
            sourcemap: mode !== 'production'
```

`vite build`의 기본 모드가 `production`이라 평소 빌드에서 적용되고, `vite build --mode development`로 돌리면 `console.debug`와 소스맵이 남습니다. 두 모드로 각각 빌드해서 `grep console.debug` 횟수가 0과 1인 것을 확인했습니다.

`minify`를 객체로 직접 주면서 알게 된 것이 하나 더 있습니다. Vite는 라이브러리 모드의 ES 포맷에 한해 `codegen: false`로 minify합니다. 압축과 이름 축약은 하되 공백과 줄바꿈은 유지한다는 뜻입니다. 1편 표에서 ES 번들이 CommonJS보다 늘 8KB쯤 컸던 이유가 이것입니다. ES 번들은 소비자의 번들러가 다시 minify하므로 읽기 쉬운 상태로 두는 게 기본값입니다. 제가 `codegen: true`로 덮어써서 지금은 셋 다 압축되는데, 라이브러리 소비자가 디버깅할 때를 생각하면 기본값을 존중하는 편이 맞을 수도 있습니다.

## 정리

| 걸린 것 | webpack에서 | Vite에서 |
|---|---|---|
| 셰이더 문자열 import | `raw-loader` 규칙 | import 경로에 `?raw` |
| Node 전역 `Buffer` | `resolve.fallback`으로 폴리필 | 쓰지 않는다. `btoa`/`atob` |
| CommonJS 전용 의존성 | 별도 처리 없음 | 별도 처리 없음. dev 서버는 prebundle |
| `console` 제거 | TerserPlugin `drop_console` | `output.minify.compress.dropConsole` |
| 소스맵 | `devtool` | `build.sourcemap`을 모드로 분기 |

네 가지 중 셋은 Vite 설정을 늘리는 게 아니라 줄이는 쪽으로 끝났습니다. 플러그인을 지웠고, 폴리필을 지웠고, CommonJS 처리는 애초에 필요 없었습니다. webpack 설정을 옮길 때 "이 항목은 Vite에서 뭐지"를 하나씩 찾는 대신, "이 항목이 왜 있었지"를 먼저 물었어야 했습니다.

## Reference

- [Vite: Importing Asset as String (?raw)](https://vite.dev/guide/assets.html#importing-asset-as-string)
- [Vite: Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling.html)
- [Vite 8 Migration: Rolldown](https://vite.dev/guide/migration.html)
- [Rolldown: output.minify](https://rolldown.rs/reference/config-options#output-minify)
- [MDN: WindowOrWorkerGlobalScope.btoa()](https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa)
