---
title: "서브그래프 목록 하나로, publish는 CronJob으로"
description: "init container 안에 두 벌로 적혀 있던 서브그래프 목록을 ConfigMap 하나로 모으고, 파드 기동에 묶여 있던 GraphOS publish를 rover 공식 이미지의 CronJob으로 떼어냈습니다. 라우터를 바꾸기 전에 이 둘을 먼저 한 이유와, 실패를 삼키던 스크립트를 Job 실패로 드러낸 방법입니다."
date: "2026-09-29T21:00"
series: apollo-router-supergraph-on-kubernetes
order: 2
category: infra
tags:
  - apollo-router
  - graphql
  - kubernetes
  - cronjob
---

[1편](/blog/apollo-router-init-container-compose)에서 init container 방식이 어디서 깨지는지 봤습니다. 고치기로 하고 이슈를 넷 만들었습니다. 매니페스트에 평문으로 있던 GraphOS 키를 Secret으로 옮기는 것, init container의 npm 설치를 없애는 것, 두 벌로 적힌 서브그래프 목록을 하나로 모으는 것, 그리고 슈퍼그래프 생성을 파드 기동에서 떼어내는 것. 이 편은 가운데 둘입니다. 라우터 자체를 바꾸는 마지막 이슈는 이 둘이 끝나야 손댈 수 있었습니다.

코드는 [songtomtom/apollo-router-supergraph-on-kubernetes](https://github.com/songtomtom/apollo-router-supergraph-on-kubernetes)입니다. 1편에서 본 `k8s/base/router/subgraphs-configmap.yaml`이 이 편의 결과물이고, `k8s/overlays/uplink/cronjob-publish.yaml`이 새로 더해지는 것입니다.

## 목록이 두 벌이었다

실제 운영에서 처음 init 스크립트는 이런 모양이었습니다. 서브그래프마다 publish 블록이 7줄씩 반복되고, 그 아래 compose용 `supergraph.yaml`을 heredoc으로 한 번 더 적었습니다.

```sh
echo "Publishing auth subgraph..."
rover subgraph introspect http://auth-service.$NS.svc.cluster.local/graphql | \
  rover subgraph publish ${APOLLO_GRAPH_REF} \
    --name auth \
    --routing-url http://auth-service.$NS.svc.cluster.local/graphql \
    --schema - \
    --convert || echo "Warning: Failed to publish auth subgraph"
# ... 서브그래프 수만큼 반복 ...

cat > /shared/supergraph.yaml << EOF
federation_version: 2
subgraphs:
  auth:
    routing_url: http://auth-service.$NS.svc.cluster.local/graphql
    schema:
      subgraph_url: http://auth-service.$NS.svc.cluster.local/graphql
  # ... 같은 목록을 한 번 더 ...
EOF
```

거기에 dev와 prod가 네임스페이스만 다른 같은 스크립트를 overlay마다 통째로 갖고 있었습니다. 서브그래프를 하나 추가하려면 파일 두 개에서 네 군데를 같은 모양으로 고쳐야 했습니다.

어긋난 날이 왔습니다. 새 서비스 8개를 붙이면서 publish 블록은 추가했는데 compose 목록에는 빠뜨렸습니다. publish는 다 성공했고 GraphOS에는 스키마가 올라갔는데, 라우터가 쓰는 슈퍼그래프에는 8개가 없었습니다. 라우터는 정상적으로 떴고 기존 쿼리는 다 됐으니 눈치채기까지 시간이 걸렸습니다.

### ConfigMap 하나로

목록을 ConfigMap으로 빼고, `rover supergraph compose`가 읽는 `supergraph.yaml` 형식을 그대로 썼습니다. publish도 이 파일을 파싱해서 순회합니다. 목록이 한 곳이면 어긋날 방법이 없습니다.

`k8s/base/router/subgraphs-configmap.yaml`

```yaml
data:
  supergraph.yaml: |
    federation_version: =2.15.1
    subgraphs:
      products:
        routing_url: http://products.${POD_NAMESPACE}.svc.cluster.local/
        schema:
          subgraph_url: http://products.${POD_NAMESPACE}.svc.cluster.local/
      reviews:
        routing_url: http://reviews.${POD_NAMESPACE}.svc.cluster.local/
        schema:
          subgraph_url: http://reviews.${POD_NAMESPACE}.svc.cluster.local/
```

순회는 awk 한 줄입니다. 들여쓰기 2칸의 키를 이름으로, 그 아래 `routing_url`을 주소로 뽑습니다.

```sh
sed "s/\${POD_NAMESPACE}/${POD_NAMESPACE}/g" /etc/subgraphs/supergraph.yaml > /tmp/supergraph.yaml
awk '/^  [a-z0-9-]+:$/ { name=$1; sub(/:$/, "", name) } /^    routing_url:/ { print name, $2 }' \
  /tmp/supergraph.yaml > /tmp/subgraphs.list
while read -r name url; do
  rover subgraph introspect "${url}" < /dev/null | \
    rover subgraph publish "${APOLLO_GRAPH_REF}" --name "${name}" --routing-url "${url}" --schema - --convert
done < /tmp/subgraphs.list
```

yq를 쓰면 더 안전하지만 컨테이너에 yq를 넣어야 합니다. 목록의 형식을 제가 통제하고 있으니 awk로 충분하다고 봤습니다. `${POD_NAMESPACE}`는 downward API로 받아 `sed`로 치환합니다. 이걸로 dev와 prod가 같은 ConfigMap을 쓰고, overlay 차이는 네임스페이스뿐이 됩니다.

실제 운영에서 이 변경을 머지하기 전에 한 검증은 렌더링된 Deployment에서 init 스크립트를 꺼내 가짜 `rover`(인자를 기록만 하는 셸 함수)로 돌려서, publish에 넘어가는 name·URL·순서와 compose용 `supergraph.yaml`이 실행 중인 파드의 것과 같은지 비교한 것이었습니다. 목록을 옮기는 리팩터링이라 결과가 바이트 단위로 같아야 했습니다.

## publish를 파드 밖으로

목록을 모으고 나니 publish를 떼어낼 수 있었습니다. 떼어내는 이유는 셋입니다.

- **라우터를 Uplink 방식으로 바꾸면 init container가 없어집니다.** 그 안에 있던 publish를 맡을 곳이 먼저 있어야 합니다.
- **publish 실패가 보이지 않았습니다.** `|| echo "Warning"`으로 삼키고 있어서, 어느 서브그래프가 GraphOS에 안 올라갔는지는 init 로그를 뒤져야 알 수 있었습니다.
- **npm 설치와 root.** `node:18`에서 `npm install -g @apollo/rover`를 하느라 init이 root로 돌았고, 설치되는 rover는 npm 패키지가 늦어서 최신이 아니었습니다.

`k8s/overlays/uplink/cronjob-publish.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: apollo-router-publish
spec:
  schedule: "*/10 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 0
      activeDeadlineSeconds: 300
      template:
        spec:
          restartPolicy: Never
          securityContext:
            runAsNonRoot: true
            runAsUser: 10001
            runAsGroup: 10001
          containers:
          - name: publish
            # rover가 들어 있는 공식 이미지. npm 설치도, root도 필요 없다.
            image: ghcr.io/apollographql/rover
            command:
            - sh
            - -c
            - |
              set -e
              sed "s/\${POD_NAMESPACE}/${POD_NAMESPACE}/g" /etc/subgraphs/supergraph.yaml > /tmp/supergraph.yaml
              awk '/^  [a-z0-9-]+:$/ { name=$1; sub(/:$/, "", name) } /^    routing_url:/ { print name, $2 }' \
                /tmp/supergraph.yaml > /tmp/subgraphs.list
              failed=0
              while read -r name url; do
                echo "Publishing ${name}..."
                rover subgraph introspect "${url}" < /dev/null | \
                  rover subgraph publish "${APOLLO_GRAPH_REF}" --name "${name}" --routing-url "${url}" \
                    --schema - --convert || { echo "Warning: Failed to publish ${name}"; failed=1; }
              done < /tmp/subgraphs.list
              # 하나라도 실패하면 Job이 실패로 남아 눈에 띈다. 다음 주기에 다시 시도한다.
              exit ${failed}
            env:
            - name: POD_NAMESPACE
              valueFrom: {fieldRef: {fieldPath: metadata.namespace}}
            - name: APOLLO_ELV2_LICENSE
              value: accept
            - name: APOLLO_CONFIG_HOME
              value: /tmp/.apollo
            - name: APOLLO_KEY
              valueFrom: {secretKeyRef: {name: apollo-router-studio, key: APOLLO_KEY}}
            - name: APOLLO_GRAPH_REF
              valueFrom: {secretKeyRef: {name: apollo-router-studio, key: APOLLO_GRAPH_REF}}
            securityContext:
              allowPrivilegeEscalation: false
              readOnlyRootFilesystem: true
              capabilities: {drop: [ALL]}
```

몇 가지 선택의 이유입니다.

**공식 이미지, 태그는 kustomize에서.** `ghcr.io/apollographql/rover`에는 rover 바이너리만 들어 있고 non-root로 돕니다. 버전은 overlay의 `images` 항목에서 `0.41.0`으로 고정합니다. 이걸로 "파드가 뜰 때 npm이 뭘 설치하느냐"가 사라졌습니다. 읽기 전용 루트 파일시스템에서 rover가 설정을 쓸 곳이 필요해서 `APOLLO_CONFIG_HOME`을 `/tmp`로 줍니다. 이걸 빼면 rover가 홈 디렉터리에 쓰려다 죽습니다.

**실패는 exit code로.** 서브그래프 하나가 실패해도 나머지는 계속 publish하되, 끝에서 `failed`를 exit code로 냅니다. `backoffLimit: 0`이라 재시도 없이 Job이 Failed로 남고 `kubectl get job`과 ArgoCD 화면에 보입니다. 10분 뒤 다음 실행이 다시 시도하므로 일시적 실패는 알아서 회복됩니다. 예제에서 잘못된 키로 돌려 봤습니다.

```
NAME                STATUS   COMPLETIONS   DURATION   AGE
publish-fail-test   Failed   0/1           81s        81s
```

```
Publishing products...
error[E004]: HTTP status client error (401 Unauthorized) for url (https://api.apollographql.com/graphql)
Warning: Failed to publish products
Publishing reviews...
error[E004]: HTTP status client error (401 Unauthorized) for url (https://api.apollographql.com/graphql)
Warning: Failed to publish reviews
```

두 서브그래프 다 시도했고, 둘 다 실패했고, Job이 Failed입니다. init 시절에는 이 두 줄의 Warning이 수백 줄 npm 출력 사이에 묻혔고 파드는 Ready가 됐습니다.

**10분 주기.** 서브그래프를 배포하면 GraphOS 반영까지 최대 10분입니다. 서브그래프 CI에서 publish하면 즉시지만, CI를 서비스마다 손대지 않기 위해 이 방식을 택했습니다. 지금 방식의 "클러스터 안에서 완결"이라는 장점을 지키는 절충입니다.

**`concurrencyPolicy: Forbid`.** 이전 실행이 안 끝났으면 건너뜁니다. 같은 스키마를 두 Job이 동시에 publish해 봐야 좋을 게 없습니다.

## 라우터를 바꾸기 전에 이걸 먼저 한 이유

이 CronJob은 init container가 아직 있는 상태에서 먼저 배포했습니다. 그러면 한동안 publish가 이중으로 돕니다. init이 파드 기동 때 한 번, CronJob이 10분마다 한 번. 스키마가 같으면 GraphOS가 `NOT updated with a new schema`로 답하고 끝이라 부작용이 없습니다. 실제 운영에서 서브그래프 15개를 publish하는 CronJob 한 번이 32~34초였고, 매 실행이 전부 `NOT updated`였습니다.

이 순서가 중요한 이유는 다음 편에서 라우터를 바꿀 때 publish 경로가 이미 검증돼 있어야 하기 때문입니다. 라우터 전환과 publish 이전을 한 PR에서 하면 뭔가 잘못됐을 때 어느 쪽이 원인인지 알 수 없습니다.

## 정리

| | 전 | 후 |
|---|---|---|
| 서브그래프 목록 | 스크립트 안 두 곳, overlay마다 복제 | ConfigMap 하나, 네임스페이스는 downward API |
| publish 실행 주체 | 라우터 파드 init container | CronJob 10분 주기 |
| rover | node:18에서 npm 설치, root | 공식 이미지, 태그 고정, non-root, 읽기 전용 FS |
| 실패 | `\|\| echo`로 삼킴 | Job Failed로 노출, 다음 주기 재시도 |

여기까지 하고도 라우터는 아직 init container로 슈퍼그래프를 만듭니다. 1편의 두 문제는 그대로입니다. 그걸 푸는 것이 [3편](/blog/apollo-router-uplink-configmap-limit)인데, 처음 세운 계획대로 되지 않았습니다.

## Reference

- [Rover: subgraph publish](https://www.apollographql.com/docs/rover/commands/subgraphs#subgraph-publish)
- [Kubernetes: CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes: Downward API](https://kubernetes.io/docs/concepts/workloads/pods/downward-api/)
- [Kustomize: images transformer](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/images/)
