---
title: "gqlgen 으로 구독(Subscriptions) 서버 만들기"
description: "폴링 대신 GraphQL Subscription을 택한 이유, gqlgen에 WebSocket 전송을 붙이는 방법, 그리고 구독 리졸버가 채널과 컨텍스트로 어떻게 동작하는지 정리합니다."
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

댓글이 달리면 화면이 바로 바뀌어야 하는 기능을 만들 일이 있었습니다. 가장 쉬운 방법은 클라이언트가 몇 초마다 목록을 다시 조회하는 폴링입니다. 하지만 사용자가 늘수록 대부분의 요청이 "변한 게 없다"는 응답만 받게 되고, 반응 속도는 폴링 주기에 묶입니다. GraphQL Subscription은 이 문제를 서버가 이벤트를 밀어주는 방식으로 풀어 줍니다. 이 시리즈는 Go의 gqlgen과 React의 Apollo Client로 그 구조를 처음부터 끝까지 만들어 보는 기록입니다.

## 이 시리즈에서 만드는 것

다섯 편에 걸쳐 아래 구조를 완성합니다.

<svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="시리즈 전체 구조" style="max-width:640px;width:100%;font-family:inherit;font-size:13px">
  <g fill="none" stroke="currentColor" stroke-width="1.2">
    <rect x="20" y="30" width="200" height="90" rx="8"/>
    <rect x="420" y="30" width="200" height="200" rx="8"/>
    <rect x="440" y="150" width="160" height="60" rx="6" stroke-dasharray="4 3"/>
  </g>
  <g fill="currentColor">
    <text x="120" y="55" text-anchor="middle" font-weight="600">React + Apollo Client</text>
    <text x="120" y="80" text-anchor="middle" opacity=".7">HttpLink ─ Query, Mutation</text>
    <text x="120" y="100" text-anchor="middle" opacity=".7">GraphQLWsLink ─ Subscription</text>
    <text x="520" y="55" text-anchor="middle" font-weight="600">Go + gqlgen</text>
    <text x="520" y="80" text-anchor="middle" opacity=".7">/query  (HTTP POST)</text>
    <text x="520" y="100" text-anchor="middle" opacity=".7">/subscriptions  (WebSocket)</text>
    <text x="520" y="125" text-anchor="middle" opacity=".7">MySQL (gorm)</text>
    <text x="520" y="175" text-anchor="middle" font-weight="600">Observer</text>
    <text x="520" y="195" text-anchor="middle" opacity=".7">postId → 구독자 채널 집합</text>
    <text x="320" y="60" text-anchor="middle" opacity=".8">POST /query</text>
    <text x="320" y="110" text-anchor="middle" opacity=".8">WS /subscriptions</text>
  </g>
  <g stroke="currentColor" stroke-width="1.2" fill="none" marker-end="url(#a)">
    <path d="M220 70 H420"/>
    <path d="M420 100 H220"/>
  </g>
  <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker></defs>
</svg>

1. **이번 글**: gqlgen 서버에 WebSocket 전송을 붙이고, 1초마다 시각을 보내는 가장 단순한 구독으로 배관이 동작하는지 확인합니다.
2. Apollo Client에서 HTTP와 WebSocket 링크를 나눠 연결합니다.
3. 게시물과 댓글 도메인을 MySQL에 저장하는 리졸버를 만듭니다.
4. React 화면에서 댓글을 쓰고 읽습니다.
5. 뮤테이션이 일어났을 때 구독자에게 이벤트를 전달하는 Observer를 만들고, 동시성과 구독 해제를 처리합니다.

전제 조건은 Go 1.22 이상, Node 18 이상, Docker입니다. 전체 코드는 [songtomtom/gqlgen-apollo-subscriptions](https://github.com/songtomtom/gqlgen-apollo-subscriptions)에 있습니다.

## 왜 gqlgen인가

Go의 GraphQL 라이브러리는 여럿 있지만 gqlgen을 골랐습니다. 스키마를 먼저 쓰고 그에 맞는 Go 타입과 리졸버 뼈대를 생성하는 스키마 우선 방식이라, 스키마가 곧 문서가 되고 타입 불일치가 컴파일 시점에 잡힙니다. 구독도 별도 라이브러리 없이 WebSocket 전송을 하나 추가하면 끝납니다.

## 프로젝트 초기화

```bash
mkdir gqlgen-apollo-subscriptions && cd gqlgen-apollo-subscriptions
go mod init github.com/songtomtom/gqlgen-apollo-subscriptions
go run github.com/99designs/gqlgen init
```

`init`이 `server.go`, `graph/schema.graphqls`, `graph/schema.resolvers.go`, `gqlgen.yml`을 만들어 줍니다. 이후 스키마를 바꿀 때마다 `go run github.com/99designs/gqlgen generate`를 실행하면 리졸버 뼈대가 다시 생성되고, 이미 구현한 리졸버 본문은 그대로 보존됩니다. 이 명령을 Makefile의 `gen` 타깃으로 묶어 두면 편합니다.

## WebSocket 전송 추가

`init`이 만든 서버는 `handler.NewDefaultServer`를 씁니다. 이 함수는 GET, POST, multipart 같은 HTTP 전송만 등록하기 때문에 구독 요청이 오면 거부합니다. 구독은 서버가 클라이언트로 여러 번 응답을 보내야 하므로 요청 한 번에 응답 한 번인 HTTP로는 불가능하고, 양방향 연결인 WebSocket이 필요합니다.

그래서 `handler.New`로 빈 서버를 만들고 필요한 전송만 직접 등록했습니다.

`server.go`

```go
srv := handler.New(schema)
srv.AddTransport(transport.Options{})
srv.AddTransport(transport.POST{})
srv.AddTransport(transport.Websocket{
	// 브라우저의 WebSocket 은 CORS 를 타지 않으므로 오리진 검사를 여기서 직접 한다.
	// CRA 개발 서버(3000)와 playground(8080)만 허용한다. 운영에서는 실제 클라이언트 도메인으로 바꾼다.
	Implementation: transport.CoderWebsocketImplementation{
		AcceptOptions: coderws.AcceptOptions{
			OriginPatterns: []string{"localhost:3000", "localhost:" + port},
		},
	},
	// 프록시나 로드밸런서가 유휴 연결을 끊지 않도록 주기적으로 ping 을 보낸다.
	KeepAlivePingInterval: 10 * time.Second,
})

mux := http.NewServeMux()
mux.Handle("/", playground.Handler("GraphQL playground", "/query"))
mux.Handle("/query", srv)
mux.Handle("/subscriptions", srv)
```

여기서 두 가지를 짚어 두겠습니다.

**오리진 검사.** 브라우저는 WebSocket 핸드셰이크에 CORS를 적용하지 않습니다. 대신 `Origin` 헤더를 보내고, 검사는 서버 몫입니다. 검사를 끄면 다른 사이트에 열린 탭이 사용자의 쿠키를 들고 내 서버에 구독을 걸 수 있습니다. 처음 만들 때는 `CheckOrigin`을 항상 true로 두었는데, 지금은 허용할 오리진을 명시합니다.

**Keep-alive.** 아무 메시지도 오가지 않는 WebSocket은 중간의 프록시나 로드밸런서가 유휴 연결로 보고 끊어 버립니다. gqlgen은 주기적으로 ping을 보내는 옵션을 제공하므로 처음부터 켜 둡니다.

`/query`와 `/subscriptions`가 같은 핸들러를 가리키는 것은 의도한 것입니다. 클라이언트 쪽에서 HTTP 주소와 WebSocket 주소를 나눠 설정하는데, 서버가 경로를 나눠 받을 이유는 없습니다.

## 구독 스키마 정의

가장 단순한 구독으로 배관을 검증합니다. 현재 시각을 1초마다 보내는 `currentTime`입니다. 댓글 같은 도메인은 3편에서 붙입니다.

`graph/schema.graphqls`

```graphql
type Time {
    unixTime: Int!
    timeStamp: String!
}

type Subscription {
    # 1초마다 서버 시각을 보낸다. 구독 배관이 살아 있는지 확인하는 용도.
    currentTime: Time!
}
```

`Query` 타입이 비어 있으면 playground가 스키마를 읽지 못하므로 최소한 하나는 두어야 합니다. 이 저장소에서는 3편의 `comments` 쿼리가 그 역할을 합니다.

## 구독 리졸버

`generate`를 돌리면 `CurrentTime` 리졸버 뼈대가 생깁니다. 반환 타입이 `<-chan *model.Time`인 것이 핵심입니다. gqlgen은 리졸버가 돌려준 채널에서 값을 읽을 때마다 클라이언트에 메시지를 보내고, 채널이 닫히면 구독을 끝냅니다.

`graph/schema.resolvers.go`

```go
func (r *subscriptionResolver) CurrentTime(ctx context.Context) (<-chan *model.Time, error) {
	ch := make(chan *model.Time, 1)

	go func() {
		defer close(ch)
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				// 클라이언트가 구독을 끊으면 gqlgen 이 ctx 를 취소한다. 여기서 고루틴을 끝내야 누수가 없다.
				return
			case now := <-ticker.C:
				select {
				case ch <- &model.Time{UnixTime: int(now.Unix()), TimeStamp: now.Format(time.RFC3339)}:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	return ch, nil
}
```

이 코드에서 중요한 것은 시각을 보내는 부분이 아니라 `ctx.Done()`을 두 군데서 기다리는 부분입니다.

- 클라이언트가 구독을 취소하거나 연결이 끊기면 gqlgen은 리졸버에 넘긴 `ctx`를 취소합니다. 고루틴이 이 신호를 무시하면 구독자가 떠난 뒤에도 1초마다 값을 만들어 채널에 밀어 넣으려다 영원히 블로킹됩니다. 구독이 천 번 열리고 닫히면 고루틴 천 개가 남습니다.
- 채널에 쓰는 순간에도 `ctx.Done()`을 같이 기다려야 합니다. 첫 번째 `select`만 있으면 ticker가 먼저 도착한 뒤 채널 쓰기에서 블로킹된 채로 취소 신호를 못 받는 경우가 생깁니다.
- 채널은 리졸버가 닫습니다. `defer close(ch)`가 있어야 gqlgen이 클라이언트에 `complete`를 보내고 자원을 정리합니다.

## 프로토콜은 어떻게 흐르는가

WebSocket 위에서 GraphQL 메시지가 오가는 규칙은 graphql-transport-ws 프로토콜이 정합니다. gqlgen과 Apollo Client가 쓰는 graphql-ws 라이브러리 모두 이 프로토콜을 따릅니다. 한 번의 구독은 이렇게 흘러갑니다.

1. 클라이언트가 `connection_init`을 보내고 서버가 `connection_ack`로 답합니다. 인증 토큰은 이 단계의 payload에 실립니다.
2. 클라이언트가 고유 id와 함께 `subscribe`를 보냅니다. payload는 일반 GraphQL 요청과 같은 query, variables입니다.
3. 서버는 리졸버의 채널에서 값이 나올 때마다 같은 id로 `next`를 보냅니다.
4. 채널이 닫히면 서버가 `complete`를 보냅니다. 클라이언트가 먼저 `complete`를 보내면 서버는 리졸버의 ctx를 취소합니다.
5. 연결 하나 위에서 여러 구독이 id로 구분되어 동시에 진행됩니다.

이 흐름을 알면 5편에서 다루는 구독 해제 처리가 왜 `ctx.Done()`에 걸려 있는지 자연스럽게 이해됩니다.

## 동작 확인

서버를 띄우고 playground를 엽니다.

```bash
go run server.go
# connect to http://localhost:8080/ for GraphQL playground
```

```graphql
subscription OnCurrentTime {
    currentTime {
        unixTime
        timeStamp
    }
}
```

1초마다 값이 바뀌면 배관이 완성된 것입니다.

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

## 처음 만들 때 놓쳤던 것

- 오리진 검사를 끈 채로 두었습니다. 개발 중에는 편하지만 그대로 배포되면 보안 구멍입니다.
- 초기 버전은 요청이 올 때마다 `handler.New`로 서버 객체를 새로 만들었습니다. 스키마 파싱을 매 요청마다 반복하는 셈이고, 5편에서 보듯 구독자와 발행자가 서로 다른 객체를 보게 되는 원인이 됩니다. 지금은 프로세스에 하나만 만듭니다.
- 고루틴 정리를 `ctx`로 하지 않으면 누수가 생긴다는 것을 나중에 알았습니다. 구독 리졸버는 "채널을 돌려주는 함수"가 아니라 "구독의 수명을 관리하는 함수"로 봐야 합니다.

다음 편에서는 이 서버에 React와 Apollo Client를 연결합니다.

## Reference

- [gqlgen — Subscriptions](https://gqlgen.com/recipes/subscriptions)
- [graphql-transport-ws 프로토콜](https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md)
