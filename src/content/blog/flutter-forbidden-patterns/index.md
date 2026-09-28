---
title: "Flutter에서 싱글턴과 addPostFrameCallback을 금지한 이유"
description: "싱글턴이 테스트를 오염시키는 것을 실제 테스트 결과로 보여 주고, addPostFrameCallback과 Future.microtask가 왜 레이스와 테스트 불가를 만드는지, 그 대신 상태를 듣고 반응하는 방식으로 어떻게 바꾸는지 정리합니다."
date: "2026-09-28T10:30"
project: flutter-feature-architecture
order: 4
category: mobile
tags:
  - flutter
  - dart
  - riverpod
  - testing
---

앞의 세 편이 "이렇게 한다"였다면 이번 편은 "이렇게 하지 않는다"입니다. 금지 목록은 짧을수록 좋고, 항목마다 이유가 있어야 지켜집니다. 이 프로젝트에서 금지한 것은 네 가지이고, 각각 어떤 버그를 만드는지 가능한 한 코드로 보여 줍니다.

| 금지 | 대신 |
|---|---|
| 싱글턴 | Riverpod provider |
| `addPostFrameCallback`, `Future.microtask` | 상태를 바꾸고 `ref.listen`으로 반응 |
| `state.when()` / `state.map()` | Dart 3 `switch` 표현식 (2편) |
| barrel file, 상대경로 import | 파일 직접 import, `package:` 절대경로 (1편) |

## 싱글턴: 테스트가 서로를 오염시킨다

Flutter 앱에서 가장 흔한 싱글턴은 저장소나 API 클라이언트입니다.

```dart
class SingletonTodoStore {
  SingletonTodoStore._();
  static final instance = SingletonTodoStore._();

  final titles = <String>[];
  void add(String title) => titles.add(title);
}
```

어디서든 `SingletonTodoStore.instance`로 부르니 편합니다. 문제는 프로세스에 하나뿐이라는 점이고, 테스트 러너도 하나의 프로세스입니다. 저장소에 이걸 그대로 재현한 테스트를 넣어 두었습니다.

`app/test/patterns/singleton_vs_provider_test.dart`

```dart
  group('싱글턴은 테스트 순서에 따라 결과가 달라진다', () {
    test('A: 하나 추가하면 하나', () {
      SingletonTodoStore.instance.add('첫 번째');
      expect(SingletonTodoStore.instance.titles.length, 1);
    });

    test('B: 하나 추가하면 하나여야 하는데 A 가 남긴 것이 보인다', () {
      SingletonTodoStore.instance.add('두 번째');
      // 실제 값은 2. 이 테스트만 단독 실행하면 1 이라 통과한다.
      expect(SingletonTodoStore.instance.titles.length, 2);
    });
  });
```

테스트 B는 "하나 추가하면 하나"를 검증하고 싶은데, A가 남긴 항목 때문에 2가 됩니다. 파일 전체를 돌리면 통과하고 B만 단독으로 돌리면 실패합니다.

```bash
flutter test test/patterns/singleton_vs_provider_test.dart
# 00:04 +4: All tests passed!

flutter test test/patterns/singleton_vs_provider_test.dart --plain-name "B: 하나 추가하면"
#   Expected: <2>
#     Actual: <1>
# 00:01 +0 -1: Some tests failed.
```

같은 테스트가 실행 순서에 따라 결과가 다릅니다. 이런 테스트는 CI에서 무작위로 깨지고, 깨진 테스트가 아니라 앞서 돈 테스트가 원인이라 찾기 어렵습니다. 테스트에서만 문제가 아닙니다. 앱에서도 싱글턴은 "누가 언제 초기화했는지"를 추적할 수 없고, 로그아웃 후 이전 사용자의 데이터가 남는 버그의 단골 원인입니다.

같은 파일의 아래쪽이 Riverpod 방식입니다.

```dart
  group('Riverpod 컨테이너는 테스트마다 새로 만든다', () {
    ProviderContainer makeContainer() {
      final container = ProviderContainer(
        overrides: [
          todoRepositoryProvider.overrideWithValue(FakeTodoRepository()),
        ],
      );
      addTearDown(container.dispose);
      addTearDown(container.listen(todosProvider, (_, _) {}).close);
      return container;
    }

    test('A: 하나 추가하면 하나', () async {
      final container = makeContainer();
      await container.read(todosProvider.notifier).add('첫 번째');
      expect((container.read(todosProvider) as TodosLoaded).todos.length, 1);
    });

    test('B: A 와 무관하게 하나', () async {
      final container = makeContainer();
      await container.read(todosProvider.notifier).add('두 번째');
      expect((container.read(todosProvider) as TodosLoaded).todos.length, 1);
    });
  });
```

`ProviderContainer`가 상태의 경계입니다. 테스트마다 새로 만들고 끝나면 버립니다. 앱에서는 `ProviderScope` 하나가 그 역할이고, 로그아웃 시 사용자 관련 provider를 `invalidate`하면 됩니다. 싱글턴이 주던 "어디서든 접근"은 `ref.read`가 그대로 줍니다. 잃는 것은 없고 얻는 것은 격리입니다.

## addPostFrameCallback: 빌드 중에 상태를 바꾸려는 신호

`addPostFrameCallback`은 "이번 프레임을 그린 다음에 실행해 달라"는 요청입니다. 보통 이런 상황에서 등장합니다.

```dart
// 하지 않는다
@override
Widget build(BuildContext context, WidgetRef ref) {
  final state = ref.watch(todoDetailProvider(id));
  if (state is TodoDetailDeleted) {
    WidgetsBinding.instance.addPostFrameCallback((_) => context.pop());
  }
  // ...
}
```

빌드 중에 `context.pop()`을 부르면 "빌드 중에 네비게이션을 바꿀 수 없다"는 예외가 나니까 프레임 뒤로 미룬 것입니다. 동작은 합니다. 문제는 세 가지입니다.

- **레이스.** 프레임이 끝나기 전에 위젯이 dispose 되면 콜백이 죽은 `context`를 잡고 실행됩니다. 화면 전환이 빠른 기기에서 간헐적으로 터집니다.
- **중복 실행.** `build`는 여러 번 불립니다. 상태가 `deleted`인 채로 리빌드가 두 번 일어나면 `pop`도 두 번 예약됩니다.
- **테스트 불가.** 위젯 테스트에서 `pump()` 타이밍에 따라 콜백이 실행되기도 안 되기도 합니다.

근본 원인은 "빌드 중에 부수 효과를 일으키려 한다"는 것입니다. 빌드는 상태를 화면으로 바꾸는 순수한 함수여야 합니다. 이 프로젝트에서는 부수 효과를 상태 변화에 대한 반응으로 옮겼습니다.

`app/lib/features/todo_detail/todo_detail_screen.dart`

```dart
    ref.listen(todoDetailProvider(id), (_, next) {
      if (next is TodoDetailDeleted) context.pop();
    });
```

`ref.listen`은 빌드 밖에서, 상태가 실제로 바뀐 순간에 한 번 실행됩니다. 리빌드와 무관하고, 위젯이 dispose 되면 구독도 해제됩니다. 삭제 버튼의 콜백은 `notifier.remove()`만 부르고 화면 전환을 모릅니다.

`app/lib/features/todo_detail/todo_detail_notifier.dart`

```dart
  Future<void> remove() async {
    await ref.read(todoRepositoryProvider).delete(id);
    state = const TodoDetailState.deleted();
    ref.invalidate(todosProvider);
  }
```

"삭제가 끝났다"는 사실은 상태에 남고, 그 사실에 반응하는 쪽은 화면입니다. 나중에 다른 기기에서 삭제된 것을 동기화로 알게 되어도 같은 `deleted` 상태로 흘러가면 화면은 똑같이 닫힙니다.

## Future.microtask: 같은 문제, 다른 이름

`Future.microtask(() => setState(...))`나 `Future.delayed(Duration.zero, ...)`도 목적은 같습니다. "지금 말고 조금 뒤에". 미루는 시점이 다음 프레임이 아니라 현재 이벤트 루프 끝이라는 것만 다릅니다. 레이스와 테스트 불가는 동일하고, 오히려 `addPostFrameCallback`보다 실행 시점이 덜 명확합니다.

이런 코드를 쓰고 싶어지는 순간이 있다면 대개 둘 중 하나입니다.

- `initState`에서 provider를 바꾸려 한다 → Notifier의 `build()`에서 초기 로딩을 시작한다. 1편의 `TodosNotifier.build()`가 `_load()`를 부르는 방식입니다.
- 빌드 중에 네비게이션이나 다이얼로그를 띄우려 한다 → 상태로 만들고 `ref.listen`으로 반응한다.

둘 다 "미루기"가 아니라 "옮기기"로 풉니다.

## barrel file과 상대경로 import

1편에서 다뤘으므로 이유만 다시 적습니다.

- **barrel file**은 `export`를 모아 둔 파일입니다. 파일 하나를 import 했는데 폴더 전체가 딸려 오고, 순환 참조가 생겨도 어느 파일 때문인지 보이지 않습니다. 삭제한 파일의 export를 지우는 것을 잊으면 빌드가 깨집니다.
- **상대경로 import**는 파일을 옮기면 깨집니다. 더 나쁜 것은 같은 파일이 `package:` 경로와 상대경로로 각각 import 되면 Dart가 서로 다른 라이브러리로 취급한다는 점입니다. 같은 클래스인데 타입이 안 맞는다는 오류를 만나면 십중팔구 이것입니다.

## 규칙을 코드로 강제하기

금지 목록은 문서에만 있으면 잊힙니다. 이 프로젝트에서는 두 가지로 강제합니다.

- **테스트.** `singleton_vs_provider_test.dart`는 "왜"를 보여 주는 문서이자, 누군가 싱글턴을 다시 들여오면 참고할 반례입니다.
- **린트.** `analysis_options.yaml`에서 `always_use_package_imports`를 켜면 상대경로 import가 경고가 됩니다. `addPostFrameCallback`은 린트 규칙이 없어서 코드 리뷰에서 봅니다. `custom_lint`로 직접 규칙을 만들 수도 있는데, 이 프로젝트의 SDK 버전에서는 `riverpod_lint`가 freezed 3과 충돌해 넣지 못했습니다(3편).

## 처음 만들 때 놓쳤던 것

- 싱글턴 테스트를 처음 쓸 때 B의 기대값을 1로 두었습니다. 파일 전체를 돌리면 실패하고 단독으로 돌리면 통과해서, "왜 이 테스트만 불안정하지"를 한참 봤습니다. 그 혼란 자체가 이 글의 요점이라 기대값을 2로 바꾸고 주석을 남겼습니다.
- `ref.listen`은 `build` 안에서 불러야 합니다. `initState`나 다른 곳에서 부르면 리빌드 때 구독이 갱신되지 않습니다. `ConsumerWidget.build` 첫머리에 두는 것이 관례입니다.

## 시리즈를 마치며

네 편을 관통하는 원칙은 하나입니다. **판단을 컴파일러와 구조에 맡기고, 사람은 규칙을 기억하지 않아도 되게 한다.** 화면 하나의 파일은 한 폴더에 있어서 찾을 필요가 없고, 빠뜨린 상태는 컴파일러가 잡고, 반복 코드는 생성기가 만들고, 위험한 패턴은 테스트가 반례로 남아 있습니다. 규칙이 늘어날수록 문서가 아니라 도구에 넣을 방법을 먼저 찾는 것이, 팀이 커져도 구조가 유지되는 유일한 길이었습니다.

## Reference

- [Riverpod — Testing](https://riverpod.dev/docs/essentials/testing)
- [Riverpod — ref.listen](https://riverpod.dev/docs/essentials/side_effects)
- [Flutter — SchedulerBinding.addPostFrameCallback](https://api.flutter.dev/flutter/scheduler/SchedulerBinding/addPostFrameCallback.html)
- [Dart lints — always_use_package_imports](https://dart.dev/tools/linter-rules/always_use_package_imports)
