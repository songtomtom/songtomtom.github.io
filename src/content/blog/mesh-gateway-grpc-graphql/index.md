---
title: "gRPC, GraphQL 서버 Mesh Gateway 연결"
description: "Go gRPC 서버와 gqlgen GraphQL 서버를 만들고 Mesh Gateway에 연결해 REST, gRPC, GraphQL 세 소스를 하나의 게이트웨이로 묶습니다."
date: "2025-01-13"
project: graphql-mesh-gateway
order: 3
canonical: "https://medium.com/@songtomtom/grpc-graphql-%EC%84%9C%EB%B2%84-mesh-gateway-%EC%97%B0%EA%B2%B0-65dbde40f4ec"
tags:
  - go
  - grpc
  - gqlgen
  - graphql-mesh
---

## gRPC 프로젝트 설정

gRPC 프로젝트 디렉토리를 만들고 Go 모듈로 초기화 합니다.

```bash
mkdir grpc
cd grpc
```

## Authors ProtoBuf 정의

GraphQL Mesh 예제에서 [authors_service.proto](https://github.com/charlypoly/graphql-mesh-docs-first-gateway/blob/master/packages/authors-service/proto/authors/v1/authors_service.proto) 파일을 가져옵니다.

```bash
mkdir -p proto/v1
cd proto/v1
```

Go 모듈로 사용하기 위해 option go_package = "github.com/songtomtom/graphql-mesh-gateway/grpc/proto/v1"; 을 추가 합니다.

`authors_service.proto` — pb.proto

```protobuf
syntax = "proto3";


option go_package = "github.com/songtomtom/graphql-mesh-gateway/grpc/proto/v1";

package authors.v1;

service AuthorsService {
  rpc GetAuthor(GetAuthorRequest) returns (Author) {}

  rpc ListAuthors(ListAuthorsRequest) returns (ListAuthorsResponse) {}
}

message ListAuthorsRequest {}


message GetAuthorRequest {
  string id = 1;
}

message ListAuthorsResponse {
  repeated Author items = 1;
}

message Author {
  string id = 1;
  string name = 2;
  string editor = 3;
}
```

<a href="https://medium.com/media/a69c755d24aa6608b44b7bbc9936ce45/href">https://medium.com/media/a69c755d24aa6608b44b7bbc9936ce45/href</a>

authors_service.proto 를 컴파일합니다. 컴파일이 성공하면 authors_service.go, authors_service.pb.go 파일이 생성됩니다.

## gRPC 서버 만들기

gRPC 서버 만들기는 [gRPC 서버, 클라이언트 만들기](https://medium.com/@songtomtom/grpc-%EC%84%9C%EB%B2%84-%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8-%EB%A7%8C%EB%93%A4%EA%B8%B0-08d8b943bbe1) 참고 합니다.

`server.go`

```go
package main

import (
	"context"
	v1 "github.com/songtomtom/graphql-mesh-gateway/grpc/proto/v1"
	"google.golang.org/grpc"
	"log"
	"net"
)

type server struct {
	v1.UnimplementedAuthorsServiceServer
}

func (s *server) GetAuthor(
	ctx context.Context,
	in *v1.GetAuthorRequest,
) (*v1.Author, error) {
	return &v1.Author{
		Id:     in.GetId(),
		Name:   "dummy_name",
		Editor: "dummy_editor",
	}, nil
}

func (s *server) ListAuthors(
	ctx context.Context,
	in *v1.ListAuthorsRequest,
) (*v1.ListAuthorsResponse, error) {
	return &v1.ListAuthorsResponse{Items: []*v1.Author{}}, nil
}

func main() {

	lis, err := net.Listen("tcp", ":3003")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	v1.RegisterAuthorsServiceServer(s, &server{})
	log.Printf("server listening at %v", lis.Addr())
	if err = s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

<a href="https://medium.com/media/a53ce4ccb12580d8086cef99b639b2ac/href">https://medium.com/media/a53ce4ccb12580d8086cef99b639b2ac/href</a>

## gRPC 서버 실행

gRPC 서버를 실행합니다.

```bash
go run server.go 

server listening at [::]:3003
```

## Mesh Gateway 에 gRPC 설정 추가

gRPC 를 Mesh Gateway 에 연결 하려면 @graphql-mesh/grpc 를 설치 해야 합니다.

```bash
yarn add @graphql-mesh/grpc
```

.meshrc.yaml 에 gRPC 를 연결할 protobuf 경로를 추가합니다.

`.meshrc.yaml`

```yaml
sources:
  - name: Books
    handler:
      openapi:
        endpoint: http://localhost:3002/
        source: ../rest_api/openapi3-definition.json
  - name: Authors
    handler:
      grpc:
        endpoint: http://localhost:3003/
        source: ../grpc/proto/v1/authors_service.proto
#  - name: Stores
#    handler:
#      graphql:
#        endpoint: http://localhost:3004/
serve:
  hostname: 0.0.0.0
  port: 80
  endpoint: /
  browser: false
  playground: true
```

<a href="https://medium.com/media/f41e2d592d1b282cd15d379d27445aa1/href">https://medium.com/media/f41e2d592d1b282cd15d379d27445aa1/href</a>

## GraphQL 프로젝트 설정

GraphQL 프로젝트 디렉토리를 만들고 Go 모듈로 초기화 합니다.

```bash
mkdir graphql
cd graphql
```

## Stories GraphQL 스키마 정의

GraphQL Mesh 예제에서 [schema.graphql](https://github.com/charlypoly/graphql-mesh-docs-first-gateway/blob/master/packages/stores-service/schema.graphql) 파일을 가져옵니다.

`schema.graphql`

```graphql
type Store {
    id: ID!
    name: String!
    location: String!
}

type Sells {
    bookId: ID!
    sellsCount: Int!
    monthYear: String
    storeId: ID!
}

type Query {
    stores: [Store!]!
    bookSells(storeId: ID!): [Sells!]!
}
```

<a href="https://medium.com/media/9767358bf9ba6f0a50532062926b9ca6/href">https://medium.com/media/9767358bf9ba6f0a50532062926b9ca6/href</a>

## GraphQL 서버 만들기

[gqlgen](https://gqlgen.com/) 을 사용하여 GraphQL 서버를 만듭니다.

`server.go`

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/songtomtom/graphql-mesh-gateway/graphql/graph"
)

const defaultPort = "3004"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))

	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.Handle("/query", srv)

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

<a href="https://medium.com/media/a3e350bc892a4ab8d45de58fefe6fb6d/href">https://medium.com/media/a3e350bc892a4ab8d45de58fefe6fb6d/href</a>

## GraphQL 서버 실행

```bash
go run server.go 

connect to http://localhost:3004/ for GraphQL playground
```

## Mesh Gateway 에 GraphQL 설정 추가

GraphQL 를 Mesh Gateway 에 연결 하려면 @graphql-mesh/graphql 를 설치 해야 합니다.

```bash
yarn add @graphql-mesh/graphql
```

`.meshrc.yaml`

```yaml
sources:
  - name: Books
    handler:
      openapi:
        endpoint: http://localhost:3002/
        source: ../rest_api/openapi3-definition.json
  - name: Authors
    handler:
      grpc:
        endpoint: http://localhost:3003/
        source: ../grpc/proto/v1/authors_service.proto
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

<a href="https://medium.com/media/42e04b36a12fe4dfd2de6aa5f098c044/href">https://medium.com/media/42e04b36a12fe4dfd2de6aa5f098c044/href</a>

## Mesh Gateway 실행

Rest API, gRPC, GrpahQL 서버를 실행하고 Mesh Gateway 를 시작합니다.

```bash
cd mesh_gateway

yarn start
yarn run v1.22.18
warning package.json: No license field

mesh start
💡 🕸️  Mesh - Server Starting GraphQL Mesh...
💡 🕸️  Mesh - Books Processing annotations for the execution layer
💡 🕸️  Mesh - Server Serving GraphQL Mesh: http://0.0.0.0:80
```

![](./tMXEMmGRYqLGaANH460Xdg.png)

## Reference

- [GraphQL Mesh — Combine multiple Sources](https://the-guild.dev/graphql/mesh/docs/getting-started/combine-multiple-sources)
- [charlypoly/graphql-mesh-docs-first-gateway](https://github.com/charlypoly/graphql-mesh-docs-first-gateway)
- [gqlgen](https://gqlgen.com/)

## Github

- [songtomtom/graphql-mesh-gateway](https://github.com/songtomtom/graphql-mesh-gateway)
