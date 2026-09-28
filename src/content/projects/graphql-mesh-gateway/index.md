---
title: "GraphQL Mesh Gateway"
description: "REST, gRPC, GraphQL 서비스를 GraphQL Mesh로 하나의 게이트웨이에 통합합니다."
date: "2023-01-28"
repoURL: "https://github.com/songtomtom/graphql-mesh-gateway"
tech: ["GraphQL Mesh", "Go", "gRPC", "gqlgen", "OpenAPI"]
---

![](./cover.png)

GraphQL Mesh 튜토리얼을 목표로 Books(REST), Authors(gRPC), Stores(GraphQL) 세 서비스를 Go로 만들고, 하나의 Mesh Gateway 뒤에 묶는 예제입니다. 저장소는 `rest_api`, `grpc`, `graphql`, `mesh_gateway` 네 폴더로 나뉘며 글 3편이 각 단계에 대응합니다.
