---
title: "testify suite와 testcontainers로 MySQL 통합 테스트하기"
description: "MySQL 저장소 구현을 진짜 MySQL로 검증합니다. testcontainers-go로 컨테이너를 띄우고 suite로 수명을 관리하며, 메모리 구현과 MySQL 구현이 같은 계약 테스트를 통과하게 만드는 방법과 CI 구성을 정리합니다."
date: "2026-09-28T12:20"
series: go-testify-testing
order: 3
category: backend
tags:
  - go
  - testing
  - testify
  - testcontainers
  - mysql
---

1편과 2편은 서비스 로직을 다뤘고 저장소는 메모리 구현이나 mock이었습니다. 이번 편은 실제 MySQL 구현을 테스트합니다. SQL 문의 컬럼 순서, `DATETIME` 정밀도, `RowsAffected`가 0일 때의 처리는 진짜 데이터베이스가 있어야만 확인됩니다. 테스트가 MySQL을 직접 띄우게 만들고, 그 수명을 testify의 `suite`로 관리합니다.

## 왜 컨테이너인가

통합 테스트용 데이터베이스를 두는 방식은 대개 셋입니다.

- **개발자 PC의 로컬 MySQL**: 각자 버전과 설정이 달라 "내 컴퓨터에서는 되는데"가 생기고, CI에는 없습니다.
- **공유 테스트 DB**: 두 사람이 동시에 돌리면 서로의 데이터를 봅니다.
- **테스트가 직접 띄우는 컨테이너**: 버전이 코드에 박히고, 테스트마다 격리되며, Docker만 있으면 어디서나 같습니다.

testcontainers-go는 세 번째를 Go 코드 몇 줄로 만들어 줍니다. 대가는 컨테이너 기동 시간입니다. 이 프로젝트에서 MySQL 8.0 컨테이너는 약 12초 걸립니다. 그래서 테스트마다 띄우지 않고 스위트 전체가 하나를 공유합니다.

## MySQL 구현

`internal/store/mysql/mysql.go`

```go
func (s *Store) Migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS todos (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(100) NOT NULL,
  done       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME(6)  NOT NULL
)`)
	return err
}

func (s *Store) Get(ctx context.Context, id int64) (todo.Todo, error) {
	var t todo.Todo
	err := s.db.QueryRowContext(ctx,
		`SELECT id, title, done, created_at FROM todos WHERE id = ?`, id).
		Scan(&t.ID, &t.Title, &t.Done, &t.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return todo.Todo{}, todo.ErrNotFound
	}
	if err != nil {
		return todo.Todo{}, fmt.Errorf("select todo: %w", err)
	}
	return t, nil
}

func (s *Store) Update(ctx context.Context, t todo.Todo) error {
	res, err := s.db.ExecContext(ctx,
		`UPDATE todos SET title = ?, done = ? WHERE id = ?`, t.Title, t.Done, t.ID)
	if err != nil {
		return fmt.Errorf("update todo: %w", err)
	}
	return notFoundIfNoRows(res)
}

// 영향받은 행이 0 이면 그 id 가 없는 것이다. 값이 같아서 0 인 경우는 이 예제에 없다(done 을 뒤집거나 제목을 바꾼다).
func notFoundIfNoRows(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return todo.ErrNotFound
	}
	return nil
}
```

테스트가 잡아야 할 지점이 코드에 몇 군데 있습니다.

- `sql.ErrNoRows`를 도메인의 `ErrNotFound`로 바꾸는 부분. 이걸 빼먹으면 서비스는 `database/sql` 오류를 그대로 받고 핸들러는 404 대신 500을 냅니다.
- `DATETIME(6)`. 괄호의 6이 없으면 MySQL은 초 단위로 잘라 저장하고, 테스트에서 `time.Time`을 비교하면 마이크로초가 사라져 실패합니다.
- `RowsAffected() == 0`을 없음으로 해석하는 판단. 주석에 적은 대로 "같은 값으로 UPDATE"하면 MySQL은 영향받은 행을 0으로 보고하므로, 이 규칙은 값이 항상 바뀌는 이 예제에서만 성립합니다.

## 계약 테스트

MySQL 테스트를 쓰기 전에, 메모리 구현과 MySQL 구현이 **같은 테스트**를 통과하게 만들었습니다. 저장소 인터페이스가 약속하는 동작을 한 곳에 적어 두고 두 구현에 각각 돌립니다.

`internal/store/storetest/contract.go`

```go
// Factory 는 테스트 케이스마다 깨끗한 저장소를 돌려준다.
type Factory func(t *testing.T) todo.Repository

func RunContract(t *testing.T, newRepo Factory) {
	t.Helper()
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)

	t.Run("Create 는 ID 를 부여하고 Get 으로 같은 값을 읽는다", func(t *testing.T) {
		repo := newRepo(t)
		ctx := context.Background()

		created, err := repo.Create(ctx, todo.Todo{Title: "운동", CreatedAt: now})
		require.NoError(t, err)
		assert.NotZero(t, created.ID)

		got, err := repo.Get(ctx, created.ID)
		require.NoError(t, err)
		assert.Equal(t, created.ID, got.ID)
		assert.Equal(t, "운동", got.Title)
		assert.False(t, got.Done)
		assert.True(t, got.CreatedAt.Equal(now), "CreatedAt 은 저장 전후가 같아야 한다: %v", got.CreatedAt)
	})

	t.Run("없는 id 는 ErrNotFound", func(t *testing.T) {
		repo := newRepo(t)
		ctx := context.Background()

		_, err := repo.Get(ctx, 9999)
		assert.ErrorIs(t, err, todo.ErrNotFound)
		assert.ErrorIs(t, repo.Update(ctx, todo.Todo{ID: 9999, Title: "x"}), todo.ErrNotFound)
		assert.ErrorIs(t, repo.Delete(ctx, 9999), todo.ErrNotFound)
	})
	// Update, List 순서, Delete ...
}
```

메모리 구현은 한 줄로 붙습니다.

`internal/store/memory/memory_test.go`

```go
func TestContract(t *testing.T) {
	storetest.RunContract(t, func(t *testing.T) todo.Repository { return memory.New() })
}
```

`CreatedAt` 비교에 `assert.Equal` 대신 `got.CreatedAt.Equal(now)`를 쓴 이유가 있습니다. MySQL 드라이버가 돌려주는 `time.Time`은 `Location`이 다를 수 있어서 `==`로는 같은 순간도 다르다고 나옵니다. `time.Time.Equal`은 순간을 비교합니다. 이 계약 테스트가 없었다면 메모리 구현에서는 통과하고 MySQL에서만 실패하는 미묘한 차이를 놓쳤을 것입니다.

패키지 이름이 `storetest`이고 `_test.go`가 아닌 것도 의도입니다. 다른 패키지의 테스트가 import 해야 하므로 일반 패키지여야 합니다. 프로덕션 코드가 이 패키지를 import 할 일은 없으니 바이너리에 들어가지 않습니다.

## suite로 컨테이너 수명 관리

`internal/store/mysql/mysql_test.go`

```go
// MySQLSuite 는 컨테이너 하나를 스위트 전체가 공유하고, 케이스마다 테이블만 비운다.
// 컨테이너 기동이 수십 초라 케이스마다 띄우면 감당이 안 된다.
type MySQLSuite struct {
	suite.Suite
	container *tcmysql.MySQLContainer
	store     *mysql.Store
}

func (s *MySQLSuite) SetupSuite() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	container, err := tcmysql.Run(ctx, "mysql:8.0",
		tcmysql.WithDatabase("test"),
		tcmysql.WithUsername("test"),
		tcmysql.WithPassword("test"),
	)
	s.Require().NoError(err, "MySQL 컨테이너 시작")
	s.container = container

	dsn, err := container.ConnectionString(ctx, "parseTime=true")
	s.Require().NoError(err)

	store, err := mysql.Open(ctx, dsn)
	s.Require().NoError(err)
	s.Require().NoError(store.Migrate(ctx))
	s.store = store
}

func (s *MySQLSuite) TearDownTest() {
	// 케이스 사이의 격리. 4편(싱글턴)에서 본 오염을 여기서는 이렇게 막는다.
	s.Require().NoError(s.store.Truncate(context.Background()))
}

func (s *MySQLSuite) TearDownSuite() {
	if s.store != nil {
		s.store.Close()
	}
	if s.container != nil {
		s.Require().NoError(s.container.Terminate(context.Background()))
	}
}

func (s *MySQLSuite) TestContract() {
	storetest.RunContract(s.T(), func(t *testing.T) todo.Repository {
		require.NoError(t, s.store.Truncate(context.Background()))
		return s.store
	})
}

func TestMySQLSuite(t *testing.T) {
	if testing.Short() {
		t.Skip("-short 에서는 컨테이너 테스트를 건너뛴다")
	}
	suite.Run(t, new(MySQLSuite))
}
```

`suite`가 주는 것은 수명 주기 훅입니다.

| 훅 | 시점 | 이 프로젝트에서 |
|---|---|---|
| `SetupSuite` | 스위트 시작 시 한 번 | 컨테이너 기동, 연결, 마이그레이션 |
| `SetupTest` | 각 테스트 전 | 안 씀 |
| `TearDownTest` | 각 테스트 후 | `TRUNCATE` |
| `TearDownSuite` | 스위트 끝 | 연결 닫기, 컨테이너 종료 |

표준 `testing`으로도 `TestMain`과 `t.Cleanup`으로 같은 것을 만들 수 있지만, 스위트 단위와 테스트 단위의 준비·정리를 한 타입 안에 나란히 두는 것이 읽기 쉽습니다. `s.Require()`는 `require`와 같고, 스위트 안에서는 `s.T()`를 넘길 필요 없이 바로 씁니다.

`tcmysql.Run`은 이미지를 받아 컨테이너를 띄우고 MySQL이 접속을 받을 때까지 기다린 뒤 돌아옵니다. "기다린다"가 핵심입니다. `docker run` 직후에는 MySQL이 아직 초기화 중이라 접속이 거부되는데, testcontainers의 MySQL 모듈은 로그와 포트를 보고 준비될 때까지 대기합니다. 직접 만들면 매번 재시도 루프를 쓰게 되는 부분입니다.

`ConnectionString(ctx, "parseTime=true")`의 파라미터가 없으면 `DATETIME`이 `[]byte`로 스캔되어 `time.Time` 필드에 넣을 때 오류가 납니다.

## 실행 결과

```bash
go test -run 'TestMySQLSuite' ./internal/store/mysql/ -v
```

```text
=== RUN   TestMySQLSuite
=== RUN   TestMySQLSuite/TestContract
=== RUN   TestMySQLSuite/TestContract/Create_는_ID_를_부여하고_Get_으로_같은_값을_읽는다
=== RUN   TestMySQLSuite/TestContract/없는_id_는_ErrNotFound
=== RUN   TestMySQLSuite/TestContract/Update_는_title_과_done_을_바꾼다
=== RUN   TestMySQLSuite/TestContract/List_는_ID_순서로_전부_돌려준다
=== RUN   TestMySQLSuite/TestContract/Delete_뒤에는_Get_이_ErrNotFound
=== RUN   TestMySQLSuite/TestCreatedAtKeepsMicroseconds
--- PASS: TestMySQLSuite (12.94s)
    --- PASS: TestMySQLSuite/TestContract (0.14s)
    --- PASS: TestMySQLSuite/TestCreatedAtKeepsMicroseconds (0.02s)
PASS
```

스위트 전체 13초 중 테스트 자체는 0.2초이고 나머지가 컨테이너 기동입니다. 케이스마다 띄웠다면 케이스 여섯 개에 1분이 넘었을 것입니다.

`TestCreatedAtKeepsMicroseconds`는 `DATETIME(6)`을 지키는지 검증하는 테스트입니다. 스키마에서 `(6)`을 지우면 이 테스트가 실패합니다.

## 빠른 테스트와 느린 테스트 나누기

컨테이너 테스트는 Docker가 필요하고 느립니다. `-short` 플래그로 건너뛰게 해 두면 개발 중에는 1초짜리 단위 테스트만 돌리고, 커밋 전이나 CI에서 전부 돌립니다.

```bash
go test -short ./...   # 컨테이너 없이, 약 1초
go test ./...          # 전부, 약 15초
```

`//go:build integration` 빌드 태그로 파일째 분리하는 방법도 있는데, 그러면 태그 없이는 컴파일조차 안 되어 IDE에서 오류가 보이지 않는 단점이 있습니다. `testing.Short()`는 컴파일은 항상 되고 실행만 건너뜁니다.

## CI

`.github/workflows/ci.yml`

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod
      - run: test -z "$(gofmt -l .)"
      - run: go vet ./...
      # ubuntu-latest 에는 Docker 가 있어 testcontainers 가 MySQL 컨테이너를 띄울 수 있다.
      - run: go test -race ./...
```

GitHub의 `ubuntu-latest` 러너에는 Docker가 있어서 별도 서비스 컨테이너 설정 없이 testcontainers가 그대로 동작합니다. 첫 실행은 이미지를 받느라 1분 남짓 걸리고 이후는 캐시됩니다.

## 만들면서 확인한 것

- `DATETIME`의 기본 정밀도가 초 단위라는 것은 전에 당해 본 함정이라 처음부터 `DATETIME(6)`으로 썼습니다. 대신 누군가 스키마를 고치면 바로 드러나도록 마이크로초를 검증하는 `TestCreatedAtKeepsMicroseconds`를 따로 두었습니다.
- `CreatedAt` 비교를 `assert.Equal`로 두면 드라이버가 돌려주는 `time.Time`의 `Location`이 달라 같은 순간도 다르다고 나옵니다. 계약 테스트는 `time.Time.Equal`로 비교하고 메시지에 실제 값을 찍어, 두 구현 중 어느 쪽에서 무엇이 달랐는지 바로 보이게 했습니다.
- `TearDownTest`에서 `TRUNCATE`를 하는데, 계약 테스트는 하나의 테스트 메서드 안에서 `t.Run`으로 여러 케이스를 돌리므로 케이스 사이에는 `TearDownTest`가 불리지 않습니다. `Factory`가 저장소를 돌려주기 전에 직접 `Truncate`하도록 해서 케이스마다 비웠습니다. 스위트 훅의 단위가 "테스트 메서드"이지 "서브테스트"가 아니라는 점을 여기서 확인했습니다.

## 시리즈를 마치며

세 편에서 쓴 도구를 문제별로 정리하면 이렇습니다.

| 문제 | 도구 |
|---|---|
| 실패 메시지가 빈약하다 | `assert` (diff 자동) |
| 준비 실패가 엉뚱한 검증 실패로 보인다 | `require` |
| 저장소 오류 상황을 만들 수 없다 | `mock` + `On().Return(err)` |
| 저장소를 부르지 않아야 한다 | `mock` + `AssertNotCalled` |
| 두 구현이 같게 동작해야 한다 | 계약 테스트 |
| 진짜 DB 가 필요하다 | testcontainers |
| 느린 자원을 테스트들이 공유해야 한다 | `suite` |

가장 큰 교훈은 "가짜의 층위"입니다. 메모리 구현으로 되면 그걸 쓰고, 오류 상황과 호출 여부만 mock으로, SQL 자체는 진짜 DB로. 층마다 다른 도구를 쓰되 서비스는 그중 무엇이 끼워졌는지 몰라야 합니다. 그것이 되려면 저장소가 인터페이스여야 하고, 인터페이스에는 계약 테스트가 있어야 합니다.

## Reference

- [testify — suite](https://pkg.go.dev/github.com/stretchr/testify/suite)
- [testcontainers-go — MySQL module](https://golang.testcontainers.org/modules/mysql/)
- [Go — testing.Short](https://pkg.go.dev/testing#Short)
- [MySQL — Fractional Seconds in Time Values](https://dev.mysql.com/doc/refman/8.0/en/fractional-seconds.html)
