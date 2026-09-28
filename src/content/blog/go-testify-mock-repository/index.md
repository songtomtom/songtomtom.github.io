---
title: "testify mock으로 저장소 인터페이스 모킹하기"
description: "메모리 구현으로는 만들 수 없는 저장소 오류와 호출 여부를 testify/mock으로 검증합니다. mock을 손으로 쓰는 방법, On·Return·Run·MatchedBy의 역할, 그리고 Return에 함수를 넣었다가 겪은 panic을 정리합니다."
date: "2026-09-28T12:10"
project: go-testify-testing
order: 2
category: backend
tags:
  - go
  - testing
  - testify
  - mock
---

1편의 테스트는 메모리 저장소를 썼습니다. 진짜처럼 동작하는 가짜라 대부분의 경우에 충분하고, 사실 이쪽을 먼저 써야 합니다. 그런데 메모리 저장소로는 못 만드는 상황이 둘 있습니다. 저장소가 오류를 돌려줄 때 서비스가 어떻게 하는지, 그리고 서비스가 저장소를 **부르지 않아야 하는** 경우에 정말 안 부르는지입니다. 이 둘을 위해 testify의 `mock`을 씁니다.

## mock을 손으로 쓰기

`mockery` 같은 생성기도 있지만, 인터페이스가 메서드 다섯 개면 손으로 쓰는 편이 빠르고 무엇이 일어나는지 보입니다.

`internal/todo/mock_repository_test.go`

```go
// MockRepository 는 testify/mock 으로 손으로 쓴 가짜 저장소.
// 메서드마다 mock.Called 로 인자를 기록하고, 테스트가 On(...) 으로 정한 값을 돌려준다.
type MockRepository struct {
	mock.Mock
}

var _ todo.Repository = (*MockRepository)(nil)

func (m *MockRepository) Create(ctx context.Context, t todo.Todo) (todo.Todo, error) {
	args := m.Called(ctx, t)
	return args.Get(0).(todo.Todo), args.Error(1)
}

func (m *MockRepository) Get(ctx context.Context, id int64) (todo.Todo, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(todo.Todo), args.Error(1)
}

func (m *MockRepository) Update(ctx context.Context, t todo.Todo) error {
	return m.Called(ctx, t).Error(0)
}
// List, Delete 도 같은 모양
```

구조는 단순합니다. `mock.Mock`을 임베드하고, 각 메서드는 받은 인자를 `m.Called`에 넘긴 뒤 돌아온 `Arguments`에서 반환값을 꺼냅니다. `args.Get(0).(todo.Todo)`의 타입 단언이 이 방식의 약점인데, 아래에서 실제로 한 번 당했습니다.

`var _ todo.Repository = (*MockRepository)(nil)`은 mock이 인터페이스를 다 구현했는지 컴파일 시점에 확인하는 관용구입니다. 인터페이스에 메서드가 추가되면 여기서 컴파일 오류가 나서, mock을 안 고치고 넘어가는 일을 막습니다.

파일 이름이 `_test.go`인 것도 의도입니다. mock은 테스트에만 필요하므로 프로덕션 바이너리에 들어갈 이유가 없습니다.

## 저장소 오류를 서비스가 올리는가

`internal/todo/service_mock_test.go`

```go
func TestService_Toggle_RepositoryError(t *testing.T) {
	t.Parallel()
	repo := new(MockRepository)
	svc := todo.NewService(repo, nil)
	ctx := context.Background()
	boom := errors.New("connection reset")

	repo.On("Get", ctx, int64(1)).Return(todo.Todo{ID: 1, Title: "운동"}, nil)
	repo.On("Update", ctx, mock.MatchedBy(func(t todo.Todo) bool { return t.ID == 1 && t.Done })).
		Return(boom)

	_, err := svc.Toggle(ctx, 1)

	require.ErrorIs(t, err, boom)
	repo.AssertExpectations(t)
}
```

- **`On("Get", ctx, int64(1))`**: 이 메서드가 이 인자로 불리면 `Return`의 값을 돌려주라는 선언입니다. 인자는 `==`로 비교하므로 `1`이 아니라 `int64(1)`이어야 합니다. `int`로 쓰면 매칭되지 않고 "no matching call" panic이 납니다.
- **`mock.MatchedBy`**: 정확한 값 대신 조건으로 매칭합니다. `Update`에 넘어오는 `Todo`가 `ID == 1`이고 `Done`이 뒤집혔는지 검사합니다. 서비스가 `Get`으로 읽은 것을 제대로 수정해서 넘겼는지가 여기서 검증됩니다.
- **`AssertExpectations`**: `On`으로 선언한 호출이 전부 실제로 일어났는지 확인합니다. 이게 없으면 서비스가 `Update`를 아예 안 불러도 테스트가 통과합니다.

`boom`은 이 테스트에서만 존재하는 오류입니다. 서비스가 저장소 오류를 삼키거나 다른 오류로 바꾸면 `ErrorIs`가 실패합니다.

## 부르지 않았다는 것을 검증

1편에서 간접적으로만 확인했던 규칙입니다.

```go
func TestService_Rename_InvalidTitleDoesNotTouchRepository(t *testing.T) {
	t.Parallel()
	repo := new(MockRepository)
	svc := todo.NewService(repo, nil)

	_, err := svc.Rename(context.Background(), 1, "   ")

	require.ErrorIs(t, err, todo.ErrEmptyTitle)
	// 검증에서 걸렸으면 저장소는 한 번도 불리지 않아야 한다.
	repo.AssertNotCalled(t, "Get", mock.Anything, mock.Anything)
	repo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
}
```

`On`을 하나도 선언하지 않은 mock입니다. 서비스가 실수로 저장소를 부르면 두 가지 방식으로 잡힙니다. 선언되지 않은 호출이라 `Called`에서 panic이 나거나, `AssertNotCalled`가 실패합니다. 검증을 저장소 접근보다 먼저 하는 것이 서비스의 규칙이고, 이 테스트가 그 규칙을 지킵니다.

## 넘어온 인자를 붙잡기

서비스가 저장소에 **무엇을** 넘겼는지 보고 싶을 때가 있습니다. 정리된 제목과 주입한 시각이 제대로 넘어가는지입니다.

```go
func TestService_Create_PassesNormalizedTitleAndClock(t *testing.T) {
	t.Parallel()
	repo := new(MockRepository)
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	svc := todo.NewService(repo, func() time.Time { return now })
	ctx := context.Background()

	// Run 으로 저장소에 실제로 넘어온 값을 붙잡아 두고, 반환값은 고정한다.
	// Return 에 함수를 넣어도 testify 는 그 함수를 호출해 주지 않는다. 함수 자체가 반환값이 된다.
	var passed todo.Todo
	repo.On("Create", ctx, mock.AnythingOfType("todo.Todo")).
		Run(func(args mock.Arguments) { passed = args.Get(1).(todo.Todo) }).
		Return(todo.Todo{ID: 42, Title: "우유 사기", CreatedAt: now}, nil)

	got, err := svc.Create(ctx, "  우유   사기 ")

	require.NoError(t, err)
	assert.Equal(t, int64(42), got.ID)
	assert.Equal(t, "우유 사기", passed.Title, "정리된 제목이 저장소로 넘어가야 한다")
	assert.Equal(t, now, passed.CreatedAt, "주입한 시각이 쓰여야 한다")
	assert.Zero(t, passed.ID, "ID 는 저장소가 정한다")
	repo.AssertNumberOfCalls(t, "Create", 1)
}
```

`Run`은 호출이 일어날 때 실행되는 콜백입니다. 인자를 지역 변수에 복사해 두고 나중에 검증합니다. `MatchedBy`로도 같은 검사를 할 수 있지만, 실패했을 때 `MatchedBy`는 "매칭되는 호출이 없다"고만 하고 `Run`으로 붙잡은 값은 `assert.Equal`이 diff를 보여 줍니다. 여러 필드를 검사할 때는 `Run`이 낫습니다.

### Return에 함수를 넣었다가

이 테스트를 처음 쓸 때는 이렇게 했습니다.

```go
// 처음 버전. 동작하지 않는다.
repo.On("Create", ctx, mock.AnythingOfType("todo.Todo")).
	Return(func(_ context.Context, t todo.Todo) todo.Todo {
		t.ID = 42
		return t
	}, nil)
```

"넘어온 값에 ID만 붙여서 돌려주면 되겠지"라는 생각이었는데, 실행하면 panic이 납니다.

```text
panic: interface conversion: interface {} is func(context.Context, todo.Todo) todo.Todo, not todo.Todo
```

testify의 `Return`은 값을 그대로 저장할 뿐 함수를 호출해 주지 않습니다. `args.Get(0)`에 함수가 들어 있고, mock 메서드의 `.(todo.Todo)` 단언에서 터진 것입니다. `mockery`가 생성한 mock은 반환 타입이 함수면 호출해 주는 코드를 넣어 주지만, 손으로 쓴 mock에는 그런 것이 없습니다. 동적으로 반환값을 만들려면 `Run`에서 값을 계산해 두거나, mock 메서드 안에서 `args.Get(0)`이 함수인지 검사하는 코드를 직접 써야 합니다.

## 인자 매처 정리

| 매처 | 쓰는 때 |
|---|---|
| 값 그대로 (`int64(1)`) | 정확히 그 값이어야 할 때. 타입까지 맞아야 한다 |
| `mock.Anything` | 인자를 신경 쓰지 않을 때. `ctx`에 주로 쓴다 |
| `mock.AnythingOfType("todo.Todo")` | 타입만 맞으면 될 때. 문자열이라 오타를 컴파일러가 못 잡는다 |
| `mock.MatchedBy(func(x T) bool)` | 조건으로 고를 때. 타입 안전하다 |

`ctx`를 값으로 매칭하면 서비스가 `context.WithTimeout`으로 자식 컨텍스트를 만들어 넘기는 순간 깨집니다. 이 예제의 서비스는 받은 `ctx`를 그대로 넘기므로 값 매칭이 통과하지만, 실무에서는 `mock.Anything`이 안전합니다.

## HTTP 계층은 httptest로

핸들러 테스트는 mock이 아니라 메모리 저장소와 `httptest.Server`를 씁니다. 핸들러의 책임은 요청을 파싱하고 서비스 오류를 상태 코드로 바꾸는 것이라, 진짜 서비스를 붙여야 그 매핑을 검증할 수 있습니다.

`internal/todo/handler_test.go`

```go
func TestHandler_ErrorMapping(t *testing.T) {
	t.Parallel()
	srv := newServer(t)

	tests := []struct {
		name   string
		method string
		path   string
		body   string
		want   int
	}{
		{name: "빈 제목은 400", method: http.MethodPost, path: "/todos", body: `{"title":""}`, want: http.StatusBadRequest},
		{name: "깨진 JSON 은 400", method: http.MethodPost, path: "/todos", body: `{`, want: http.StatusBadRequest},
		{name: "없는 id 는 404", method: http.MethodGet, path: "/todos/999", want: http.StatusNotFound},
		{name: "숫자가 아닌 id 는 404", method: http.MethodGet, path: "/todos/abc", want: http.StatusNotFound},
		{name: "없는 id 토글은 404", method: http.MethodPost, path: "/todos/999/toggle", want: http.StatusNotFound},
	}
	// ...
}
```

`newServer`는 `t.Cleanup(srv.Close)`로 서버를 정리합니다. `defer`가 아니라 `t.Cleanup`인 이유는 헬퍼 함수가 반환된 뒤에도 테스트가 끝날 때 실행되어야 하기 때문입니다.

## mock을 쓰지 말아야 할 때

mock은 강력해서 남용하기 쉽습니다. 이 프로젝트에서 지킨 기준입니다.

- **진짜처럼 동작하는 가짜가 있으면 그걸 씁니다.** 메모리 저장소로 되는 테스트를 mock으로 쓰면 `On` 선언이 곧 구현의 복사본이 되어, 서비스 내부 호출 순서를 바꿀 때마다 테스트도 바뀝니다.
- **mock은 경계에서만.** 저장소, 외부 API, 시계처럼 프로세스 밖에 있는 것을 대신할 때만 씁니다. 서비스 안의 함수를 mock 하기 시작하면 테스트가 구현을 그대로 베끼게 됩니다.
- **`AssertExpectations`를 빼먹지 않습니다.** 없으면 "저장소를 불렀어야 하는데 안 불렀다"가 통과합니다.

## 한계와 다음 편

메모리 저장소와 mock으로 서비스는 다 검증했지만, 정작 MySQL 구현은 아직 한 줄도 테스트하지 않았습니다. `INSERT` 문의 컬럼 순서가 틀렸는지, `DATETIME`이 `time.Time`으로 제대로 읽히는지는 진짜 MySQL이 있어야 압니다. 3편에서 testcontainers로 컨테이너를 띄우고 `suite`로 묶습니다.

## Reference

- [testify — mock](https://pkg.go.dev/github.com/stretchr/testify/mock)
- [mockery](https://vektra.github.io/mockery/)
- [Go — httptest](https://pkg.go.dev/net/http/httptest)
