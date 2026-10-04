---
title: "벡터 검색 하나 때문에 시작된 PostgreSQL 전환"
description: "문서 검색 봇에 임베딩 검색이 필요해지자 MySQL로는 답이 없었습니다. ent 설정에 Driver 필드 하나를 넣어 서비스 하나만 PostgreSQL로 보내고, pgvector 확장과 HNSW 인덱스를 ent 마이그레이션 사이에 끼워 넣은 과정, 그리고 옮기고 나서 손에 들어온 확장들을 정리합니다."
date: "2026-09-28T14:00"
series: mysql-to-postgres-on-kubernetes
order: 1
category: backend
tags:
  - postgresql
  - pgvector
  - go
  - ent
---

여러 서비스가 MySQL 하나를 쓰고 있었습니다. 1년쯤 운영한 시점에 사내 문서를 찾아 주는 채팅 봇을 만들게 됐고, 문서를 청크로 잘라 임베딩을 저장한 뒤 질문과 가까운 청크를 찾아야 했습니다. 벡터 검색입니다. MySQL 9에 VECTOR 타입은 있었지만 근사 최근접 탐색 인덱스가 없어서 수십만 청크에서 전체 스캔을 해야 했고, 별도 벡터 DB를 두면 인프라가 하나 더 늘었습니다. PostgreSQL의 pgvector는 확장 하나로 타입, 거리 연산자, HNSW 인덱스를 다 줍니다.

그래서 봇 서비스 하나만 PostgreSQL로 보냈습니다. 그것이 여섯 달 뒤 전면 전환의 시작이 됐는데, 이번 편은 그 첫 서비스에서 한 일입니다. 2편은 인프라 쪽 이야기입니다. 코드는 [songtomtom/mysql-to-postgres-on-kubernetes](https://github.com/songtomtom/mysql-to-postgres-on-kubernetes)의 `app/`에 같은 패턴으로 다시 만들어 두었습니다.

## 서비스 하나만 옮기는 방법

전부 한 번에 옮길 수는 없었습니다. 다른 서비스들은 MySQL에서 잘 돌고 있었고, 각자 일정이 있었습니다. 필요한 것은 "같은 설정 코드로 두 DB를 다루되, 옮긴 서비스만 값을 바꾸는" 구조였습니다. 공유 설정에 필드 하나를 넣었습니다.

`app/internal/db/config.go`

```go
type Driver string

const (
	DriverMySQL    Driver = "mysql"
	DriverPostgres Driver = "postgres"
)

type Config struct {
	Driver   Driver // 비어 있으면 MySQL
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string // PostgreSQL 전용. 비어 있으면 disable
}

func (c Config) driver() Driver {
	if c.Driver == "" {
		return DriverMySQL
	}
	return c.Driver
}

// DriverName 은 database/sql 에 넘길 드라이버 이름이다.
func (c Config) DriverName() string {
	if c.driver() == DriverPostgres {
		return "postgres"
	}
	return "mysql"
}

// Dialect 는 ent 에 넘길 방언이다.
func (c Config) Dialect() string {
	if c.driver() == DriverPostgres {
		return dialect.Postgres
	}
	return dialect.MySQL
}
```

**기본값이 MySQL**인 것이 핵심입니다. 필드를 추가한 커밋이 기존 서비스에 아무 영향도 주지 않아야 했습니다. 옮기는 서비스만 `Driver: DriverPostgres`를 설정하고 드라이버 import를 `lib/pq`로 바꿉니다. ent는 방언 문자열만 다르게 받으면 되므로 스키마와 쿼리 코드는 그대로입니다.

DSN 조립은 드라이버마다 다릅니다.

```go
func (c Config) DSN() string {
	if c.driver() == DriverPostgres {
		ssl := c.SSLMode
		if ssl == "" {
			ssl = "disable"
		}
		u := url.URL{
			Scheme:   "postgres",
			User:     url.UserPassword(c.User, c.Password),
			Host:     fmt.Sprintf("%s:%d", c.Host, c.Port),
			Path:     c.Database,
			RawQuery: "sslmode=" + ssl,
		}
		return u.String()
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4",
		c.User, c.Password, c.Host, c.Port, c.Database)
}
```

이 함수의 첫 버전은 `fmt.Sprintf`에 `url.PathEscape`로 사용자와 비밀번호를 넣었습니다. 테이블 테스트에 `p@ss`를 비밀번호로 넣었더니 바로 실패했습니다.

```text
expected: "postgres://u:p%40ss@localhost:5432/app?sslmode=disable"
actual  : "postgres://u:p@ss@localhost:5432/app?sslmode=disable"
```

`PathEscape`는 경로용이라 `@`를 그대로 둡니다. 결과 DSN에서 호스트 경계가 깨집니다. `url.URL`에 `url.UserPassword`로 넣으면 userinfo 규칙대로 이스케이프됩니다. 비밀번호에 특수문자가 들어가는 순간 터지는 버그라, 운영에서 만났다면 원인을 찾는 데 한참 걸렸을 것입니다.

## pgvector 컬럼을 ent에

ent는 pgvector를 모릅니다. 대신 `field.Other`로 임의 타입을 선언하고 `SchemaType`으로 컬럼 타입을 직접 줄 수 있습니다.

`app/internal/ent/schema/document.go`

```go
func (Document) Fields() []ent.Field {
	return []ent.Field{
		field.String("source").
			NotEmpty().
			Comment("문서 출처 (파일 이름 등)"),
		field.Int("chunk_index").
			Comment("문서 안에서 청크 순서"),
		field.Text("content").
			NotEmpty(),
		field.Other("embedding", pgvector.Vector{}).
			SchemaType(map[string]string{
				dialect.Postgres: "vector(4)",
			}).
			Comment("예제라서 4차원. 실제로는 임베딩 모델 차원(예: 1536)"),
	}
}
```

`pgvector.Vector`는 pgvector-go 패키지의 타입으로 `database/sql`의 `Scanner`와 `Valuer`를 구현하고 있어서 ent가 그대로 읽고 씁니다. 차원은 컬럼 타입에 박히므로 임베딩 모델을 바꾸면 컬럼도 바뀌어야 합니다. 실제 서비스에서는 OpenAI `text-embedding-3-small`의 1536을 썼고, 예제는 손으로 값을 넣어 검증할 수 있게 4차원입니다.

`SchemaType`에 `dialect.Postgres`만 있는 것도 의미가 있습니다. 이 스키마는 MySQL에서 마이그레이션이 되지 않습니다. 이 서비스는 PostgreSQL 전용이라는 것을 코드가 말합니다.

## 확장과 인덱스를 마이그레이션 사이에

ent의 `Schema.Create`는 테이블과 일반 인덱스를 만들어 주지만 두 가지를 모릅니다. `CREATE EXTENSION`과 HNSW 인덱스입니다. 순서가 중요합니다. 확장은 테이블보다 먼저 있어야 `vector` 타입 컬럼을 만들 수 있고, HNSW 인덱스는 테이블이 생긴 뒤에야 만들 수 있습니다.

`app/internal/db/bootstrap.go`

```go
// Migrate 는 확장 → 테이블 → 인덱스 순서로 스키마를 준비한다.
//
//  1. CREATE EXTENSION 은 ent 스키마 DSL 로 표현할 수 없다. vector 타입 컬럼을 만들기 전에 있어야 하므로
//     Schema.Create 보다 먼저 raw SQL 로 실행한다. 확장 이름은 파라미터로 바인딩할 수 없어 문자열로 넣는다.
//  2. Schema.Create 가 테이블과 ent 가 아는 인덱스를 만든다.
//  3. HNSW 인덱스는 ent 가 모르는 인덱스 타입이라 테이블이 생긴 뒤 raw SQL 로 만든다.
//     IF NOT EXISTS 라 재시작마다 실행해도 안전하다.
func Migrate(ctx context.Context, cfg Config, client *ent.Client, raw *sql.DB) error {
	if cfg.Dialect() == "postgres" {
		for _, name := range []string{"vector"} {
			if _, err := raw.ExecContext(ctx, "CREATE EXTENSION IF NOT EXISTS "+name); err != nil {
				return fmt.Errorf("create extension %s: %w", name, err)
			}
		}
	}

	if err := client.Schema.Create(ctx); err != nil {
		return fmt.Errorf("create schema: %w", err)
	}

	if cfg.Dialect() == "postgres" {
		_, err := raw.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS documents_embedding_hnsw
    ON documents USING hnsw (embedding vector_cosine_ops)`)
		if err != nil {
			return fmt.Errorf("create hnsw index: %w", err)
		}
	}
	return nil
}
```

두 가지를 실제로 겪고 주석에 남겼습니다.

- `CREATE EXTENSION $1`처럼 확장 이름을 바인딩할 수 없습니다. DDL이라 파라미터가 안 됩니다. 문자열 결합인데, 이름 목록이 코드에 박힌 상수라 인젝션 걱정은 없습니다.
- 확장을 만들려면 DB 사용자에게 권한이 있어야 합니다. 관리형 PostgreSQL이나 권한을 좁힌 운영 DB에서는 앱이 아니라 DBA가 미리 만들어 두고, 앱은 `IF NOT EXISTS`로 확인만 합니다. 이 프로젝트의 운영 클러스터(2편)는 `enableSuperuserAccess: false`라 초기화 단계에서 확장을 만듭니다.

`vector_cosine_ops`는 인덱스가 어떤 거리로 정렬되는지 정합니다. 검색 쿼리에서 다른 거리 연산자를 쓰면 인덱스가 안 타므로 둘을 맞춰야 합니다.

## 코사인 거리 검색

검색은 ent가 표현할 수 없는 연산자를 쓰므로 raw SQL입니다. `Open`이 ent 클라이언트와 함께 `*sql.DB`를 돌려주는 이유입니다.

`app/internal/search/search.go`

```go
// Similar 는 query 와 가까운 순서로 limit 개를 돌려준다.
// <=> 는 pgvector 의 코사인 거리 연산자이고, ORDER BY 에 그대로 쓰면 HNSW 인덱스가 근사 탐색에 쓰인다.
// $1::vector 캐스팅이 없으면 드라이버가 문자열로 넘겨 타입 오류가 난다.
func (s *Searcher) Similar(ctx context.Context, query pgvector.Vector, limit int) ([]Result, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT id, source, chunk_index, content, embedding <=> $1::vector AS distance
FROM documents
ORDER BY distance ASC
LIMIT $2`, query.String(), limit)
	// ...
}
```

실제 봇에서는 여기에 "공유 문서이거나 본인 문서인 것만"이라는 `WHERE`가 붙었고, 벡터 검색 결과가 없으면 기존 키워드 검색으로 넘어가는 폴백이 있었습니다. 임베딩은 질문이 들어올 때마다 API로 만들고, 문서 청크의 임베딩은 색인 시점에 배치로 만들어 저장합니다.

## 검증

testcontainers로 pgvector가 들어 있는 PostgreSQL 이미지를 띄웁니다. 확장 파일이 이미지에 있어도 `CREATE EXTENSION`은 우리가 해야 합니다.

`app/internal/search/search_test.go`

```go
func (s *SearchSuite) TestSimilarOrdersByCosineDistance() {
	ctx := context.Background()
	docs := []struct {
		src string
		vec []float32
	}{
		{"x축", []float32{1, 0, 0, 0}},
		{"거의 x축", []float32{0.9, 0.1, 0, 0}},
		{"y축", []float32{0, 1, 0, 0}},
		{"반대 x축", []float32{-1, 0, 0, 0}},
	}
	for i, d := range docs {
		_, err := s.client.Document.Create().
			SetSource(d.src).SetChunkIndex(i).SetContent("c" + strconv.Itoa(i)).
			SetEmbedding(pgvector.NewVector(d.vec)).Save(ctx)
		s.Require().NoError(err)
	}

	got, err := search.New(s.raw).Similar(ctx, pgvector.NewVector([]float32{1, 0, 0, 0}), 3)
	s.Require().NoError(err)
	s.Require().Len(got, 3)
	s.Equal([]string{"x축", "거의 x축", "y축"}, []string{got[0].Source, got[1].Source, got[2].Source})
	s.InDelta(0, got[0].Distance, 1e-6, "같은 방향은 거리 0")
	s.InDelta(1, got[2].Distance, 1e-6, "직교는 거리 1")
}
```

4차원으로 둔 덕에 "같은 방향은 0, 직교는 1"처럼 손으로 계산할 수 있는 값으로 검증합니다. 확장이 실제로 생겼는지, HNSW 인덱스가 `vector_cosine_ops`로 만들어졌는지, `Migrate`를 두 번 불러도 안전한지도 테스트에 있습니다.

```text
--- PASS: TestSearchSuite (12.00s)
    --- PASS: TestSearchSuite/TestMigrateCreatesExtensionAndIndex (0.00s)
    --- PASS: TestSearchSuite/TestMigrateIsIdempotent (0.04s)
    --- PASS: TestSearchSuite/TestSimilarOrdersByCosineDistance (0.00s)
```

## 옮기고 나서 손에 들어온 것

벡터 검색 때문에 왔는데, 정작 이후에 더 자주 쓴 것은 다른 확장과 기능이었습니다.

- **pg_trgm**: 품목 이름처럼 오타와 띄어쓰기가 제각각인 문자열의 유사도 검색. `similarity()`와 GIN 인덱스로 `LIKE '%..%'`를 대체했습니다. 확장을 켜는 방식은 pgvector와 같아서, 위의 `Migrate`에 이름 하나를 더 넣으면 됩니다.
- **Partial unique index**: 소프트 삭제가 있는 테이블에서 `UNIQUE (product, version) WHERE deleted_at IS NULL`. 삭제된 행은 유니크 검사에서 빠집니다. MySQL에서는 삭제 시각을 유니크 키에 넣는 우회를 썼는데, 그러면 "삭제 안 된 것 중 유일"이라는 의도가 스키마에 안 남습니다.
- **`RETURNING`과 `ON CONFLICT`**: INSERT 결과를 한 번에 받고, upsert를 SQL 한 줄로 씁니다.
- **잠금 조회(`FOR UPDATE`)의 예측 가능함**: 재고와 전표처럼 동시 갱신이 많은 도메인에서 격리 수준과 잠금 동작이 문서대로 움직였습니다.

이 목록은 처음 계획에 없었습니다. 서비스 하나를 옮기고 나니 다음 서비스에서 "이건 PG면 쉽게 되는데"가 반복됐고, 그것이 전면 전환의 실제 동력이었습니다.

## 놓쳤던 것

- DSN 조립에서 `url.PathEscape`를 써서 `@`가 든 비밀번호가 깨졌습니다. 테이블 테스트가 잡았습니다.
- 첫 구현은 HNSW 인덱스 생성 실패를 로그만 찍고 넘어갔습니다. 인덱스가 없어도 검색은 되기 때문인데, 그러면 데이터가 쌓인 뒤 조용히 느려집니다. 예제에서는 실패를 오류로 올리도록 바꿨습니다.
- 확장 권한을 앱 사용자에게 줄지는 환경마다 다릅니다. 로컬과 개발은 앱이 만들고, 운영은 초기화 단계에서 만드는 것으로 나눴습니다.

## 다음 편

앱은 이렇게 옮겼지만 정작 힘들었던 것은 DB를 Kubernetes 위에서 어떻게 굴리느냐였습니다. MySQL Operator 1년 동안 무엇이 문제였고 CloudNativePG로 무엇이 달라졌는지가 2편입니다.

## Reference

- [pgvector](https://github.com/pgvector/pgvector)
- [pgvector-go](https://github.com/pgvector/pgvector-go)
- [ent — Custom field types (field.Other)](https://entgo.io/docs/schema-fields#other-field)
- [PostgreSQL — pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [PostgreSQL — Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
