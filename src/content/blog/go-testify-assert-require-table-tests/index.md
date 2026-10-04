---
title: "testify assert와 require, 테이블 테스트로 서비스 로직 검증하기"
description: "표준 testing만 쓸 때 실패 메시지가 왜 부족한지, assert와 require를 어느 자리에 쓰는지 실제 실패 출력으로 비교하고, 시각을 주입한 서비스를 테이블 테스트와 t.Parallel로 검증합니다."
date: "2026-09-28T12:00"
series: go-testify-testing
order: 1
category: backend
tags:
  - go
  - testing
  - testify
---

Go의 `testing` 패키지는 단순해서 좋습니다. 그런데 `if got != want { t.Errorf(...) }`를 수십 번 쓰다 보면 두 가지가 불편해집니다. 실패했을 때 무엇이 어떻게 달랐는지 메시지를 매번 직접 만들어야 하고, 앞의 검증이 실패했을 때 뒤의 검증을 계속할지 멈출지를 `t.Fatalf`와 `t.Errorf`로 일일이 고릅니다. testify는 이 둘을 `assert`와 `require`로 정리합니다.

이 시리즈는 할 일 REST 서비스 하나를 대상으로 testify의 `assert`, `require`, `mock`, `suite`를 어디에 왜 쓰는지 정리합니다. 이번 편은 서비스 로직의 단위 테스트, 2편은 저장소 모킹, 3편은 MySQL 컨테이너 통합 테스트입니다. 전체 코드는 [songtomtom/go-testify-testing](https://github.com/songtomtom/go-testify-testing)에 있습니다.

## 대상 코드

서비스는 저장소 인터페이스에 의존하고, 검증과 규칙만 갖습니다.

`internal/todo/todo.go`

```go
type Repository interface {
	Create(ctx context.Context, t Todo) (Todo, error)
	Get(ctx context.Context, id int64) (Todo, error)
	List(ctx context.Context) ([]Todo, error)
	Update(ctx context.Context, t Todo) error
	Delete(ctx context.Context, id int64) error
}

// Clock 은 시각을 주입하기 위한 함수 타입. 테스트에서 고정 시각을 넣는다.
type Clock func() time.Time

type Service struct {
	repo Repository
	now  Clock
}

func NewService(repo Repository, now Clock) *Service {
	if now == nil {
		now = time.Now
	}
	return &Service{repo: repo, now: now}
}

// NormalizeTitle 은 앞뒤 공백을 지우고 연속 공백을 하나로 줄인다.
func NormalizeTitle(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func validateTitle(title string) error {
	if title == "" {
		return ErrEmptyTitle
	}
	if utf8.RuneCountInString(title) > MaxTitleLen {
		return ErrTitleTooLong
	}
	return nil
}

func (s *Service) Create(ctx context.Context, title string) (Todo, error) {
	title = NormalizeTitle(title)
	if err := validateTitle(title); err != nil {
		return Todo{}, err
	}
	return s.repo.Create(ctx, Todo{Title: title, CreatedAt: s.now()})
}
```

테스트하기 좋게 만든 결정이 두 개 있습니다.

- **시각을 주입합니다.** `time.Now()`를 직접 부르면 `CreatedAt`을 정확히 비교할 수 없어서 "대략 지금"으로 검증하게 됩니다. `Clock`을 생성자로 받으면 테스트는 고정 시각을 넣고 `assert.Equal`로 비교합니다.
- **저장소는 인터페이스입니다.** 이번 편은 메모리 구현으로 테스트하고, 2편에서 mock으로 바꿉니다.

## assert와 require의 차이

둘은 같은 함수 목록을 갖고 있고, 실패했을 때의 행동만 다릅니다.

- `assert.Equal(t, want, got)`: 실패를 기록하고 **계속 진행**합니다. `t.Errorf`에 해당합니다.
- `require.Equal(t, want, got)`: 실패를 기록하고 **즉시 중단**합니다. `t.FailNow`에 해당합니다.

어느 쪽을 쓸지 기준은 "이 검증이 실패하면 뒤의 검증이 의미가 있는가"입니다. 실제 출력으로 보면 차이가 분명합니다. 일부러 틀린 기대값을 넣은 테스트입니다.

```go
func TestDemoAssert(t *testing.T) {
	got := todo.NormalizeTitle("  우유   사기 ")
	assert.Equal(t, "우유  사기", got)
	assert.Len(t, got, 3)
	t.Log("assert 는 실패해도 여기까지 온다")
}

func TestDemoRequire(t *testing.T) {
	got := todo.NormalizeTitle("  우유   사기 ")
	require.Equal(t, "우유  사기", got)
	t.Log("require 는 실패하면 여기 오지 않는다")
}
```

```text
--- FAIL: TestDemoAssert (0.00s)
    zz_fail_demo_test.go:14:
        	Error Trace:	.../internal/todo/zz_fail_demo_test.go:14
        	Error:      	Not equal:
        	            	expected: "우유  사기"
        	            	actual  : "우유 사기"

        	            	Diff:
        	            	--- Expected
        	            	+++ Actual
        	            	@@ -1 +1 @@
        	            	-우유  사기
        	            	+우유 사기
        	Test:       	TestDemoAssert
    zz_fail_demo_test.go:15:
        	Error:      	"우유 사기" should have 3 item(s), but has 13
        	Test:       	TestDemoAssert
    zz_fail_demo_test.go:16: assert 는 실패해도 여기까지 온다
--- FAIL: TestDemoRequire (0.00s)
    zz_fail_demo_test.go:21:
        	Error:      	Not equal:
        	            	expected: "우유  사기"
        	            	actual  : "우유 사기"
        	            	...
```

세 가지가 보입니다.

- `assert`는 두 검증이 모두 기록되고 마지막 로그까지 찍혔습니다. `require`는 첫 검증에서 끝나 로그가 없습니다.
- 실패 메시지에 expected와 actual, 그리고 diff가 자동으로 들어갑니다. 표준 패키지로 이 출력을 만들려면 매번 `t.Errorf("got %q, want %q", got, want)`를 써야 하고, 긴 구조체는 diff가 없어서 어디가 다른지 눈으로 찾아야 합니다.
- `assert.Len`의 메시지 "should have 3 item(s), but has 13"은 문자열 길이가 바이트 단위라는 것도 드러냅니다. 한글 네 글자와 공백 하나가 13바이트입니다. `MaxTitleLen`을 `utf8.RuneCountInString`으로 세는 이유가 여기 있습니다.

## 테이블 테스트

같은 함수에 입력만 다른 케이스가 여러 개면 테이블로 씁니다.

`internal/todo/service_test.go`

```go
var fixedNow = time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

func newService() *todo.Service {
	return todo.NewService(memory.New(), func() time.Time { return fixedNow })
}

func TestService_Create(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		title     string
		wantTitle string
		wantErr   error
	}{
		{name: "정상", title: "우유 사기", wantTitle: "우유 사기"},
		{name: "공백을 정리해서 저장", title: "  우유   사기 ", wantTitle: "우유 사기"},
		{name: "빈 제목", title: "", wantErr: todo.ErrEmptyTitle},
		{name: "공백만 있는 제목", title: "   ", wantErr: todo.ErrEmptyTitle},
		{name: "100자는 허용", title: strings.Repeat("가", 100), wantTitle: strings.Repeat("가", 100)},
		{name: "101자는 거부", title: strings.Repeat("가", 101), wantErr: todo.ErrTitleTooLong},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			svc := newService()

			got, err := svc.Create(context.Background(), tt.title)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantTitle, got.Title)
			assert.False(t, got.Done)
			assert.Equal(t, fixedNow, got.CreatedAt)
			assert.NotZero(t, got.ID)
		})
	}
}
```

구조를 하나씩 보면 이렇습니다.

- **케이스 이름은 문장으로.** 실패하면 `TestService_Create/101자는_거부`처럼 출력되어 무엇이 깨졌는지 이름만으로 압니다. `case1`, `case2`는 실패 로그를 읽을 때 아무 도움이 안 됩니다.
- **경계값을 넣습니다.** 100자와 101자. 상한이 있는 규칙은 그 상한과 상한 바로 위를 둘 다 넣어야 `>`와 `>=`를 헷갈린 버그가 잡힙니다.
- **`require.ErrorIs`로 오류 종류를 검사합니다.** 문자열 비교가 아니라 `errors.Is`이므로, 서비스가 오류를 래핑해도 통과합니다.
- **성공 경로는 `require.NoError` 다음에 `assert`로.** 오류가 났으면 나머지 필드는 볼 필요가 없으니 `require`, 오류가 없으면 필드 네 개를 전부 검사해 한 번에 다 보고받으니 `assert`입니다.
- **케이스마다 새 서비스를 만듭니다.** `newService()`를 루프 밖에서 한 번만 만들면 케이스가 서로의 데이터를 봅니다.

## t.Parallel

바깥과 안쪽 `t.Run` 양쪽에 `t.Parallel()`이 있습니다. 바깥은 이 테스트 함수를 다른 함수와 병렬로, 안쪽은 케이스끼리 병렬로 돌리라는 뜻입니다. 케이스마다 서비스를 새로 만들기 때문에 공유 상태가 없고, 그래서 병렬이 안전합니다.

Go 1.22부터는 루프 변수가 반복마다 새로 만들어지므로 예전처럼 `tt := tt`를 쓸 필요가 없습니다. 1.21 이하를 지원해야 한다면 그 줄이 없으면 모든 케이스가 마지막 값으로 돌아가는 버그가 납니다.

`-race` 플래그로 돌리면 병렬 케이스가 실수로 상태를 공유하는지 잡아 줍니다. CI에서는 항상 켭니다.

```bash
go test -race ./...
```

## 흐름이 있는 테스트

테이블로 안 되는 것도 있습니다. 만들고, 뒤집고, 다시 뒤집는 순서가 있는 경우입니다.

```go
func TestService_Toggle(t *testing.T) {
	t.Parallel()
	svc := newService()
	ctx := context.Background()

	created, err := svc.Create(ctx, "운동")
	require.NoError(t, err) // 여기서 실패하면 아래는 의미가 없으므로 require

	toggled, err := svc.Toggle(ctx, created.ID)
	require.NoError(t, err)
	assert.True(t, toggled.Done)

	again, err := svc.Toggle(ctx, created.ID)
	require.NoError(t, err)
	assert.False(t, again.Done, "두 번 뒤집으면 원래대로")

	_, err = svc.Toggle(ctx, 9999)
	assert.ErrorIs(t, err, todo.ErrNotFound)
}
```

준비 단계의 오류는 전부 `require`입니다. 준비가 실패했는데 검증까지 가면 준비 실패가 아니라 엉뚱한 검증 실패로 보고되어 원인을 찾기 어렵습니다. `assert`의 마지막 인자에 메시지를 넣을 수 있는데, 값만 보고는 의도를 알기 어려운 검증에만 씁니다.

## 검증 실패가 저장소를 건드리지 않는가

규칙 하나를 더 테스트했습니다. 제목 검증에 실패하면 저장소는 바뀌지 않아야 합니다.

```go
func TestService_Rename(t *testing.T) {
	// ...
	_, err = svc.Rename(ctx, created.ID, "")
	assert.ErrorIs(t, err, todo.ErrEmptyTitle)

	// 검증 실패는 저장소를 건드리지 않아야 한다
	got, err := svc.Get(ctx, created.ID)
	require.NoError(t, err)
	assert.Equal(t, "아침 운동", got.Title)
}
```

메모리 저장소로는 "바뀌지 않았다"를 다시 읽어서 확인할 수밖에 없습니다. "저장소가 한 번도 불리지 않았다"를 직접 검증하려면 mock이 필요하고, 그것이 2편입니다.

## 만들면서 확인한 것

- 실패 출력을 채집하려고 일부러 틀린 테스트를 돌려 보니 `assert.Len`이 한글 다섯 글자를 13이라고 셌습니다. `len`은 바이트 수라는 걸 알고는 있었지만, 제목 길이 제한을 `len(title)`로 구현했다면 한글 34자에서 거부됐을 것입니다. `MaxTitleLen` 검사를 `utf8.RuneCountInString`으로 두고, 100자와 101자 경계 케이스를 한글로 넣어 그 실수를 테스트가 잡게 했습니다.
- 성공 경로의 필드 검증을 전부 `require`로 쓰면 첫 필드만 실패해도 나머지 결과를 못 봅니다. 한 번 실행에 네 필드의 결과를 다 받도록 `require.NoError` 다음은 `assert`로 두는 규칙을 정했습니다.

## 한계와 다음 편

- 메모리 저장소로는 저장소가 오류를 돌려주는 상황을 만들 수 없습니다. 연결이 끊겼을 때 서비스가 오류를 제대로 올리는지는 이번 편에서 검증하지 못했습니다.
- "저장소를 부르지 않았다"를 간접적으로만 확인했습니다.

두 가지 모두 2편의 `mock`으로 해결합니다.

## Reference

- [testify — assert](https://pkg.go.dev/github.com/stretchr/testify/assert)
- [testify — require](https://pkg.go.dev/github.com/stretchr/testify/require)
- [Go — Table driven tests](https://go.dev/wiki/TableDrivenTests)
- [Go 1.22 — loop variable semantics](https://go.dev/blog/loopvar-preview)
