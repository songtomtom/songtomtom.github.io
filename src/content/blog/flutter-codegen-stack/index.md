---
title: "Riverpod, go_router, freezed 코드 생성을 한 프로젝트에서 돌리기"
description: "세 가지 코드 생성기가 각각 무엇을 만들어 주는지 생성 파일을 열어 보고, build.yaml로 범위를 제한하는 이유, 생성 파일을 저장소에 넣는 판단, 그리고 버전 충돌을 어떻게 풀었는지 정리합니다."
date: "2026-09-28T10:20"
project: flutter-feature-architecture
order: 3
category: mobile
tags:
  - flutter
  - dart
  - build_runner
  - riverpod
---

1편과 2편의 코드에는 `part 'todos_notifier.g.dart';` 같은 줄과 `_$TodosState`, `_$TodosRoute` 같은 이름이 계속 나왔습니다. 전부 코드 생성기가 만든 것입니다. 이 프로젝트는 상태 관리, 라우팅, 모델 세 영역에서 생성기를 쓰고, `build_runner` 명령 하나로 전부 돌립니다. 이번 편은 그 생성기들이 정확히 무엇을 만들고, 왜 손으로 쓰지 않는지, 운영하면서 무엇을 정해야 하는지입니다.

## 왜 생성하는가

Riverpod의 provider, go_router의 라우트, freezed의 값 객체는 손으로도 쓸 수 있습니다. 그런데도 생성기를 쓰는 이유는 **틀릴 수 있는 반복 코드를 없애기 위해서**입니다.

- provider를 손으로 쓰면 `NotifierProvider<TodosNotifier, TodosState>.autoDispose(TodosNotifier.new)`처럼 타입을 두 번 적습니다. 파라미터가 있는 provider는 `family`가 붙어 더 길어집니다.
- 라우트를 문자열로 쓰면 `/todo/$id`에서 인코딩을 잊거나 파라미터 이름을 오타 냅니다. 컴파일러는 모릅니다.
- 값 객체의 `==`, `hashCode`, `copyWith`는 필드를 하나 추가할 때마다 세 군데를 고쳐야 하고, 하나를 빼먹으면 테스트에서 같은 값이 다르다고 나옵니다.

생성기는 원본(어노테이션이 붙은 클래스) 하나만 유지하게 해 줍니다.

## 세 생성기

`app/pubspec.yaml`

```yaml
dev_dependencies:
  build_runner: ^2.5.4
  riverpod_generator: ^3.0.3
  go_router_builder: ^3.2.0
  freezed: ^3.2.0
  json_serializable: ^6.9.5
```

| 영역 | 어노테이션 | 생성 파일 | 만들어 주는 것 |
|---|---|---|---|
| 상태 관리 | `@riverpod` | `*.g.dart` | provider 인스턴스, `_$TodosNotifier` 부모 클래스 |
| 라우팅 | `@TypedGoRoute` | `app_router.g.dart` | `$appRoutes`, `_$TodosRoute` 믹스인(location, go, push) |
| 모델·상태 | `@freezed` | `*.freezed.dart` | 하위 클래스, `==`, `copyWith`, `toString` |
| JSON | `factory fromJson` | `*.g.dart` | `_$TodoFromJson`, `_$TodoToJson` |

`json_serializable`은 freezed와 짝으로 씁니다. freezed가 `fromJson` 팩토리를 보면 json_serializable에 위임합니다.

## 생성 파일을 열어 보면

생성 파일을 한 번은 읽어 보는 것이 좋습니다. 무엇이 만들어지는지 알아야 오류가 났을 때 어디를 볼지 압니다.

`@riverpod class TodosNotifier`에서 만들어진 것입니다.

`app/lib/features/todos/todos_notifier.g.dart`

```dart
@ProviderFor(TodosNotifier)
const todosProvider = TodosNotifierProvider._();

final class TodosNotifierProvider
    extends $NotifierProvider<TodosNotifier, TodosState> {
  const TodosNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'todosProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );
  // ...
}
```

`isAutoDispose: true`가 눈에 띕니다. `@riverpod`는 기본이 자동 해제이고, 앱 전체에서 살아 있어야 하는 것만 `@Riverpod(keepAlive: true)`로 표시합니다. 이 프로젝트에서는 저장소와 설정 두 개가 그렇습니다. 1편에서 테스트가 초기화됐던 원인이 바로 이 기본값이었습니다.

`@TypedGoRoute`에서 만들어진 것입니다.

`app/lib/core/router/app_router.g.dart`

```dart
RouteBase get $todosRoute => GoRouteData.$route(
  path: '/',
  factory: _$TodosRoute._fromState,
  routes: [
    GoRouteData.$route(path: 'todo/:id', factory: _$TodoDetailRoute._fromState),
    GoRouteData.$route(path: 'settings', factory: _$SettingsRoute._fromState),
  ],
);

mixin _$TodoDetailRoute on GoRouteData {
  static TodoDetailRoute _fromState(GoRouterState state) =>
      TodoDetailRoute(id: state.pathParameters['id']!);

  TodoDetailRoute get _self => this as TodoDetailRoute;

  @override
  String get location =>
      GoRouteData.$location('/todo/${Uri.encodeComponent(_self.id)}');
  // go, push, pushReplacement, replace ...
}
```

`Uri.encodeComponent`가 들어가 있습니다. 손으로 `'/todo/$id'`를 쓰면 id에 슬래시나 공백이 있을 때 깨지는데, 생성기는 그걸 항상 처리합니다. `_fromState`는 URL에서 객체를 복원하는 반대 방향입니다. 딥링크로 들어와도 같은 `TodoDetailRoute(id: ...)`가 만들어집니다.

## 실행

```bash
dart run build_runner build --delete-conflicting-outputs
```

`--delete-conflicting-outputs`는 이전 생성 파일이 남아 있을 때 물어보지 않고 덮어쓰는 옵션입니다. 없으면 CI에서 입력 대기로 멈춥니다. 개발 중에는 `watch`로 두면 파일을 저장할 때마다 다시 생성됩니다.

```bash
dart run build_runner watch --delete-conflicting-outputs
```

원본 파일에는 `part` 지시문이 있어야 합니다.

`app/lib/features/todos/todo.dart`

```dart
part 'todo.freezed.dart';
part 'todo.g.dart';
```

생성 파일이 `part of 'todo.dart'`로 원본에 붙기 때문에 원본의 비공개 멤버를 쓸 수 있고, 원본은 생성 파일의 `_$Todo`를 쓸 수 있습니다. 생성 전에는 이 이름이 없어서 편집기가 온통 빨간 줄인데, 정상입니다. 생성기를 돌리면 사라집니다.

## 범위 제한

생성기는 기본적으로 `lib/` 전체를 훑습니다. 파일이 늘면 느려지므로 어디를 볼지 알려 줍니다.

`app/build.yaml`

```yaml
targets:
  $default:
    builders:
      freezed:
        generate_for:
          - lib/features/**
      json_serializable:
        generate_for:
          - lib/features/**
```

freezed와 json_serializable은 `features/` 안에서만 돕니다. 모델과 상태가 거기에만 있기 때문입니다. `riverpod_generator`는 `providers/`와 `core/`에도 provider가 있어서 제한하지 않았습니다. 새 디렉터리에 `@freezed`를 쓰기 시작하면 여기에 추가해야 합니다. 안 하면 생성 파일이 안 만들어지고 `_$Foo`가 없다는 오류만 나서 원인을 찾기 어렵습니다. 처음 겪으면 30분은 씁니다.

## 생성 파일을 저장소에 넣는가

두 방식이 있고 이 프로젝트는 **넣는 쪽**을 택했습니다.

| | 저장소에 넣음 | 넣지 않음 (CI에서 생성) |
|---|---|---|
| clone 직후 | 바로 빌드됨 | `build_runner` 먼저 실행해야 함 |
| PR diff | 생성 파일 변경이 섞임 | 원본만 보임 |
| 생성기 버전 불일치 | diff로 드러남 | 조용히 다른 코드가 됨 |
| 저장소 크기 | 커짐 | 작음 |

결정적인 이유는 "clone 하면 바로 돈다"입니다. 예제 저장소를 보는 사람이 build_runner부터 돌려야 한다면 절반은 거기서 멈춥니다. 대신 PR에서 생성 파일은 접어서 보고, `.gitattributes`에 `*.g.dart linguist-generated=true`를 두면 GitHub이 diff를 접어 줍니다.

넣지 않는 쪽을 택한다면 `.gitignore`에 `*.g.dart`와 `*.freezed.dart`를 넣고, CI의 첫 단계를 `build_runner build`로 둡니다. 어느 쪽이든 팀에서 하나로 정해야지, 일부만 커밋하면 최악입니다.

## 버전 맞추기

세 생성기를 같이 쓰면 버전 해결에서 막힐 때가 있습니다. 이 프로젝트를 만들 때 실제로 겪은 순서입니다.

1. `flutter pub add`로 최신을 받았더니 `riverpod_annotation 4.x`가 잡혔는데, 이 버전은 Dart 3.10 이상을 요구했고 로컬은 3.9였습니다.
2. `riverpod_lint`를 넣으려 하자 `freezed_annotation ^2.2.0`을 요구해 freezed 3와 충돌했습니다. 린트는 빼기로 했습니다.
3. Riverpod은 3.0.x, go_router는 16.x, freezed는 3.2.x로 고정하니 해결됐습니다.

교훈은 두 가지입니다. `pub add`가 고르는 최신 버전이 서로 맞는다는 보장이 없으므로 SDK 버전을 먼저 확인하고, 문제가 나면 오류 메시지의 "because" 체인을 위에서부터 읽으면 어느 패키지가 발목을 잡는지 나옵니다.

## 처음 만들 때 놓쳤던 것

- Riverpod 3 생성기는 `TodosNotifier`에서 `Notifier` 접미사를 떼고 `todosProvider`를 만듭니다. 2.x의 `todosNotifierProvider`를 기대하면 전부 컴파일 오류입니다.
- go_router_builder 3.x는 `with _$TodosRoute` 믹스인을 요구합니다. 빠지면 생성기가 `Missing mixin clause` 오류를 내고 멈춥니다. 2.x에서 옮겨 온 코드에서 자주 납니다.
- 생성 파일이 없는 상태에서 `flutter analyze`를 돌리면 오류가 수십 개 나옵니다. 생성기 오류가 아니라 순서 문제입니다. 항상 생성 먼저, 분석 다음입니다. Makefile이나 CI에 그 순서를 박아 둡니다.

## 한계와 다음 편

- 생성기 세 개가 각각 다른 주기로 메이저 버전을 올립니다. 세 개를 동시에 최신으로 유지하기는 어렵고, 분기마다 한 번씩 맞추는 정도가 현실적입니다.
- `build_runner`는 프로젝트가 커지면 느려집니다. 수백 파일 규모에서 첫 빌드가 분 단위가 되면 `build.yaml`의 `generate_for`를 더 좁히거나 패키지를 나눕니다.
- 생성 코드는 읽기 어렵고, 생성기 버그를 만나면 우회가 까다롭습니다. 그래도 손으로 쓴 반복 코드의 버그보다는 드뭅니다.

마지막 편은 이 프로젝트에서 금지한 패턴들입니다. 싱글턴, `addPostFrameCallback`, `Future.microtask`, barrel file이 각각 어떤 문제를 만드는지 테스트로 보여 줍니다.

## Reference

- [Riverpod — About code generation](https://riverpod.dev/docs/concepts/about_code_generation)
- [go_router_builder](https://pub.dev/packages/go_router_builder)
- [freezed](https://pub.dev/packages/freezed)
- [build_runner — Configuring builders](https://pub.dev/packages/build_config)
