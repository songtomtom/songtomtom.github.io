---
title: "실시간 구독 서비스 리졸버 만들기"
description: "게시물과 댓글 스키마를 설계하고 MySQL과 gorm으로 저장하는 리졸버를 만듭니다. 리졸버 의존성을 어디서 만들어야 하는지, 왜 구독에도 저장소가 필요한지 설명합니다."
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

앞의 두 편으로 서버와 클라이언트 사이에 구독 통로가 생겼습니다. 이제 실제 도메인을 얹습니다. 게시물에 댓글이 달리면 그 게시물을 보고 있는 모든 사람에게 댓글이 실시간으로 나타나는 기능입니다. 이번 편은 저장 부분, 다음 두 편이 화면과 실시간 전달입니다.

## 왜 구독에 저장소가 필요한가

구독만 생각하면 저장소가 없어도 됩니다. 이벤트를 받아서 그대로 흘려보내면 되니까요. 하지만 사용자는 페이지를 나중에 열기도 합니다. 그 사람에게는 "지금부터의 댓글"이 아니라 "지금까지의 댓글"이 먼저 필요합니다. 그래서 구독 기능은 항상 "목록 조회 + 그 이후 변경 구독"의 짝으로 만들어야 하고, 목록 조회에는 저장소가 필요합니다. 4편에서 Apollo Client의 `subscribeToMore`가 정확히 이 짝을 다루는 도구입니다.

## 스키마 설계

`graph/schema.graphqls`

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
    comments(where: CommentsWhere!): [Comment!]!
}

type Mutation {
    createPost(input: CreatePostInput!): Post!
    createComment(input: CreateCommentInput!): Comment!
}

type Subscription {
    currentTime: Time!
    # postId 에 새 댓글이 달릴 때마다 그 댓글을 보낸다.
    commentAdded(input: AddedCommentInput!): Comment!
}

input CreatePostInput {
    id: ID!
}

input CreateCommentInput {
    postId: ID!
    content: String!
}

input AddedCommentInput {
    postId: ID!
}

input CommentsWhere {
    postId: ID!
}
```

설계에서 결정한 것들입니다.

- **`Post`는 id만 가집니다.** 예제의 관심사는 댓글 실시간 전달이므로 게시물 본문 같은 것은 일부러 뺐습니다.
- **`commentAdded`는 `postId`를 받습니다.** 구독자는 모든 댓글이 아니라 자기가 보고 있는 게시물의 댓글만 받아야 합니다. 이 인자가 5편에서 구독자를 게시물별로 묶는 키가 됩니다.
- **인자는 전부 `input` 타입으로 묶었습니다.** 나중에 필드가 늘어도 리졸버 시그니처가 바뀌지 않습니다. `createPost(id: ID!)`처럼 인자를 직접 나열하면 필드를 추가할 때마다 생성된 코드와 클라이언트 쿼리를 함께 고쳐야 합니다.
- **`comments`는 `[Comment!]!`입니다.** 목록에 null이 섞일 이유가 없으므로 요소도 non-null로 선언했습니다. 클라이언트 타입이 단순해집니다.

## MySQL 준비

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    container_name: example_mysql
    environment:
      MYSQL_USER: test
      MYSQL_PASSWORD: test
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: test
    ports:
      - 33006:3306
```

```bash
docker compose up -d
```

호스트 포트를 33006으로 둔 것은 로컬에 다른 MySQL이 3306을 쓰고 있을 가능성이 높기 때문입니다. 처음에는 `mysql:5.7`이었는데 Apple Silicon용 이미지가 없어서 8.0으로 올렸습니다.

## 연결과 마이그레이션

ORM은 gorm을 씁니다. gqlgen이 생성한 모델 구조체를 그대로 테이블에 매핑할 수 있어서 모델을 두 벌 관리하지 않아도 됩니다.

```bash
go get gorm.io/gorm gorm.io/driver/mysql
```

`server.go`

```go
const (
	defaultPort = "8080"
	// docker-compose.yml 의 MySQL 설정과 맞춘 기본값. 운영에서는 DSN 환경 변수로 덮어쓴다.
	defaultDSN = "test:test@tcp(127.0.0.1:33006)/test?charset=utf8mb4&parseTime=True&loc=Local"
)

func main() {
	port := envOr("PORT", defaultPort)
	dsn := envOr("DSN", defaultDSN)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	if err = db.AutoMigrate(&model.Post{}, &model.Comment{}); err != nil {
		log.Fatalf("failed to auto migrate schema: %v", err)
	}
	// ...
}
```

`AutoMigrate`는 구조체를 보고 테이블을 만들거나 컬럼을 추가합니다. 예제와 초기 개발에는 충분하지만 컬럼 삭제나 타입 변경은 하지 않으므로 운영에서는 마이그레이션 도구를 따로 쓰는 것이 맞습니다. 접속 정보는 처음에 코드에 박아 두었는데, 환경 변수로 덮어쓸 수 있게 바꿨습니다.

## 리졸버 의존성은 한 번만 만든다

리졸버가 DB에 접근하려면 `Resolver` 구조체에 DB를 넣어 주어야 합니다. `graph/resolver.go`는 `generate`가 덮어쓰지 않는 파일이라 여기에 의존성을 둡니다.

`graph/resolver.go`

```go
// Resolver 는 모든 리졸버가 공유하는 의존성이다.
// 서버 시작 시 한 번 만들어지고, 요청마다 새로 만들지 않는다.
type Resolver struct {
	DB       *gorm.DB
	Observer *Observer
}
```

`server.go`

```go
resolver := &graph.Resolver{
	DB:       db,
	Observer: graph.NewObserver(),
}
schema := graph.NewExecutableSchema(graph.Config{Resolvers: resolver})
srv := handler.New(schema)
```

"한 번만 만든다"를 강조하는 이유가 있습니다. 처음 버전은 HTTP 핸들러 안에서 요청마다 `Resolver`와 스키마를 새로 만들었습니다. 쿼리와 뮤테이션만 있을 때는 낭비일 뿐 동작은 합니다. 하지만 5편의 Observer처럼 요청 사이에 공유되어야 하는 상태가 생기면, 구독 요청이 만든 Observer와 뮤테이션 요청이 만든 Observer가 서로 다른 객체가 되어 이벤트가 전달되지 않습니다. 의존성은 프로세스 수명과 같이 가야 합니다.

## 리졸버 구현

`graph/schema.resolvers.go`

```go
func (r *mutationResolver) CreatePost(ctx context.Context, input model.CreatePostInput) (*model.Post, error) {
	post := model.Post{ID: input.ID}
	if err := r.DB.WithContext(ctx).Create(&post).Error; err != nil {
		return nil, fmt.Errorf("create post: %w", err)
	}
	return &post, nil
}

func (r *mutationResolver) CreateComment(ctx context.Context, input model.CreateCommentInput) (*model.Comment, error) {
	comment := model.Comment{
		ID:      uuid.UUIDv4(),
		PostID:  input.PostID,
		Content: input.Content,
	}
	if err := r.DB.WithContext(ctx).Create(&comment).Error; err != nil {
		return nil, fmt.Errorf("create comment: %w", err)
	}

	// 5편에서 채운다. 저장이 끝난 뒤 구독자에게 발행한다.
	r.Observer.Publish(input.PostID, &comment)

	return &comment, nil
}

func (r *queryResolver) Comments(ctx context.Context, where model.CommentsWhere) ([]*model.Comment, error) {
	var comments []*model.Comment
	if err := r.DB.WithContext(ctx).Where("post_id = ?", where.PostID).Find(&comments).Error; err != nil {
		return nil, fmt.Errorf("list comments: %w", err)
	}
	return comments, nil
}
```

세 가지를 고쳐 가며 배운 것이 있습니다.

- **`WithContext(ctx)`를 넘깁니다.** 클라이언트가 요청을 취소하면 gqlgen이 ctx를 취소하고, gorm은 진행 중인 쿼리를 중단합니다. 처음에는 `context.WithTimeout`으로 새 컨텍스트를 만들어 놓고 정작 gorm에 넘기지 않아서 아무 효과가 없었습니다.
- **`Create`에는 포인터를 넘깁니다.** 값을 넘기면 gorm이 자동 생성된 필드를 구조체에 되돌려 쓰지 못합니다.
- **에러를 확인합니다.** 원래 코드는 `r.DB.Create(post)`의 반환값을 버렸습니다. 저장에 실패해도 클라이언트는 성공 응답을 받고, 5편에서 붙일 발행까지 일어나서 존재하지 않는 댓글이 구독자에게 전달됩니다. 저장이 성공한 뒤에만 발행해야 합니다.

`CommentAdded` 구독 리졸버는 아직 뼈대만 있습니다. 뮤테이션과 구독을 잇는 부분은 5편에서 만듭니다.

## 확인

```bash
go run server.go
```

playground에서 순서대로 실행합니다.

```graphql
mutation CreatePost {
    createPost(input: {id: "test_post_id"}) {
        id
    }
}
```

```graphql
mutation CreateComment {
    createComment(input: {postId: "test_post_id", content: "test_hello~"}) {
        id
        postId
        content
    }
}
```

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
      }
    ]
  }
}
```

저장과 조회가 되면 다음 편에서 이 셋을 React 화면에 붙입니다.

## Reference

- [gqlgen — Subscriptions](https://gqlgen.com/recipes/subscription/)
- [gorm — Connecting to a Database](https://gorm.io/docs/connecting_to_the_database.html)
