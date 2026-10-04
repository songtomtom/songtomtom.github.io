---
title: "Apollo Client 클라이언트 WebSocket Link 연결"
description: "Apollo Client에서 HTTP 링크와 WebSocket 링크를 나누는 이유, split으로 작업 종류에 따라 링크를 고르는 방법, 그리고 graphql-ws 프로토콜 선택과 오리진 문제를 다룹니다."
date: "2025-01-10"
series: gqlgen-apollo-subscriptions
order: 2
canonical: "https://medium.com/@songtomtom/apollo-client-%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8-websocket-link-%EC%97%B0%EA%B2%B0-f2aebc2376a5"
category: frontend
tags:
  - react
  - apollo-client
  - graphql
  - websocket
---

1편에서 만든 서버는 playground에서만 확인했습니다. 실제 화면은 React로 만들 것이므로 이번 편에서는 Apollo Client를 서버에 연결합니다. 핵심은 "쿼리와 뮤테이션은 HTTP로, 구독은 WebSocket으로" 보내도록 링크를 나누는 것입니다.

## 왜 링크를 나누는가

WebSocket 하나로 모든 요청을 보낼 수도 있습니다. 그런데도 나누는 이유가 있습니다.

- HTTP 요청은 상태가 없습니다. CDN 캐시, 로드밸런서, 재시도, 타임아웃 같은 인프라가 그대로 적용됩니다. 쿼리와 뮤테이션은 이 성질을 그대로 누리는 편이 낫습니다.
- WebSocket은 연결을 유지해야 하므로 서버 인스턴스에 붙습니다. 구독처럼 연결이 꼭 필요한 작업만 이 비용을 치르게 합니다.
- 장애 격리가 됩니다. WebSocket 연결이 끊겨 재접속하는 동안에도 쿼리와 뮤테이션은 영향을 받지 않습니다.

Apollo 공식 문서도 같은 구성을 권장합니다.

## 클라이언트 프로젝트 생성

```bash
yarn create react-app client --template typescript
cd client
yarn add @apollo/client graphql graphql-ws
```

`graphql-ws`는 graphql-transport-ws 프로토콜의 클라이언트 구현입니다. 예전 자료에 나오는 `subscriptions-transport-ws`는 더 이상 관리되지 않는 옛 프로토콜이라 쓰지 않습니다. 서버 쪽 gqlgen이 새 프로토콜을 기본으로 지원하므로 양쪽이 같은 프로토콜로 맞습니다.

## 링크 구성

`client/src/index.tsx`

```tsx
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({
  uri: 'http://localhost:8080/query',
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:8080/subscriptions',
  }),
);

// 작업이 subscription 이면 wsLink, 아니면 httpLink 로 보낸다.
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

`split`은 요청마다 첫 번째 함수를 실행해 참이면 두 번째 링크, 거짓이면 세 번째 링크로 보냅니다. `getMainDefinition`이 문서에서 실행 대상 작업을 찾아 주므로, 작업 종류가 `subscription`인지만 보면 됩니다.

`GraphQLWsLink`는 연결을 게으르게 엽니다. 첫 구독이 시작될 때 WebSocket을 열고, 마지막 구독이 끝나면 닫습니다. 구독을 쓰지 않는 화면에서는 연결이 아예 생기지 않습니다.

## 서버 쪽에서 맞춰야 할 것

브라우저에서 `localhost:3000`이 `localhost:8080`으로 WebSocket을 열면 서버에 `Origin: http://localhost:3000` 헤더가 갑니다. 1편에서 허용 오리진에 `localhost:3000`을 넣어 둔 이유입니다. 이 설정이 없으면 핸드셰이크가 403으로 거부되고, 브라우저 콘솔에는 원인이 잘 드러나지 않는 "WebSocket connection failed"만 찍힙니다. 처음에 이 문제로 시간을 꽤 썼습니다.

HTTP 쪽은 일반적인 CORS입니다. 서버에서 `rs/cors`로 허용 오리진을 열어 둡니다.

## 구독 컴포넌트

배관을 확인하는 용도로 `currentTime` 구독을 화면에 붙입니다.

`client/src/App.tsx`

```tsx
const CURRENT_TIME_SUBSCRIPTION = gql`
  subscription OnCurrentTime {
    currentTime {
      unixTime
      timeStamp
    }
  }
`;

function CurrentTime() {
  const { data, loading, error } = useSubscription(CURRENT_TIME_SUBSCRIPTION);
  if (loading) return <p>connecting...</p>;
  if (error) return <p>error: {error.message}</p>;
  return <p>New current time: {data.currentTime.timeStamp}</p>;
}
```

`useSubscription`은 컴포넌트가 마운트될 때 구독을 시작하고 언마운트될 때 해제합니다. 서버 입장에서는 언마운트 시점에 `complete` 메시지가 오고, 1편의 리졸버에서 `ctx.Done()`이 닫히는 것이 바로 이 순간입니다.

## 실행

터미널 두 개를 씁니다.

```bash
go run server.go
# connect to http://localhost:8080/ for GraphQL playground
```

```bash
cd client && yarn start
# Local: http://localhost:3000
```

화면에 시각이 1초마다 바뀌면 됩니다. 브라우저 개발자 도구의 Network 탭에서 WS 필터를 걸면 `connection_init`, `connection_ack`, `subscribe`, `next` 메시지가 순서대로 오가는 것을 볼 수 있습니다. 프로토콜 흐름을 눈으로 확인하기에 이 방법이 가장 빠릅니다.

## 주의할 점

- WebSocket 주소는 `ws://`이고, HTTPS 환경에서는 `wss://`여야 합니다. 혼합 콘텐츠 정책 때문에 HTTPS 페이지에서 `ws://`는 브라우저가 막습니다.
- 개발 서버 주소를 코드에 넣어 두었지만 실제로는 환경 변수로 빼야 합니다. CRA는 `REACT_APP_` 접두사를 붙인 변수만 노출합니다.
- 인증이 필요한 서비스라면 `createClient`의 `connectionParams`로 토큰을 보내고, 서버의 `InitFunc`에서 검증합니다. 이 예제에서는 다루지 않습니다.

다음 편에서는 시각 대신 실제 도메인인 게시물과 댓글을 저장하는 리졸버를 만듭니다.

## Reference

- [Apollo GraphQL — Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions)
- [graphql-ws](https://github.com/enisdenjo/graphql-ws)
