---
title: "Go testify 테스트"
description: "작은 할 일 REST 서비스를 대상으로 testify의 assert, require, mock, suite를 어디에 왜 쓰는지, MySQL 통합 테스트를 testcontainers로 어떻게 돌리는지 정리합니다."
date: "2026-09-28"
repoURL: "https://github.com/songtomtom/go-testify-testing"
tech: ["Go", "testify", "testcontainers", "MySQL"]
category: backend
---

Go 표준 `testing` 패키지만으로도 테스트는 쓸 수 있지만, 실패 메시지가 빈약하고 모킹과 스위트를 매번 손으로 만들어야 합니다. 이 프로젝트는 할 일 REST 서비스 하나를 대상으로 testify의 네 패키지를 각각 어떤 문제에 쓰는지 보여 줍니다.

- `assert`와 `require`: 테이블 테스트에서 어느 쪽을 언제 쓰는지, 실패 출력이 어떻게 다른지
- `mock`: 저장소 인터페이스를 가짜로 바꿔 메모리 저장소로는 만들 수 없는 오류 상황과 호출 여부를 검증
- `suite`와 testcontainers: MySQL 컨테이너 하나를 스위트가 공유하고 케이스 사이에 테이블을 비우는 통합 테스트

저장소는 인터페이스 뒤에 메모리 구현과 MySQL 구현이 있고, 두 구현이 같은 계약 테스트를 통과합니다. CI는 GitHub Actions에서 Docker로 컨테이너 테스트까지 돌립니다.
