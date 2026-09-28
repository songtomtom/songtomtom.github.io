---
title: "gqlgen 으로 구독(Subscriptions) 서버 만들기"
description: "gqlgen 기본 서버에 WebSocket 전송을 추가하고 Subscription 스키마와 채널 기반 리졸버로 1초마다 현재 시각을 스트리밍합니다."
date: "2025-01-10"
project: gqlgen-apollo-subscriptions
order: 1
canonical: "https://medium.com/@songtomtom/gqlgen-%EC%9C%BC%EB%A1%9C-%EA%B5%AC%EB%8F%85-subscriptions-%EC%84%9C%EB%B2%84-%EB%A7%8C%EB%93%A4%EA%B8%B0-7603b9038da0"
tags:
  - go
  - gqlgen
  - graphql
  - subscription
---

GraphQL 구독(Subscription) 기능을 통해 실시간으로 클라이언트에 이벤트를 스트리밍할 수 있습니다.

## WebSocket 전송 추가

아래 코드는 `go run github.com/99designs/gqlgen init` 으로 만들어진 기본 코드입니다.

`server.go` — go run github.com/99designs/gqlgen init 으로 만들어진 기본 코드

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/songtomtom/gqlgen-apollo-subscriptions/graph"
)

const defaultPort = "8080"

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

> Subscription을 사용하려면 `AddTransport(&transport.Websocket{})` 를 호출하여 클라이언트와 서버를 연결하세요.

`AddTransport(&transport.Websocket{})` 를 추가한 코드입니다.

`server.go` — srv.AddTransport(&transport.Websocket{}) 가 추가된 server.go

```go
package main

import (
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/songtomtom/gqlgen-apollo-subscriptions/graph"
)

const defaultPort = "8080"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))
	srv.AddTransport(&transport.Websocket{}) // <---- This is the important part!

	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.Handle("/query", srv)

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

## Subscription 스키마 정의

`schema.graphql` — Subscription schema.graphql 예제

```graphql
"""
Make sure you have at least something in your `Query` type.
If you don't have a query the playground will be unable
to introspect your schema!
"""
type Query {
    placeholder: String
}

"""
`Time` is a simple type only containing the current time as
a unix epoch timestamp and a string timestamp.
"""
type Time {
    unixTime: Int!
    timeStamp: String!
}

"""
`Subscription` is where all the subscriptions your clients can
request. You can use Schema Directives like normal to restrict
access.
"""
type Subscription {
    """
    `currentTime` will return a stream of `Time` objects.
    """
    currentTime: Time!
}
```

## CurrentTime 리졸버 개발

`ch := make(chan *model.Time)` 채널을 생성하고 `ch` 를 리턴하는 리졸버입니다. Go 의 채널은 클라이언트에 데이터를 보내는데 사용합니다.

`resolver.go`

```go
// CurrentTime is the resolver for the currentTime field.
func (r *subscriptionResolver) CurrentTime(ctx context.Context) (
	<-chan *model.Time,
	error,
) {
	// First you'll need to `make()` your channel. Use your type here!
	ch := make(chan *model.Time)

	// You can (and probably should) handle your channels in a central place outside of `schema.resolvers.go`.
	// For this example we'll simply use a Goroutine with a simple loop.
	go func() {
		for {
			// In our example we'll send the current time every second.
			time.Sleep(1 * time.Second)
			fmt.Println("Tick")

			// Prepare your object.
			currentTime := time.Now()
			t := &model.Time{
				UnixTime:  int(currentTime.Unix()),
				TimeStamp: currentTime.Format(time.RFC3339),
			}

			// The channel may have gotten closed due to the client disconnecting.
			// To not have our Goroutine block or panic, we do the send in a select block.
			// This will jump to the default case if the channel is closed.
			select {
			case ch <- t: // This is the actual send.
				// Our message went through, do nothing
			default: // This is run when our send does not work.
				fmt.Println("Channel closed.")
				// You can handle any deregistration of the channel here.
				return // We'll just return ending the routine.
			}
		}
	}()

	// We return the channel and no error.
	return ch, nil
}
```

## CurrentTime 구독

```graphql
subscription OnCurrentTime {
    currentTime {
        unixTime
        timeStamp
    }
}
```

1초 마다 시간이 바뀌는 값이 반환되어야 합니다.

```json
{
  "data": {
    "currentTime": {
      "unixTime": 1672931488,
      "timeStamp": "2023-01-06T00:11:28+09:00"
    }
  }
}
```

## Reference

- [gqlgen — Subscriptions](https://gqlgen.com/recipes/subscriptions)

## Github

- [songtomtom/gqlgen-apollo-subscriptions](https://github.com/songtomtom/gqlgen-apollo-subscriptions)
