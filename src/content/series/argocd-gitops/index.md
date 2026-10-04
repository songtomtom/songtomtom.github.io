---
title: "Argo CD GitOps 파이프라인"
description: "Minikube에 Argo CD를 올리고 GitHub Actions와 연결해 푸시만으로 배포되는 GitOps 파이프라인을 만듭니다."
date: "2025-01-18"
repoURL: "https://github.com/songtomtom/argocd-app-source"
tech: ["Argo CD", "Kubernetes", "GitHub Actions", "Docker", "Python"]
category: infra
cover: ./cover.gif
---

애플리케이션 소스와 Kubernetes 매니페스트를 저장소 두 개로 분리한 GitOps 구성입니다.

- 소스 저장소: [argocd-app-source](https://github.com/songtomtom/argocd-app-source) (Flask 앱, Dockerfile, GitHub Actions 워크플로)
- 매니페스트 저장소: [argocd-app-manifests](https://github.com/songtomtom/argocd-app-manifests) (Deployment, Argo CD Application)

소스에 푸시하면 Actions가 이미지를 빌드해 매니페스트를 갱신하고, Argo CD가 변경을 감지해 클러스터에 배포합니다. CI는 클러스터 자격 증명을 갖지 않고, 배포 이력은 매니페스트 저장소의 git log가 됩니다.
