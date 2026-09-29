---
title: "Apollo Router 슈퍼그래프, 어디서 합칠 것인가"
description: "스키마 레지스트리 없이 라우터 파드의 init container가 서브그래프를 합치는 방식으로 1년을 운영하고, publish CronJob과 GraphOS Uplink로 결합을 풀어낸 과정. 두 방식을 같은 base 위의 overlay 두 개로 재현합니다."
date: "2026-09-29T20:00"
repoURL: "https://github.com/songtomtom/apollo-router-supergraph-on-kubernetes"
tech: ["Apollo Router", "GraphQL Federation", "Kubernetes", "Kustomize", "rover"]
category: infra
---

여러 GraphQL 서브그래프를 Apollo Router 하나로 묶어 서빙할 때, 서브그래프 스키마를 합친 슈퍼그래프를 **누가, 언제** 만드느냐가 운영의 모양을 정합니다. 저는 처음에 스키마 레지스트리 없이 라우터 파드가 뜰 때마다 init container가 클러스터 안의 서브그래프를 직접 introspect해서 합치는 방식을 택했고, 1년을 그렇게 운영했습니다. 서브그래프가 4개에서 15개로 늘어나는 동안 이 결합이 어디서 아픈지 드러났고, publish를 CronJob으로 떼어내고 라우터는 Uplink에서 받는 구조로 하루 만에 옮겼습니다.

저장소는 두 서브그래프(products, reviews)와 라우터를 Minikube에 올리는 예제입니다.

- `overlays/init-compose`: 전환 전. init container가 rover로 compose해 emptyDir에 쓰고 라우터가 그 파일로 뜹니다.
- `overlays/uplink`: 전환 후. init container와 볼륨을 `$patch: delete`로 지우고, publish CronJob을 더하고, 라우터는 Secret의 키로 Uplink에서 받습니다.

1편은 전환 전 구조와 그것이 어디서 깨지는지를 재현한 실험, 2편은 이슈 네 개를 어떤 순서로 풀었고 왜 처음 계획(클러스터 안 ConfigMap)이 아니라 Uplink로 갔는지입니다.
