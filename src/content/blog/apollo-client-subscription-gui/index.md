---
title: "Apollo Client로 구독 서비스 GUI 만들기"
description: "React Hooks와 Apollo Client의 useMutation, useQuery로 Post와 Comment를 다루는 화면을 만듭니다."
date: "2025-01-10"
project: gqlgen-apollo-subscriptions
order: 4
canonical: "https://medium.com/@songtomtom/apollo-client%EB%A1%9C-%EA%B5%AC%EB%8F%85-%EC%84%9C%EB%B9%84%EC%8A%A4-gui-%EB%A7%8C%EB%93%A4%EA%B8%B0-9e47985325d0"
tags:
  - react
  - apollo-client
  - graphql
---

## Schema, Resolver 수정

UUID 자동생성하는 방식에서 사용자의 입력값을 받도록 GraphQL Schema, Resolver를 수정합니다.

`schema.graphql`

```graphql
input CreatePostInput{ # 추가
    id: ID!
}

type Mutation {
    createPost(input: CreatePostInput!):Post! # 수정
    createComment(input: CreateCommentInput!): Comment!
}
```

`resolver.go`

```go
// CreatePost is the resolver for the createPost field.
func (r *mutationResolver) CreatePost(
	ctx context.Context,
	input model.CreatePostInput,
) (*model.Post, error) {
	_, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	post := model.Post{
		ID: input.ID, // 수정
	}
	r.DB.Create(post)

	return &post, nil
}
```

## 클라이언트 GraphQL 정의

다음 Post, Comment 관련 Mutation, Query GraphQL 을 정의합니다.

`App.tsx`

```tsx
const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;

const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      postId
      content
    }
  }
`;

const LIST_COMMENTS = gql`
  query ListComments($where: CommentsWhere!) {
    comments(where: $where) {
      id
      postId
      content
    }
  }
`;
```

## Hooks 개발

다음 `useState` 코드를 입력합니다.

`App.tsx`

```tsx
const [id, setId] = useState<string>('songtomtom');
const [content, setContent] = useState<string>('Hello~!');
```

다음 `useMutation`, `useQuery` 정의합니다.

`App.tsx`

```tsx
const [createPost] = useMutation(CREATE_POST, {
  variables: { input: { id } },
});

const [createComment] = useMutation(CREATE_COMMENT, {
  variables: { input: { postId: id, content } },
});

const { data, loading } = useQuery(LIST_COMMENTS, {
  variables: { where: { postId: id } },
});
```

`<input>`, `<button>` 태그 `onClick`, `onChange` Callback 함수를 입력합니다.

`App.tsx`

```tsx
const onCreatePostClick = async () => {
  const { data } = await createPost();
  if (data) {
    // Do something
  }
};

const onCreateCommentClick = async () => {
  const { data } = await createComment();
  if (data) {
    // Do something
  }
};

const onIdChange = (e: ChangeEvent<HTMLInputElement>) => {
  setId(e.target.value);
};

const onContentChange = (e: ChangeEvent<HTMLInputElement>) => {
  setContent(e.target.value);
};
```

## JSX 작성

Hooks 에서 정의한 State, Callback 함수를 입력합니다.

`App.tsx`

```tsx
return (
    <div>
      <div>
        <input type="text" onChange={onIdChange} value={id} />
        id
        <br />
        <input type="text" onChange={onContentChange} value={content} />
        content
      </div>

      <button onClick={onCreatePostClick}>create post</button>
      <button onClick={onCreateCommentClick}>create comment</button>
      <ul>
        {!loading &&
            data.comments.map((item: any, index: number) => {
              return (
                  <li key={index}>
                    <small>{item.postId}</small>: <strong>{item.content}</strong>
                  </li>
              );
            })}
      </ul>
    </div>
);
```

## GraphQL 테스트

정상 동작 하는지 확인합니다.

![](./gui-test.png)

## Reference

- [gqlgen — Subscriptions](https://gqlgen.com/recipes/subscription/)
- [Apollo GraphQL — Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions)

## Github

- [songtomtom/gqlgen-apollo-subscriptions](https://github.com/songtomtom/gqlgen-apollo-subscriptions)
