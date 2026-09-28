---
title: "gRPC 서버, 클라이언트 만들기"
description: "Protobuf 컴파일러를 설치하고 helloworld.proto로 Go gRPC 서버와 클라이언트를 만들어 통신을 확인합니다."
date: "2025-01-13"
project: go-grpc
order: 1
canonical: "https://medium.com/@songtomtom/grpc-%EC%84%9C%EB%B2%84-%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8-%EB%A7%8C%EB%93%A4%EA%B8%B0-08d8b943bbe1"
tags:
  - go
  - grpc
  - protobuf
---

## Protobuf 컴파일러 설치

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2
```

컴파일러를 설치하고 protoc 경로를 설정합니다.

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

## Protobuf 작성

Protobuf 를 작성 할 디렉토리를 만듭니다.

```bash
mkdir -p proto/v1
```

proto/v1 디렉토리를 만들고 [gRPC](https://github.com/grpc/grpc-go/tree/master/examples/helloworld/helloworld) 예제에서 helloworld.proto 가져옵니다.

`helloworld.proto` — pb.proto

```protobuf
syntax = "proto3";

option go_package = "github.com/songtomtom/go-grpc/proto/v1";

package v1;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

<a href="https://medium.com/media/49070f30c75f6472248d8c09c727fd1f/href">https://medium.com/media/49070f30c75f6472248d8c09c727fd1f/href</a>

## gRPC 컴파일러 실행

helloworld.proto 를 컴파일합니다. 컴파일이 성공하면 helloworld.pb.go, helloworld_grpc.pb.go 파일이 생성됩니다.

```bash
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       proto/v1/helloworld.proto
```

## gRPC 서버 만들기

`server.go` — grpc 서버 튜토리얼 코드

```go
package main

import (
	"context"
	v1 "github.com/songtomtom/go-grpc/proto/v1"
	"google.golang.org/grpc"
	"log"
	"net"
)

type server struct {
	v1.UnimplementedGreeterServer
}

func (s *server) SayHello(
	ctx context.Context,
	in *v1.HelloRequest,
) (*v1.HelloReply, error) {
	log.Printf("Received: %v", in.GetName())
	return &v1.HelloReply{Message: "Hello " + in.GetName()}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	v1.RegisterGreeterServer(s, &server{})
	log.Printf("server listening at %v", lis.Addr())
	if err = s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

<a href="https://medium.com/media/8c506617c2e9ff7f97c3fb1fd6bacf5d/href">https://medium.com/media/8c506617c2e9ff7f97c3fb1fd6bacf5d/href</a>

## gRPC 클라이언트 만들기

`client.go` — grcp 튜토리얼 클라이언트 코드

```go
package main

import (
	"context"
	v1 "github.com/songtomtom/go-grpc/proto/v1"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {

	conn, err := grpc.Dial(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := v1.NewGreeterClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	r, err := c.SayHello(ctx, &v1.HelloRequest{Name: "world"})
	if err != nil {
		log.Fatalf("could not greet: %v", err)
	}
	log.Printf("Greeting: %s", r.GetMessage())
}
```

<a href="https://medium.com/media/081b8d527224f535df808ebc84ad927a/href">https://medium.com/media/081b8d527224f535df808ebc84ad927a/href</a>

## gRPC 서버, 클라이언트 시작

서버 실행

```bash
$ go run server/server.go 
server listening at [::]:50051
```

클라이언트 실행

다른 터미널에서 클라이언트 실행하고 매소드에서 작성한 **“Greeting: Hello world”** 를 출력합니다.

```bash
$ go run client/client.go 
Greeting: Hello world
```

## Reference

- [gRPC — Quick start Go gRPC](https://grpc.io/docs/languages/go/quickstart)
- [ProtoBuf — Go 기본사항](https://developers.google.com/protocol-buffers/docs/gotutorial)
- [grpc/grpc-go](https://github.com/grpc/grpc-go/tree/master/examples/helloworld/helloworld)

## Github

- [songtomtom/go-grpc](https://github.com/songtomtom/go-grpc)
