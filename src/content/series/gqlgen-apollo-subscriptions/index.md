---
title: "gqlgen + Apollo GraphQL 구독 서비스"
description: "Go gqlgen으로 GraphQL Subscription 서버를 만들고 Apollo Client로 WebSocket을 연결해 실시간 이벤트를 스트리밍합니다."
date: "2023-01-17"
repoURL: "https://github.com/songtomtom/gqlgen-apollo-subscriptions"
tech: ["Go", "gqlgen", "GraphQL", "WebSocket", "React", "Apollo Client"]
category: backend
cover: ./cover.png
---

GraphQL Subscription으로 서버에서 클라이언트로 이벤트를 실시간 스트리밍하는 예제입니다. 서버는 Go와 gqlgen, 클라이언트는 React와 Apollo Client로 구성했고, 댓글이 추가되면 같은 게시물을 구독 중인 모든 클라이언트에 즉시 전달되는 흐름을 5편에 걸쳐 만듭니다.

핵심은 뮤테이션과 구독 리졸버를 잇는 Observer입니다. postId별 구독자 채널 집합을 RWMutex로 보호하고, 발행은 논블로킹으로 하며, 구독 종료 시 채널을 정리합니다. 처음 만든 버전의 동시 쓰기, 구독자 덮어쓰기, 블로킹 발행 문제를 어떻게 잡았는지가 5편의 내용입니다.

- 서버: `server.go`, `graph/` (스키마, 리졸버, Observer와 단위 테스트)
- 클라이언트: `client/` (Create React App + Apollo Client)
- 실행: `make up` (MySQL), `make start` (서버), `make client` (클라이언트)
