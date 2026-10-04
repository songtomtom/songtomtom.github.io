---
title: "MySQL Operator에서 CloudNativePG로"
description: "Kubernetes 위에서 MySQL Operator를 1년 운영하다 PostgreSQL(CloudNativePG)로 옮긴 과정. 전환의 계기가 된 pgvector 예제와 실제 운영 매니페스트를 정리합니다."
date: "2026-09-28T14:00"
repoURL: "https://github.com/songtomtom/mysql-to-postgres-on-kubernetes"
tech: ["PostgreSQL", "pgvector", "Go", "ent", "Kubernetes", "CloudNativePG"]
category: infra
cover: ./cover.png
---

Oracle MySQL Operator로 InnoDBCluster를 1년 운영했습니다. 그 사이 OOM을 쫓는 커밋이 수십 개 쌓였고, 어느 날 벡터 검색이 필요한 서비스 하나가 PostgreSQL로 먼저 넘어갔습니다. 옮겨 보니 확장과 운영 양쪽이 편해서 여섯 달에 걸쳐 전부 옮겼고 MySQL 클러스터는 제거했습니다.

저장소에는 두 가지가 있습니다.

- `app/`: 서비스 하나씩 옮기기 위한 MySQL·PostgreSQL 드라이버 전환, ent에 pgvector 컬럼과 HNSW 인덱스를 붙이는 방법, 코사인 유사도 검색. testcontainers로 pgvector 이미지를 띄우는 테스트가 있습니다.
- `k8s/`: 1년 뒤 도달한 InnoDBCluster 설정과, 대체한 CloudNativePG values. 값마다 왜 그 숫자가 됐는지 주석으로 남겼습니다. 이름과 계정은 지웠습니다.

1편은 개발자 관점(왜 옮겼고 앱을 어떻게 고쳤나), 2편은 인프라 관점(무엇이 힘들었고 무엇으로 바꿨나)입니다.
