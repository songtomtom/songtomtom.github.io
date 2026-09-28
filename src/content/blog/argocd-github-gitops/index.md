---
title: "GitHub를 활용한 GitOps 구현하기"
description: "소스 저장소와 매니페스트 저장소를 분리하고 GitHub Actions가 이미지를 빌드해 매니페스트를 갱신하면 Argo CD가 자동 배포하는 파이프라인을 만듭니다. 저장소를 나누는 이유와 자동 동기화 옵션, 이 구성의 한계를 정리합니다."
date: "2025-01-18"
project: argocd-gitops
order: 2
canonical: "https://medium.com/@songtomtom/github%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-gitops-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0-56006f0ce88c"
category: infra
tags:
  - argocd
  - github-actions
  - gitops
  - kubernetes
---

1편에서 Argo CD를 설치하고 예제 앱을 수동으로 동기화했습니다. 이번 편은 내 코드로 그 흐름을 완성합니다. 소스 코드를 푸시하면 이미지가 빌드되고, 매니페스트가 갱신되고, Argo CD가 배포하는 것까지 사람 손이 안 가게 만듭니다.

## 전체 흐름

```mermaid
sequenceDiagram
  participant Dev as 개발자
  participant CI as GitHub Actions
  participant Man as 매니페스트 저장소
  participant Argo as Argo CD
  participant K8s as 클러스터

  Dev->>CI: 소스 push
  CI->>CI: 이미지 빌드 · Docker Hub push
  CI->>Man: 이미지 태그 갱신 커밋
  Argo->>Man: 주기적 pull
  Argo->>K8s: 변경분 apply
```

## 왜 저장소를 두 개로 나누는가

소스와 매니페스트를 한 저장소에 둘 수도 있습니다. 그런데 나누는 이유가 몇 가지 있습니다.

- **CI가 무한 루프에 빠집니다.** CI가 매니페스트를 갱신해 같은 저장소에 커밋하면 그 커밋이 다시 CI를 트리거합니다. 경로 필터로 막을 수 있지만 구성이 복잡해집니다.
- **권한이 다릅니다.** 소스 저장소는 개발자 모두가 푸시하지만, 매니페스트 저장소는 배포 권한이 있는 사람과 CI만 써야 합니다. 운영 환경 설정을 실수로 바꾸는 것을 저장소 권한으로 막을 수 있습니다.
- **이력이 깨끗합니다.** 매니페스트 저장소의 git log가 곧 배포 이력이 됩니다. 소스 커밋과 섞이지 않으니 "언제 무엇이 배포됐나"를 바로 읽을 수 있습니다.
- **여러 앱을 모을 수 있습니다.** 서비스가 늘어나면 매니페스트 저장소 하나에 여러 앱의 환경별 설정을 모아 두는 편이 Argo CD에서 관리하기 쉽습니다.

그래서 두 개를 만듭니다.

- [argocd-app-source](https://github.com/songtomtom/argocd-app-source): 애플리케이션 코드, Dockerfile, CI 워크플로
- [argocd-app-manifests](https://github.com/songtomtom/argocd-app-manifests): Deployment와 Argo CD Application

## 애플리케이션

배포 대상은 최소한의 Flask 서버입니다. 실습의 관심사는 앱이 아니라 파이프라인이라 일부러 단순하게 두었습니다.

`app.py`

```python
from flask import Flask

app = Flask(__name__)


@app.route('/')
def hello():
    return "Hello, Argo CD with Python!"


if __name__ == '__main__':
    app.run(port=5001)
```

`Dockerfile`

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

CMD ["python", "app.py"]
```

`requirements.txt`를 먼저 복사해 설치하고 그 다음에 코드를 복사하는 순서는 레이어 캐시 때문입니다. 코드만 바뀌면 의존성 설치 레이어가 재사용됩니다.

## 매니페스트

`deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: python-server
  template:
    metadata:
      labels:
        app: python-server
    spec:
      containers:
        - name: python-server
          image: songtomtom/python-server:837e020e0d03bfc742e9eedd6df95ab70e8f11c1
          ports:
            - containerPort: 5001
```

`image` 태그가 커밋 SHA인 것이 이 구성의 핵심입니다. `latest` 태그를 쓰면 같은 태그가 다른 이미지를 가리킬 수 있어서 Argo CD가 변경을 감지하지 못하고, 롤백할 때 어느 이미지로 돌아가야 하는지도 알 수 없습니다. SHA 태그는 매니페스트 커밋 하나가 정확히 이미지 하나를 가리킵니다.

## Argo CD Application

`my-gitops-app.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-python-gitops-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/songtomtom/argocd-app-manifests.git
    targetRevision: HEAD
    path: .
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

1편에서는 CLI로 만들었지만 Application도 결국 Kubernetes 리소스이므로 YAML로 두는 것이 GitOps답습니다. 이 파일을 매니페스트 저장소에 같이 넣어 두면 "Argo CD 설정"까지 Git에 남습니다.

`syncPolicy.automated`가 1편과 다른 부분입니다. 옵션 세 개가 각각 다른 상황을 다룹니다.

- **automated**: Git이 바뀌면 승인 없이 적용합니다. 이게 없으면 매번 `argocd app sync`를 눌러야 합니다.
- **prune**: Git에서 리소스를 지우면 클러스터에서도 지웁니다. 기본값은 지우지 않는 것이라, 이걸 켜지 않으면 삭제한 리소스가 클러스터에 남습니다.
- **selfHeal**: 누가 클러스터에서 손으로 바꾼 것을 Git 상태로 되돌립니다. `kubectl edit`로 레플리카 수를 바꿔도 몇 분 안에 원복됩니다. Git이 유일한 진실이라는 원칙을 강제하는 옵션입니다.

```bash
kubectl apply -f my-gitops-app.yaml
```

![](./SbgWdbtUDVEFJs4mlHuKoQ.png)

![](./3yj0E200V4PR1WoLv_LUxw.png)

## 비공개 저장소라면

매니페스트 저장소가 비공개면 Argo CD에 자격 증명을 등록해야 합니다. 시크릿에 `argocd.argoproj.io/secret-type: repository` 레이블을 붙여야 Argo CD가 인식합니다. 처음 글을 쓸 때는 이 레이블 없이 시크릿을 만들었는데, 예제 저장소가 공개라서 문제가 드러나지 않았습니다.

```bash
kubectl -n argocd create secret generic github-repo-creds \
  --from-literal=url=https://github.com/songtomtom/argocd-app-manifests.git \
  --from-literal=username=songtomtom \
  --from-literal=password='<GitHub PAT>'
kubectl -n argocd label secret github-repo-creds argocd.argoproj.io/secret-type=repository
```

`argocd repo add` 명령으로 하면 레이블까지 알아서 붙입니다.

## CI 워크플로

`.github/workflows/build_and_push.yaml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ master ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # 이미지 태그는 커밋 SHA. 같은 태그가 다른 내용을 가리키는 일이 없어 롤백이 정확하다.
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: songtomtom/python-server:${{ github.sha }}

      # 매니페스트 저장소의 이미지 태그를 바꿔 커밋한다. 배포 자체는 Argo CD 가 이 커밋을 보고 수행한다.
      - name: Update deployment manifest
        env:
          TOKEN: ${{ secrets.USER_CHECKOUT_TOKEN }}
        run: |
          git config --global user.name 'songtomtom'
          git config --global user.email 'celvincolvumn@gmail.com'
          git clone https://songtomtom:${TOKEN}@github.com/songtomtom/argocd-app-manifests.git
          cd argocd-app-manifests
          sed -i 's|image: .*|image: songtomtom/python-server:${{ github.sha }}|' deployment.yaml
          git add deployment.yaml
          git commit -m "Update image to ${{ github.sha }}"
          git push
```

세 단계입니다. 이미지를 빌드해 Docker Hub에 올리고, 매니페스트 저장소를 받아 이미지 태그 한 줄을 바꾸고, 커밋합니다. CI는 여기서 끝납니다. **CI는 클러스터를 모릅니다.** 클러스터 자격 증명이 GitHub에 없고, 배포는 클러스터 안의 Argo CD가 매니페스트 커밋을 보고 수행합니다. 1편에서 말한 pull 방식의 이점이 이 지점입니다.

`USER_CHECKOUT_TOKEN`은 매니페스트 저장소에 쓸 수 있는 GitHub 개인 액세스 토큰입니다. 기본 제공되는 `GITHUB_TOKEN`은 워크플로가 실행되는 저장소에만 권한이 있어서 다른 저장소에 푸시할 수 없습니다.

## 실행

소스 저장소에 커밋을 푸시하면 워크플로가 돌고, 몇 분 안에 Argo CD UI에서 새 SHA로 동기화된 것을 볼 수 있습니다.

![](./R4Cl-LXYQ3o49XuZMEPFPQ.png)

## 이 구성의 한계

동작하는 최소 구성이지 운영 구성은 아닙니다.

- **`sed`로 YAML을 고치는 것**은 깨지기 쉽습니다. `image:` 줄이 두 개가 되는 순간 둘 다 바뀝니다. Kustomize의 `images` 필드나 Helm values로 태그를 분리해 두고 `kustomize edit set image`로 바꾸는 것이 정석입니다.
- **개인 액세스 토큰**은 만료되고 개인에게 묶입니다. GitHub App이나 배포 키로 바꾸는 편이 낫습니다.
- **환경이 하나**입니다. 스테이징과 운영을 나누려면 매니페스트 저장소에 환경별 디렉터리를 두고 Application도 환경별로 만듭니다. 운영 환경은 `automated`를 끄고 승인 단계를 두는 경우가 많습니다.
- **이미지 갱신 자체를 CI가 커밋하는 대신** Argo CD Image Updater가 레지스트리를 감시해 매니페스트를 갱신하는 방식도 있습니다. CI가 매니페스트 저장소 권한을 가질 필요가 없어집니다.
- **테스트가 없습니다.** 실제 파이프라인은 빌드 전에 테스트를 돌리고, 실패하면 이미지를 올리지 않습니다.

그래도 이 구성은 GitOps의 핵심을 다 담고 있습니다. 배포 이력이 매니페스트 저장소의 git log에 남고, 롤백은 그 커밋을 되돌리는 것이며, 클러스터 접근 권한은 클러스터 안에만 있습니다.

## Reference

- [Argo CD — Automated Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Argo CD — Private Repositories](https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/)
- [Argo CD Image Updater](https://argocd-image-updater.readthedocs.io/)
