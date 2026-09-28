---
title: "실시간 구독 서비스 리졸버 만들기"
description: "commentAdded 구독을 위한 스키마를 정의하고 MySQL과 gorm으로 Post, Comment 저장소와 리졸버를 구현합니다."
date: "2025-01-10"
project: gqlgen-apollo-subscriptions
order: 3
canonical: "https://medium.com/@songtomtom/%EC%8B%A4%EC%8B%9C%EA%B0%84-%EA%B5%AC%EB%8F%85-%EC%84%9C%EB%B9%84%EC%8A%A4-%EB%A6%AC%EC%A1%B8%EB%B2%84-%EB%A7%8C%EB%93%A4%EA%B8%B0-89a90b092ac7"
tags:
  - go
  - gqlgen
  - gorm
  - mysql
---

## commentAdded 구독 이해

> `commentAdded` 구독은 특정 블로그 게시물에 새 댓글이 추가될 때마다 구독 클라이언트에게 알립니다.

Apollo Client Subscription 예제 구현을 위해 GraphQL 스키마를 정의합니다.

`schema.graphql` — commentAdded 스키마

```graphql
type Post {
    id: ID!
}

type Comment {
    id: ID!
    postId: ID!
    content: String!
}

type Query {
    comments(where:CommentsWhere!): [Comment]!
}

type Mutation {
    createPost:Post!
    createComment(input: CreateCommentInput!): Comment!
}

type Subscription {
    commentAdded:Comment!
}

input CreateCommentInput{
    postId: ID!
    content: String!
}

input CommentsWhere {
    postId: ID!
}
```

- `createComment`: Comment 생성
- `comments`: Comment 리스트
- `commentAdded`: Comment 가 추가될 때마다 클라이언트에 구독 정보를 전달

## MySQL 컨테이너 실행

`docker-compose.yml` — mysql 올리기

```yaml
version: "3.7"

services:
  mysql:
    image: mysql:5.7
    container_name: example_mysql
    environment:
      MYSQL_USER: test
      MYSQL_PASSWORD: test
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: test
    ports:
      - 33006:3306
```

docker-compose를 up 하고 MySQL 을 시작 합니다.

```bash
docker-compose -f ./docker-compose.yml up --build -d
```

성공할 경우:

```text
CONTAINER ID   IMAGE       COMMAND                  CREATED             STATUS             PORTS                                NAMES
306240f2708d   mysql:5.7   "docker-entrypoint.s…"   About an hour ago   Up About an hour   33060/tcp, 0.0.0.0:33006->3306/tcp   example_mysql
```

## MySQL 연결

[gorm](https://gorm.io/) 과 MySQL 드라이버를 설치합니다.

```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql
```

MySQL을 연결합니다.

`server.go` — dsn로 mysql 연결하기

```go
	dsn := "test:test@tcp(127.0.0.1:33006)/test?charset=utf8mb4&parseTime=True&loc=Local"

	// refer https://github.com/go-sql-driver/mysql#dsn-data-source-name for details
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
```

GraphQL 스키마로 table 을 생성합니다.

`server.go` — gorm 으로 마이그레이션

```go
	if err = db.AutoMigrate(&model.Post{}, &model.Comment{}); err != nil {
		log.Fatalf("failed to auto migration schema: %v", err)
	}
```

## Handler 코드 수정

`server.go` — 핸들러 코드 수정

```go
package main

import (
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/websocket"
	"github.com/songtomtom/gqlgen-apollo-subscriptions/graph/model"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/songtomtom/gqlgen-apollo-subscriptions/graph"
)

const defaultPort = "8080"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	dsn := "test:test@tcp(127.0.0.1:33006)/test?charset=utf8mb4&parseTime=True&loc=Local"

	// refer https://github.com/go-sql-driver/mysql#dsn-data-source-name for details
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err = db.AutoMigrate(&model.Post{}, &model.Comment{}); err != nil {
		log.Fatalf("failed to auto migration schema: %v", err)
	}

	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.HandleFunc("/query", query(db))
	http.HandleFunc("/subscriptions", subscription(db))

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func query(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{DB: db}}))
		srv.ServeHTTP(w, r)
	}

}

func subscription(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		srv := handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{DB: db}}))
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

## Resolver 구현

`resolver.go` — 구독이 추가된 resolver

```go

// CreatePost is the resolver for the createPost field.
func (r *mutationResolver) CreatePost(ctx context.Context) (
	*model.Post,
	error,
) {
	_, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	post := model.Post{
		ID: uuid.UUIDv4(),
	}
	r.DB.Create(post)

	return &post, nil
}

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

	return &comment, nil
}

// Comments is the resolver for the comments field.
func (r *queryResolver) Comments(
	ctx context.Context,
	where model.CommentsWhere,
) ([]*model.Comment, error) {
	_, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var comments []*model.Comment
	r.DB.Where("post_id = ?", where.PostID).Find(&comments)

	return comments, nil
}

// CommentAdded is the resolver for the commentAdded field.
func (r *subscriptionResolver) CommentAdded(ctx context.Context) (
	<-chan *model.Comment,
	error,
) {
	// TODO
	panic(fmt.Errorf("not implemented: CommentAdded - commentAdded"))
}
```

CommentAdded 리졸버는 다음 포스트에서 구현합니다.

## GraphQL 테스트

```bash
go run server.go

connect to http://localhost:8080/ for GraphQL playground
```

## Post Mutation 테스트

```graphql
mutation CreatePost {
    createPost(input: {id: "test_post_id"}) {
        id
    }
}
```

```json
{
  "data": {
    "createPost": {
      "id": "test_post_id"
    }
  }
}
```

## Comment Mutation 테스트

```graphql
mutation CreateComment {
    createComment(input: {postId: "test_post_id", content: "test_hello~"}) {
        id
        postId
        content
    }
}
```

```json
{
  "data": {
    "createComment": {
      "id": "test_comment_id",
      "postId": "test_post_id",
      "content": "test_hello~"
    }
  }
}
```

## Comments Query 테스트

```graphql
query ListComments {
    comments(where: {postId: "test_post_id"}) {
        id
        postId
        content
    }
}
```

```json
{
  "data": {
    "comments": [
      {
        "id": "0b501dff-7d61-4c4a-8f20-a75cfda64461",
        "postId": "test_post_id",
        "content": "test_hello~"
      },
      {
        "id": "2fec1731-b1a1-441d-97e6-a26c1b15145a",
        "postId": "test_post_id",
        "content": "test_hello~"
      }
    ]
  }
}
```

## Reference

- [gqlgen — Subscriptions](https://gqlgen.com/recipes/subscription/)
- [Apollo GraphQL — Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions)

## Github

- [songtomtom/gqlgen-apollo-subscriptions](https://github.com/songtomtom/gqlgen-apollo-subscriptions)
