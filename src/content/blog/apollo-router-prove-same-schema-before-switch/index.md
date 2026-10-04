---
title: "바꾸기 전에 같은지 증명하기"
description: "라우터가 슈퍼그래프를 받는 경로를 바꾸면서 서빙 스키마가 한 필드도 달라지지 않았음을 어떻게 확인했는지. 임시 라우터를 새 방식으로 띄워 introspection을 정규화해 diff하고, 비교 전에 GraphOS의 휴면 서브그래프를 정리하고, 롤아웃 규칙에서 안전성을 계산하고, 못 해 본 것을 못 해 봤다고 적은 과정입니다."
date: "2026-09-29T23:00"
series: apollo-router-supergraph-on-kubernetes
order: 4
category: infra
tags:
  - apollo-router
  - graphql
  - kubernetes
  - testing
---

[3편](/blog/apollo-router-uplink-configmap-limit)의 전환은 매니페스트로 보면 init container를 지우고 인자 하나를 빼는 것입니다. 하지만 라우터가 서빙하는 스키마의 출처가 "방금 클러스터에서 합친 것"에서 "GraphOS가 합쳐 둔 것"으로 바뀝니다. 둘이 같다는 보장은 어디에도 없습니다. GraphOS에는 1년 동안 publish된 것이 쌓여 있고, 그중엔 지금 라우터 목록에 없는 서브그래프도 있을 수 있습니다. 프로덕션 라우터를 바꾸기 전에 "바꿔도 같은 스키마"를 확인해야 했습니다.

이 편은 그 확인을 어떻게 했는지입니다. 예제의 `scripts/schema-diff.sh`가 그 도구이고, 나머지는 실제 운영에서 한 순서입니다.

## 1. 비교 대상을 먼저 맞춘다

GraphOS의 그래프에 어떤 서브그래프가 등록돼 있는지 먼저 봤습니다. 라우터 목록은 15개인데 GraphOS에는 18개가 있었습니다. 예전에 있다가 없어진 서비스 둘과, 휴면 처리하면서 목록에서 뺐지만 GraphOS에서는 지우지 않은 것 하나. 이 상태로 Uplink를 켜면 라우터는 18개짜리 슈퍼그래프를 받고, 없는 서비스로 라우팅되는 필드가 스키마에 생깁니다.

그래서 전환 전에 GraphOS에서 셋을 지웠습니다. 이건 되돌릴 수 있는 작업입니다. 다시 필요하면 publish하면 됩니다. 지운 뒤 GraphOS의 서브그래프 수와 라우터 ConfigMap의 목록이 같아졌고, 그때부터 비교가 의미 있어집니다.

여기서 하나 배운 것. init 방식의 "떠 있는 것이 곧 진실"은 이 정리를 강제하지 않았습니다. GraphOS에 뭐가 쌓여 있든 라우터는 자기 목록만 합쳤으니까요. Uplink로 가면 GraphOS의 상태가 곧 서빙 스키마가 되므로, GraphOS를 관리 대상으로 보기 시작해야 합니다.

## 2. 임시 라우터를 새 방식으로 띄운다

기존 라우터는 건드리지 않고, 같은 이미지와 같은 `router.yaml`로 Deployment를 하나 더 만들었습니다. 차이는 init container가 없고 `--supergraph` 대신 Uplink 키를 받는 것, 즉 3편 overlay의 라우터 그대로입니다. Service는 만들지 않고 파드에 port-forward로만 접근했습니다.

이 임시 라우터와 기존 라우터에 같은 introspection 쿼리를 보내 비교합니다.

## 3. introspection을 정규화해 diff한다

introspection 응답을 그대로 diff하면 안 됩니다. 타입 순서, 필드 순서가 서빙 경로에 따라 다를 수 있어서 의미 없는 차이가 잔뜩 나옵니다. 타입은 이름순으로, 각 타입의 필드·입력 필드·enum 값도 이름순으로 정렬해 한 줄에 하나씩 뽑고, 필드 타입은 `NON_NULL`/`LIST`/`ofType` 구조를 JSON으로 직렬화해 붙였습니다.

`scripts/schema-diff.sh`

```sh
dump() {
  kubectl --context "$CTX" -n "$NS" port-forward "$1" 4300:4000 >/dev/null 2>&1 &
  PF=$!; sleep 2
  curl -s localhost:4300/ -H 'content-type: application/json' \
    -d '{"query":"{ __schema { types { name kind fields { name type { name kind ofType { name kind } } } inputFields { name } enumValues { name } } } }"}' \
    | python3 -c "
import json,sys
t=json.load(sys.stdin)['data']['__schema']['types']
for ty in sorted(t,key=lambda x:x['name']):
    if ty['name'].startswith('__'): continue
    print(ty['kind'], ty['name'])
    for f in sorted(ty.get('fields') or [],key=lambda x:x['name']): print('  field', f['name'], json.dumps(f['type'],sort_keys=True))
    for f in sorted(ty.get('inputFields') or [],key=lambda x:x['name']): print('  input', f['name'])
    for e in sorted(ty.get('enumValues') or [],key=lambda x:x['name']): print('  enum', e['name'])
"
  kill $PF; wait $PF 2>/dev/null || true
}
dump "$A" > /tmp/schema-a.txt
dump "$B" > /tmp/schema-b.txt
if diff -u /tmp/schema-a.txt /tmp/schema-b.txt; then echo "IDENTICAL"; else echo "DIFFERENT"; exit 1; fi
```

정규화된 출력은 이런 모양입니다.

```
OBJECT Product
  field averageRating {"kind": "SCALAR", "name": "Float", "ofType": null}
  field id {"kind": "NON_NULL", "name": null, "ofType": {"kind": "SCALAR", "name": "ID"}}
  field name {"kind": "NON_NULL", "name": null, "ofType": {"kind": "SCALAR", "name": "String"}}
  field price {"kind": "NON_NULL", "name": null, "ofType": {"kind": "SCALAR", "name": "Int"}}
  field reviews {"kind": "NON_NULL", "name": null, "ofType": {"kind": "LIST", "name": null}}
```

예제에서 init 방식의 파드 두 개를 비교하면 이렇습니다.

```
pod/apollo-router-5f98b4b47f-72zgb: 8 types, 11 fields
pod/apollo-router-5f98b4b47f-zfhm8: 8 types, 11 fields
IDENTICAL
```

같은 스크립트를 실제 운영의 임시 라우터(Uplink)와 기존 라우터(init compose) 사이에 돌렸을 때 결과는 타입 3,109개, 필드·입력 필드·enum 값·query/mutation 루트 전부 일치였습니다. dev는 3,314개였고 역시 일치. 이 숫자를 보고 나서야 prod 라우터의 PR을 올렸습니다.

1편의 실험 2를 떠올리면 이 도구의 쓰임이 하나 더 보입니다. 같은 Deployment의 파드 둘을 비교해서 `DIFFERENT`가 나오면, 파드마다 다른 스키마를 서빙하고 있다는 뜻입니다. init 방식에서 이 검사를 주기적으로 돌렸다면 그 문제를 훨씬 일찍 알았을 것입니다.

## 4. 매니페스트 변경도 diff한다

스키마와 별개로, kustomize 렌더링 결과를 변경 전후로 diff해서 Deployment 외에 바뀐 리소스가 없는지, dev overlay를 고칠 때 prod 렌더링이 그대로인지 확인했습니다. 그리고 `kubectl apply --dry-run=server`로 API 서버가 받아 주는지도 봤습니다. 예제에서도 같은 것을 했습니다.

```
deployment.apps/apollo-router configured (server dry run)
cronjob.batch/apollo-router-publish created (server dry run)
```

Secret이 아직 없어도 dry-run은 통과합니다. `secretKeyRef`의 존재 여부는 파드가 만들어질 때 검사되기 때문입니다. 이건 dry-run이 잡아 주지 않는 것이 무엇인지 알고 있어야 한다는 뜻이기도 합니다.

## 5. 롤아웃 안전성은 규칙에서 계산한다

새 파드가 못 뜨면 어떻게 되나. 장애 시험을 prod에서 할 수는 없어서 Deployment 규칙에서 도출했습니다. 전략은 `RollingUpdate`, maxSurge 25%, maxUnavailable 25%, replicas 3. maxSurge는 올림이라 1, maxUnavailable은 내림이라 0. 즉 새 파드 1개를 먼저 띄우고 Ready가 된 뒤에야 기존 파드를 하나 내립니다. 새 파드가 Ready가 안 되면 롤아웃이 멈추고 기존 3개가 그대로 서빙합니다.

3편에서 예제에 잘못된 키를 넣어 본 것이 이 계산의 확인이었습니다. 새 파드는 `CrashLoopBackOff`, 기존 파드 둘은 `Running`, 롤아웃은 timeout. PR에는 "규칙에서 도출, 장애 시험은 안 함"이라고 적었습니다.

## 6. 못 해 본 것을 적는다

PR 본문에 "미검증" 항목을 따로 두었습니다.

- 이미 뜬 파드가 Uplink 장애 중에도 서빙을 유지하는지
- 서브그래프를 내린 상태에서 새 라우터 파드가 뜨는지

둘 다 공유 환경의 서비스를 내려야 시험할 수 있어서 하지 않았습니다. 해 본 것과 안 해 본 것이 같은 문서에 있으면, 나중에 문제가 생겼을 때 "그때 확인했는데"와 "그건 확인 안 했다"를 구분할 수 있습니다.

## 정리

전환 PR을 머지하기 전에 있던 것들입니다.

| 확인 | 방법 | 결과 |
|---|---|---|
| GraphOS와 라우터 목록 일치 | 휴면·삭제 서브그래프 정리 | 18개 → 15개 |
| 서빙 스키마 동일 | 임시 라우터 + 정규화 introspection diff | 3,109 타입 일치 |
| 매니페스트 변경 범위 | 렌더링 diff, 서버 측 dry-run | Deployment만 |
| 롤아웃 중 가용성 | maxSurge/maxUnavailable 계산 | 기존 파드 유지 |
| 미검증 | 명시 | 2건 |

이 시리즈에서 코드 변경은 사실 작습니다. init container를 지우고 CronJob을 더한 것이 전부입니다. 시간이 든 곳은 "바꿔도 같다"를 만드는 쪽이었고, 그게 없었으면 1년 전처럼 일단 돌아가는 구조를 하나 더 만들었을 것입니다.

## Reference

- [GraphQL: Introspection](https://graphql.org/learn/introspection/)
- [Kubernetes: Deployment rolling update (maxSurge, maxUnavailable)](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)
- [kubectl apply --dry-run=server](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Rover: subgraph delete](https://www.apollographql.com/docs/rover/commands/subgraphs#subgraph-delete)
