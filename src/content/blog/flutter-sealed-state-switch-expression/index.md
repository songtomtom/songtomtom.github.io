---
title: "Dart 3 switch 표현식과 sealed class로 상태 관리하기"
description: "state.when() 대신 Dart 3 switch 표현식을 쓰는 이유를 컴파일러가 실제로 잡아 주는 오류로 보여 주고, freezed sealed class로 화면 상태를 정의해 패턴 매칭과 가드로 분기하는 방법을 정리합니다."
date: "2026-09-28T10:10"
project: flutter-feature-architecture
order: 2
category: mobile
tags:
  - flutter
  - dart
  - freezed
  - pattern-matching
---

1편에서 화면마다 `*_state.dart` 파일을 두었습니다. 이번 편은 그 파일의 내용입니다. 화면 상태를 `isLoading`, `error`, `data` 같은 플래그 묶음이 아니라 **서로 배타적인 타입의 집합**으로 정의하고, 위젯에서 Dart 3의 `switch` 표현식으로 분기합니다. freezed를 써 본 분이라면 `state.when()`을 대신하는 방식입니다.

## 플래그 묶음이 문제인 이유

처음 Flutter를 배울 때 상태는 대개 이렇게 만듭니다.

```dart
class TodosState {
  final bool isLoading;
  final List<Todo> todos;
  final String? error;
}
```

필드 세 개면 조합이 여덟 가지입니다. 그중 `isLoading == true`이면서 `error != null`인 상태는 무엇인지, 로딩 중인데 `todos`가 비어 있지 않으면 이전 데이터를 보여 줘야 하는지, 코드를 읽는 사람마다 다르게 해석합니다. 화면은 실제로 "로딩 중", "불러옴", "실패" 세 상태뿐인데 타입이 그것을 말해 주지 않습니다.

상태를 타입으로 나누면 존재하지 않는 조합이 아예 표현되지 않습니다.

## sealed class로 상태 정의

`app/lib/features/todos/todos_state.dart`

```dart
@freezed
sealed class TodosState with _$TodosState {
  const factory TodosState.loading() = TodosLoading;
  const factory TodosState.loaded(List<Todo> todos) = TodosLoaded;
  const factory TodosState.error(String message) = TodosError;
}
```

세 부분이 있습니다.

- **`sealed`**: Dart 3의 클래스 수정자입니다. 이 클래스의 하위 타입은 같은 라이브러리 안에 있는 것이 전부라고 컴파일러에 알립니다. 그래서 컴파일러가 "모든 경우"를 셀 수 있습니다.
- **`TodosLoading`, `TodosLoaded`, `TodosError`**: 각 팩토리의 오른쪽 이름이 실제 하위 클래스 이름이 됩니다. 패턴 매칭에서 이 이름을 씁니다. freezed 2.x에서는 `_Loading`처럼 비공개 이름이 관례였는데, 3.x에서 sealed class와 함께 쓰려면 공개 이름을 붙여야 `switch`에서 부를 수 있습니다.
- **freezed**: `==`, `hashCode`, `toString`, `copyWith`를 만들어 줍니다. 테스트에서 `expect(state, const TodosState.loaded([]))`처럼 값으로 비교할 수 있는 것은 이 덕분입니다.

상세 화면은 케이스가 하나 더 있습니다. 삭제된 뒤의 상태입니다.

`app/lib/features/todo_detail/todo_detail_state.dart`

```dart
@freezed
sealed class TodoDetailState with _$TodoDetailState {
  const factory TodoDetailState.loading() = TodoDetailLoading;
  const factory TodoDetailState.loaded(Todo todo) = TodoDetailLoaded;
  const factory TodoDetailState.notFound() = TodoDetailNotFound;
  const factory TodoDetailState.deleted() = TodoDetailDeleted;
}
```

"없음"과 "삭제됨"을 나눈 이유가 있습니다. 둘 다 화면에 보여 줄 할 일이 없지만, 없음은 오류 문구를 보여 주고 삭제됨은 이전 화면으로 돌아가야 합니다. 플래그였다면 `todo == null && wasDeleted` 같은 조합이 됐을 것입니다.

## switch 표현식으로 분기

`app/lib/features/todos/todos_screen.dart`

```dart
      body: switch (state) {
        TodosLoading() => const Center(child: CircularProgressIndicator()),
        TodosLoaded(:final todos) when todos.isEmpty =>
          const EmptyView(message: '할 일이 없습니다. 아래 + 버튼으로 추가하세요.'),
        TodosLoaded(:final todos) => ListView.builder(
            itemCount: todos.length,
            itemBuilder: (context, index) {
              final todo = todos[index];
              return TodoTile(
                todo: todo,
                onToggle: () =>
                    ref.read(todosProvider.notifier).toggle(todo.id),
                onTap: () => TodoDetailRoute(id: todo.id).push<void>(context),
              );
            },
          ),
        TodosError(:final message) => ErrorView(message: message),
      },
```

문법을 하나씩 보면 이렇습니다.

- **`switch (state) { ... }`가 값입니다.** 문(statement)이 아니라 표현식이라 `body:` 자리에 바로 들어갑니다. 각 가지는 `패턴 => 값`이고 세미콜론 대신 쉼표로 끝납니다.
- **`TodosLoaded(:final todos)`**는 객체 패턴입니다. 타입을 검사하면서 동시에 `todos` 필드를 같은 이름의 지역 변수로 꺼냅니다. `TodosLoaded(todos: final list)`처럼 이름을 바꿔 받을 수도 있습니다.
- **`when todos.isEmpty`**는 가드입니다. 타입은 같지만 값에 따라 다른 가지로 보냅니다. 빈 목록 케이스를 위해 `TodosEmpty` 상태를 따로 만들지 않아도 됩니다. 가드가 있는 가지는 위에, 없는 가지는 아래에 둡니다. 순서대로 검사하기 때문입니다.
- **default가 없습니다.** 컴파일러가 세 하위 타입을 다 알고 있고 네 가지가 전부 덮였다고 확인했기 때문입니다.

## 컴파일러가 잡아 주는 것

이 방식의 핵심은 "빠뜨리면 컴파일이 안 된다"입니다. 실제로 확인해 봤습니다. `TodosState`에 네 번째 케이스를 추가하고 화면은 그대로 두었습니다.

```dart
  const factory TodosState.offline() = TodosOffline;
```

```text
error • The type 'TodosState' isn't exhaustively matched by the switch cases
        since it doesn't match the pattern 'TodosOffline()'
      • lib/features/todos/todos_screen.dart:26:13 • non_exhaustive_switch_expression
```

상태를 추가한 사람이 화면을 고치는 것을 잊어도 빌드가 막힙니다. `if (state.isLoading) ... else if (state.error != null) ...`로 썼다면 새 상태는 조용히 `else`로 흘러 들어가고, 앱은 엉뚱한 화면을 보여 줍니다.

## state.when()과 무엇이 다른가

freezed에는 `state.when(loading: () => ..., loaded: (todos) => ..., error: (m) => ...)`이 있고, 오랫동안 이 방식을 썼습니다. 언어 기능이 생긴 뒤에는 쓰지 않습니다.

| | `when()` | `switch` 표현식 |
|---|---|---|
| 누락 검사 | freezed가 생성한 메서드의 필수 인자로 강제 | 언어 차원의 완전성 검사 |
| 가드 | 없음. 콜백 안에서 `if` | `when` 절 |
| 중첩 상태 | `when` 안에 `when` | 패턴을 중첩해 한 번에 |
| 생성 코드 | 필요 | 없어도 됨 (sealed class는 언어 기능) |
| 스택 트레이스 | 콜백 한 겹 추가 | 없음 |

freezed 3.x는 `when`, `map`을 기본으로 생성하지 않습니다. 옵션으로 켤 수 있지만 라이브러리도 언어 기능 쪽으로 옮겨 가라는 뜻입니다.

## 타입 검사만 필요할 때

값을 만들지 않고 "이 상태인가"만 물어볼 때는 `is` 패턴이면 됩니다. 상세 화면이 삭제된 뒤 이전 화면으로 돌아가는 코드입니다.

`app/lib/features/todo_detail/todo_detail_screen.dart`

```dart
    ref.listen(todoDetailProvider(id), (_, next) {
      if (next is TodoDetailDeleted) context.pop();
    });
```

이 한 줄은 4편의 주제이기도 합니다. "삭제 버튼을 누르면 뒤로 간다"를 버튼 콜백에서 `await notifier.remove(); context.pop();`으로 쓰지 않고, 상태가 `deleted`로 바뀐 것을 듣고 반응합니다. 이렇게 하면 삭제가 어디서 일어나든(버튼이든, 다른 화면이든, 나중에 붙을 동기화든) 화면은 같은 방식으로 따라갑니다.

## enum도 같은 방식으로

sealed class만이 아니라 enum도 `switch` 표현식으로 완전하게 분기됩니다.

`app/lib/features/settings/settings_screen.dart`

```dart
                title: Text(switch (mode) {
                  ThemeMode.system => '시스템 설정 따르기',
                  ThemeMode.light => '라이트',
                  ThemeMode.dark => '다크',
                }),
```

Flutter가 `ThemeMode`에 값을 하나 추가하면 여기서 컴파일 오류가 납니다. 서버 스키마에서 생성된 enum에 화면용 이름을 붙일 때도 같은 방식을 씁니다. enum을 손으로 다시 정의하지 않고 생성된 enum에 `switch`나 extension으로 매핑하면, 스키마가 바뀔 때 앱 어디를 고쳐야 하는지 컴파일러가 알려 줍니다.

## 처음 만들 때 놓쳤던 것

- freezed 3.x에서 `sealed` 없이 union을 만들면 "sealed 또는 abstract 여야 한다"는 생성 오류가 납니다. 2.x 코드를 옮길 때 가장 먼저 부딪히는 부분입니다.
- 하위 클래스 이름을 `_Loading`처럼 비공개로 두면 다른 파일의 `switch`에서 참조할 수 없습니다. `TodosLoading`처럼 공개 이름으로 바꿔야 합니다.
- 가드가 있는 가지를 아래에 두면 위의 일반 가지가 먼저 잡아서 가드가 영원히 실행되지 않습니다. 컴파일러는 이걸 오류로 잡지 않고 "도달할 수 없는 가지"로도 경고하지 않으므로, 가드는 항상 위에 두는 규칙을 지킵니다.

## 한계와 다음 편

- 상태를 타입으로 나누면 상태 클래스가 화면마다 하나씩 생깁니다. 화면이 서른 개면 파일 서른 개입니다. 1편의 코로케이션이 없으면 이 파일들이 `states/` 폴더에 쌓여 감당이 안 됩니다.
- 로딩 중에 이전 데이터를 보여 주고 싶으면 `TodosLoading`에 `previous` 필드를 넣거나 `TodosLoaded`에 `isRefreshing` 플래그를 두어야 합니다. 이 프로젝트에서는 단순하게 갔지만 실제 앱에서는 "새로고침 중"이 따로 필요한 경우가 많습니다.
- Riverpod의 `AsyncValue`도 `AsyncLoading`, `AsyncData`, `AsyncError` sealed class라 같은 방식으로 분기됩니다. 도메인 상태가 세 가지뿐이면 `AsyncValue`를 그대로 써도 됩니다. 이 프로젝트에서 직접 정의한 이유는 `notFound`, `deleted`처럼 로딩/성공/실패로 안 나뉘는 상태가 있기 때문입니다.

다음 편은 이 파일들을 만들어 주는 코드 생성기들입니다. `@freezed`, `@riverpod`, `@TypedGoRoute`를 한 프로젝트에서 어떻게 돌리는지, 생성 파일을 저장소에 넣을지 정리합니다.

## Reference

- [Dart — Patterns](https://dart.dev/language/patterns)
- [Dart — Branches: switch expressions](https://dart.dev/language/branches#switch-expressions)
- [Dart — Class modifiers: sealed](https://dart.dev/language/class-modifiers#sealed)
- [freezed — 3.0 migration](https://pub.dev/packages/freezed#migration-from-2x-to-3x)
