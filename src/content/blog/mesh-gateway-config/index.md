---
title: "Mesh Gateway 구성 파일 생성"
description: "GraphQL Mesh CLI를 설치하고 REST, gRPC, GraphQL 소스를 하나로 묶을 .meshrc.yaml 구성 파일을 만듭니다."
date: "2025-01-13"
project: graphql-mesh-gateway
order: 1
canonical: "https://medium.com/@songtomtom/mesh-gateway-%EA%B5%AC%EC%84%B1-%ED%8C%8C%EC%9D%BC-%EC%83%9D%EC%84%B1-94bc27200f13"
tags:
  - graphql
  - graphql-mesh
  - gateway
---

[GraphQL Mesh](https://the-guild.dev/graphql/mesh/docs) 를 통해 REST API, GraphQL, gRPC 등등 마이크로서비스 아키텍쳐(MSA) 인프라에서 GraphQL 게이트웨이를 구축 할 수 있습니다.

## 인프라 구성 목표

GraphQL Mesh 튜토리얼 예제를 목표로 하여 개발 합니다.

Books API (REST API)

- GET /books
- GET /books/:id
- GET /categories

Authors API (gRPC API)

- GetAuthor
- ListAuthors

Stores (GraphQL API)

- stores Query
- bookSells(storeId: ID!) Query

## Mesh CLI 설치

```bash
mkdir mesh_gateway
cd mesh_gateway
yarn add @graphql-mesh/cli graphql
```

## .meshrc.yaml 정의

`.meshrc.yaml`

```yaml
sources:
  - name: Books
    handler:
      openapi:
        endpoint: http://localhost:3002/
  - name: Authors
    handler:
      grpc:
        endpoint: http://localhost:3003/
  - name: Stores
    handler:
      graphql:
        endpoint: http://localhost:3004/
serve:
  hostname: 0.0.0.0
  port: 80
  endpoint: /
  browser: false
  playground: true
```

<a href="https://medium.com/media/0a58f2e9930351ed979cc5c186323ac8/href">https://medium.com/media/0a58f2e9930351ed979cc5c186323ac8/href</a>

## Mesh 시작, 빌드

```json
{
  "scripts": {
    "start": "mesh start",
    "build": "mesh build"
  }
}
```

Books, Authors, Stores API endpoint 를 기본 설정하고 예제를 진행하면서 수정하겠습니다.

## Reference

- [GraphQL Mesh — Your first Gateway with Mesh](https://the-guild.dev/graphql/mesh/docs/getting-started/your-first-mesh-gateway)
- [charlypoly/graphql-mesh-docs-first-gateway](https://github.com/charlypoly/graphql-mesh-docs-first-gateway)

## Github

- [songtomtom/graphql-mesh-gateway](https://github.com/songtomtom/graphql-mesh-gateway)
