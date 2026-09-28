---
title: "Flutter 단위 테스트(Unit Test)로 코드의 기본 단위 검증하기"
description: "Flutter 프로젝트에서 위젯이나 기기 없이 순수 Dart 로직을 검증하는 단위 테스트를 씁니다. test와 flutter_test의 차이, 테스트 구조, 무엇을 단위 테스트로 다룰지 정리합니다."
date: "2025-01-13"
project: flutter-test
order: 1
canonical: "https://medium.com/@songtomtom/flutter-%EB%8B%A8%EC%9C%84-%ED%85%8C%EC%8A%A4%ED%8A%B8-unit-test-%EB%A1%9C-%EC%BD%94%EB%93%9C%EC%9D%98-%EA%B8%B0%EB%B3%B8-%EB%8B%A8%EC%9C%84-%EA%B2%80%EC%A6%9D%ED%95%98%EA%B8%B0-1d3b399b3a79"
tags:
  - flutter
  - dart
  - testing
---

Flutter 앱을 만들다 보면 확인이 필요할 때마다 시뮬레이터를 띄우고 화면을 눌러 보게 됩니다. 기능이 몇 개 없을 때는 괜찮은데, 화면이 스무 개가 넘어가면 무언가를 고칠 때마다 어디가 깨졌는지 알 방법이 없어집니다. 테스트는 그 확인을 자동화하는 것이고, 그중 단위 테스트는 가장 작고 빠른 층입니다.

Flutter의 테스트는 세 층으로 나뉩니다.

| 층 | 대상 | 실행 환경 | 속도 |
|---|---|---|---|
| 단위 테스트 | 함수, 클래스 | Dart VM | 밀리초 |
| 위젯 테스트 | 위젯 하나의 렌더링과 상호작용 | Flutter 테스트 프레임워크 | 초 |
| 통합 테스트 | 앱 전체 흐름 | 기기 또는 에뮬레이터 | 분 |

아래로 갈수록 실제와 가깝지만 느리고 깨지기 쉽습니다. 그래서 로직은 최대한 위젯에서 분리해 단위 테스트로 검증하고, 위젯 테스트와 통합 테스트는 적게 둡니다. 이 글은 첫 번째 층입니다. 코드는 [songtomtom/flutter-test](https://github.com/songtomtom/flutter-test)에 있습니다.

## 패키지

```bash
flutter pub add dev:test
```

Flutter 프로젝트를 만들면 `flutter_test`가 이미 dev 의존성에 있습니다. 그런데도 `test` 패키지를 따로 추가하는 이유는 대상이 다르기 때문입니다.

- `test`: 순수 Dart용 테스트 프레임워크. `test()`, `group()`, `expect()`가 여기 있습니다.
- `flutter_test`: `test`를 포함하고 그 위에 `testWidgets()`, `WidgetTester` 같은 위젯 테스트 도구를 얹은 것입니다.

순수 Dart 클래스를 테스트할 때 `flutter_test`를 임포트해도 동작은 하지만, "이 코드는 Flutter에 의존하지 않는다"는 사실을 임포트로 드러내는 편이 낫습니다. 나중에 그 코드를 서버나 CLI에서 재사용할 때 경계가 명확합니다.

## 테스트 대상

`lib/counter.dart`

```dart
class Counter {
  int value = 0;

  void increment() => value++;
  void decrement() => value--;
}
```

일부러 단순한 클래스입니다. 테스트 구조를 익히는 것이 목적이라 대상은 가벼울수록 좋습니다.

## 테스트 작성

테스트 파일은 프로젝트 루트의 `test/` 아래에 두고, 관례상 대상 파일 이름에 `_test`를 붙입니다. `flutter test`는 이 디렉터리에서 `_test.dart`로 끝나는 파일만 실행합니다.

`test/counter_test.dart`

```dart
import 'package:fluttertest/counter.dart';
import 'package:test/test.dart';

void main() {
  group('Counter', () {
    test('value should start at 0', () {
      expect(Counter().value, 0);
    });

    test('value should be incremented', () {
      final counter = Counter();
      counter.increment();
      expect(counter.value, 1);
    });

    test('value should be decremented', () {
      final counter = Counter();
      counter.decrement();
      expect(counter.value, -1);
    });
  });
}
```

세 가지 구조가 보입니다.

- **`test(설명, 본문)`**: 테스트 하나. 설명은 실패했을 때 출력되므로 "무엇이 어때야 하는지"를 문장으로 씁니다. `'test1'` 같은 이름은 실패 로그를 읽을 때 아무 도움이 안 됩니다.
- **`group`**: 관련 테스트를 묶습니다. 출력에서 들여쓰기로 표시되고, 이름으로 골라 실행할 수 있습니다. 그룹 안에 `setUp`을 두면 각 테스트 전에 공통 준비를 할 수 있습니다.
- **`expect(실제, 기대)`**: 검증. 두 번째 인자는 값이거나 매처입니다. `equals(1)`, `isA<Album>()`, `throwsException`, `greaterThan(0)` 같은 매처를 쓰면 실패 메시지가 더 구체적으로 나옵니다.

각 테스트는 자기 `Counter`를 새로 만듭니다. 테스트끼리 객체를 공유하면 실행 순서에 따라 결과가 달라지는데, 테스트 러너는 순서를 보장하지 않습니다. 테스트 하나가 독립적으로 실행 가능해야 한다는 것이 가장 중요한 규칙입니다.

## 실행

```bash
flutter test                              # 전체
flutter test test/counter_test.dart       # 파일 하나
flutter test --plain-name "Counter"       # 이름에 Counter 가 들어간 것만
```

```text
00:01 +3: All tests passed!
```

`+3`은 통과한 테스트 수입니다. 실패하면 `-1`이 더해지고 어느 `expect`에서 어떤 값이 나왔는지 출력됩니다.

Dart VM에서 바로 실행되므로 기기나 에뮬레이터가 필요 없고, 수백 개 테스트도 몇 초면 끝납니다. 이 속도가 단위 테스트를 자주 돌리게 만드는 이유입니다. 커밋 전마다, CI에서 매 푸시마다 돌려도 부담이 없습니다.

## 무엇을 단위 테스트로 다룰까

`Counter`처럼 명백한 코드에 테스트를 쓰는 것은 연습으로는 좋지만 실제 가치는 낮습니다. 단위 테스트가 값어치를 하는 곳은 이런 코드입니다.

- **파싱과 변환**: JSON을 모델로 바꾸는 `fromJson`, 날짜 포맷, 금액 계산. 입력 경계값(빈 문자열, null, 음수)을 넣어 보면 버그가 자주 나옵니다.
- **상태 전이**: 장바구니에 담기와 빼기, 폼 검증 규칙. 순서에 따라 결과가 달라지는 로직입니다.
- **조건이 많은 분기**: 할인 정책, 권한 판정. 조건 조합을 표로 만들어 테스트 하나씩 대응시키면 빠진 조합이 보입니다.

반대로 위젯 트리 구성이나 네트워크 호출 자체는 단위 테스트의 대상이 아닙니다. 네트워크에 의존하는 함수를 어떻게 테스트하는지가 다음 편의 주제입니다. 외부 의존성을 가짜로 바꿔 넣는 모킹입니다.

## Reference

- [Flutter — An introduction to unit testing](https://docs.flutter.dev/cookbook/testing/unit/introduction)
- [Dart — test package](https://pub.dev/packages/test)
