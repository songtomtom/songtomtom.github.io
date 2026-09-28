---
title: "Channel Observer를 사용하여 구독 서비스 관리"
description: "Go 채널을 Observer 맵으로 관리해 commentAdded 구독 리졸버를 완성하고, 클라이언트는 subscribeToMore로 실시간 목록을 갱신합니다."
date: "2025-01-10"
project: gqlgen-apollo-subscriptions
order: 5
canonical: "https://medium.com/@songtomtom/channel-observer%EB%A5%BC-%EC%82%AC%EC%9A%A9%ED%95%98%EC%97%AC-%EA%B5%AC%EB%8F%85-%EC%84%9C%EB%B9%84%EC%8A%A4-%EA%B4%80%EB%A6%AC-0f00b4edea8b"
tags:
  - go
  - gqlgen
  - react
  - apollo-client
---

Observer 를 정의하고 `commentAdded` 구독(Subscription) 리졸버에서 클라이언트로 데이터를 전달하는 채널을 관리합니다.

## 서버 핸들러, 리졸버, 스키마 수정

`commentAdded` 스키마를 수정하고 `go run github.com/99designs/gqlgen generate` 리졸버를 수정합니다.

`schema.graphql`

```graphql
type Subscription {
    # AddedCommentInput 추가
    commentAdded(input: AddedCommentInput!): Comment!
}
```

`resolver.go`

```go
// CommentAdded is the resolver for the commentAdded field.
func (r *subscriptionResolver) CommentAdded(
	ctx context.Context,
	input model.AddedCommentInput,
) (<-chan *model.Comment, error) {
	panic(fmt.Errorf("not implemented: CommentAdded - commentAdded"))
}
```

Resolver 구조체에 `Observer map[string]chan *model.Comment` 추가 합니다.

`resolver.go`

```go
type Resolver struct {
	DB       *gorm.DB
	Observer map[string]chan *model.Comment // 추가
}
```

`observer` 를 선언하고 `main()` 내부에서 초기화 합니다.

`server.go`

```go
var observer map[string]chan *model.Comment

func main() {
	observer = map[string]chan *model.Comment{}
}
```

observer를 리졸버에서 사용하려면 Handler 함수를 수정해야 합니다.

`server.go`

```go
func query(
	db *gorm.DB,
	observer map[string]chan *model.Comment,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		srv := handler.NewDefaultServer(
			graph.NewExecutableSchema(
				graph.Config{
					Resolvers: &graph.Resolver{
						DB:       db,
						Observer: observer,
					},
				},
			),
		)
		srv.ServeHTTP(w, r)
	}
}

func subscription(
	db *gorm.DB,
	observer map[string]chan *model.Comment,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		srv := handler.New(
			graph.NewExecutableSchema(
				graph.Config{
					Resolvers: &graph.Resolver{
						DB:       db,
						Observer: observer,
					},
				},
			),
		)
		srv.AddTransport(
			// <---- This is the important part!
			&transport.Websocket{
				Upgrader: websocket.Upgrader{
					CheckOrigin: func(r *http.Request) bool {
						return true
					},
					ReadBufferSize:  1024,
					WriteBufferSize: 1024,
				},
			},
		)
		srv.ServeHTTP(w, r)
	}
}
```

`server.go` — http 핸들러 정의

```go
http.HandleFunc("/query", query(db, observer))
http.HandleFunc("/subscriptions", subscription(db, observer))
```

## CommentAdded 구독 리졸버 개발

클라이언트에서 `commentAdded` 구독(Subscription)을 호출 할때 마다 observer가 채널을 관리 할수 있게 합니다.

`resolver.go`

```go
// CommentAdded is the resolver for the commentAdded field.
func (r *subscriptionResolver) CommentAdded(
	ctx context.Context,
	input model.AddedCommentInput,
) (<-chan *model.Comment, error) {

	ch := make(chan *model.Comment)

	go func() {
		<-ctx.Done()
		delete(r.Observer, input.PostID)
	}()

	r.Observer[input.PostID] = ch

	return ch, nil
}
```

## CreateComment 리졸버 수정

Comment 를 생성하게 되면 `observer` 에 추가합니다.

`resolver.go`

```go
// CreateComment is the resolver for the createComment field.
func (r *mutationResolver) CreateComment(
	ctx context.Context,
	input model.CreateCommentInput,
) (*model.Comment, error) {
	_, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	comment := model.Comment{
		ID:      uuid.UUIDv4(),
		PostID:  input.PostID,
		Content: input.Content,
	}
	r.DB.Create(comment)

	for _, o := range r.Observer {
		o <- &comment
	}

	return &comment, nil
}
```

클라이언트에서 구독 GraphQL 정의

`App.tsx`

```tsx
// subscribeToMore 추가
const { data, loading, subscribeToMore } = useQuery(LIST_COMMENTS, {
  variables: { where: { postId: id } },
});
```

> 일반적으로 쿼리에 포함된 특정 필드를 구독하기 위해 `Subscription` 을 실행 할 수 있는 기능입니다. 이 함수는 구독을 종료하기 위해 호출할수 있는 다른 함수를 반환합니다.

구독 서비스를 Comment 목록에 적용하기 위해서 `useSubscription` 이 아닌 `useQuery` 에 `subscribeToMore` 를 사용합니다.

`App.tsx`

```tsx
const subscribeToNewComment = () => {
  return subscribeToMore({
    document: COMMENTS_SUBSCRIPTION,
    variables: {
      input: {
        postId: id,
      },
    },
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData.data) {
        return prev;
      }
      const {
        data: { commentAdded: newComment },
      } = subscriptionData;
      return Object.assign({}, prev, {
        comments: [newComment, ...prev.comments],
      });
    },
  });
};

useEffect(() => subscribeToNewComment(), []);
```

Comment 가 추가 될때 마다 구독을 하려면 `useEffect` 로 `subscribeToNewComment()` 호출 해야 합니다.

## 실시간 구독 서비스 실행

Comment 를 추가 할때 마다 실시간으로 Comment 목록에 추가 되는 것을 확인합니다.

![](./realtime-result.png)

## Reference

- [gqlgen — Subscriptions](https://gqlgen.com/recipes/subscription/)
- [Apollo GraphQL — Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions)

## Github

- [songtomtom/gqlgen-apollo-subscriptions](https://github.com/songtomtom/gqlgen-apollo-subscriptions)
