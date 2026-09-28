---
title: "Apollo Client 클라이언트 WebSocket Link 연결"
description: "React 클라이언트에 Apollo Client를 설정하고 HTTP와 WebSocket Link를 분리해 gqlgen 구독 서버에 연결합니다."
date: "2025-01-10"
project: gqlgen-apollo-subscriptions
order: 2
canonical: "https://medium.com/@songtomtom/apollo-client-%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8-websocket-link-%EC%97%B0%EA%B2%B0-f2aebc2376a5"
tags:
  - react
  - apollo-client
  - graphql
  - websocket
---

## Client App 설치

React 보일러 플레이트를 설치합니다.

```bash
yarn create react-app client --template typescript
```

typescript 와 Subscription에 필요한 GraphQL 관련 모듈을 설치합니다.

```bash
cd client
yarn add typescript @types/node @types/react @types/react-dom @types/jest
yarn add @apollo/client graphql graphql-ws
```

## Apollo Client 초기화

GraphQLWsLink 로 HttpLink 주소를 분리하세요.

> 주소의 분리는 Apollo GraphQL 에서 권장하고 있습니다.

`App.tsx` — httpLink 와 wsLink 분리

```tsx
const httpLink = new HttpLink({
  uri: 'http://localhost:8080/graphql'
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:8080/subscriptions',
}));
```

서버에서 /subscriptions 앤드포인트를 추가하세요.

`server.go` — subscriptions handler

```go
http.HandleFunc("/subscriptions", func(w http.ResponseWriter, r *http.Request) {
	srv := handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))
	srv.AddTransport(
		&transport.Websocket{
			Upgrader: websocket.Upgrader{
				CheckOrigin: func(r *http.Request) bool {
					return true
				},
				ReadBufferSize:  1024,
				WriteBufferSize: 1024,
			},
		},
	) // <---- This is the important part!
	srv.ServeHTTP(w, r)
})
```

App.tsx 파일을 만들고 Subscription GraphQL 을 정의 하세요.

`App.tsx` — CURRENT_TIME_SUBSCRIPTION

```tsx
const CURRENT_TIME_SUBSCRIPTION = gql`
  subscription OnCurrentTime {
    currentTime {
      unixTime
      timeStamp
    }
  }
`;

function App() {
  const { data, loading } = useSubscription(CURRENT_TIME_SUBSCRIPTION);
  return <h4>New current time: {!loading && data.currentTime.timeStamp}</h4>;
}
```

## Server 시작

```bash
go run server.go

connect to http://localhost:8080/ for GraphQL playground
```

## Client 시작

```bash
cd client
yarn start

Compiled successfully!

You can now view client in the browser.

  Local:            http://localhost:3000

Note that the development build is not optimized.
To create a production build, use yarn build.

webpack compiled successfully
No issues found.
```

클라이언트에서 매 초마다 구독(Subscriptions)하는 것을 확인합니다.

- [http://localhost:3000](http://localhost:3000/)

```text
New current time: 2023-01-17T12:21:43+09:00
...
New current time: 2023-01-17T12:21:59+09:00
...
```

## Reference

- [Apollo GraphQL — Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions)

## Github

- [songtomtom/gqlgen-apollo-subscriptions](https://github.com/songtomtom/gqlgen-apollo-subscriptions)
