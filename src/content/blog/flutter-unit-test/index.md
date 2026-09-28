---
title: "Flutter 단위 테스트(Unit Test)로 코드의 기본 단위 검증하기"
description: "test 패키지로 Counter 클래스의 단위 테스트를 작성하고 group으로 묶어 실행합니다."
date: "2025-01-13"
project: flutter-test
order: 1
canonical: "https://medium.com/@songtomtom/flutter-%EB%8B%A8%EC%9C%84-%ED%85%8C%EC%8A%A4%ED%8A%B8-unit-test-%EB%A1%9C-%EC%BD%94%EB%93%9C%EC%9D%98-%EA%B8%B0%EB%B3%B8-%EB%8B%A8%EC%9C%84-%EA%B2%80%EC%A6%9D%ED%95%98%EA%B8%B0-1d3b399b3a79"
tags:
  - flutter
  - dart
  - testing
---

Flutter 앱 개발에서 단위 테스트는 매우 중요한 부분입니다. 단위 테스트를 통해 앱의 기능을 추가하거나 변경할 때 기존 기능이 정상적으로 작동하는지 확인할 수 있습니다.

## dev:test 패키지 추가

먼저 pubspec.yaml 파일에 테스트 패키지를 추가해야 합니다.

```bash
flutter pub add dev:test
```

테스트 파일은 프로젝트 루트의 test 폴더 안에 위치해야 합니다. lib/counter.dart 파일에 다음과 같이 Counter 클래스를 작성합니다.

`counter.dart`

```dart
class Counter {
  int value = 0;

  void increment() => value++;
  void decrement() => value--;
}
```

<a href="https://medium.com/media/2b8c1c384d7db7487bd1dd0a02d01783/href">https://medium.com/media/2b8c1c384d7db7487bd1dd0a02d01783/href</a>

test/counter_test.dart 파일에 테스트 코드를 작성합니다.

`counter_test.dart`

```dart
import 'package:fluttertest/counter.dart';
import 'package:test/test.dart';

void main() {
  test('Counter value should be incremented', () {
    final counter = Counter();
    counter.increment();
    expect(counter.value, 1);
  });
}
```

<a href="https://medium.com/media/1116418a689999d7bec299de6b71cd0e/href">https://medium.com/media/1116418a689999d7bec299de6b71cd0e/href</a>

여러 관련 테스트를 그룹화하려면 group 함수를 사용합니다.

`counter_test.dart`

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

<a href="https://medium.com/media/4acdc69c1d7edf802837c85dce22ad97/href">https://medium.com/media/4acdc69c1d7edf802837c85dce22ad97/href</a>

## 테스트 실행하기

프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다.

```bash
flutter test test/counter_test.dart
```

특정 그룹의 테스트만 실행하려면 다음 명령어를 실행 합니다.

```bash
flutter test --plain-name "Counter"
```

```bash
flutter test

00:01 +3: All tests passed!       
```

단위 테스트는 코드의 품질을 향상시키고 버그를 조기에 발견하는 데 도움이 됩니다.

## Reference

- [Flutter — An introduction to unit testing](https://docs.flutter.dev/cookbook/testing/unit/introduction)

## Github

- [songtomtom/flutter-test](https://github.com/songtomtom/flutter-test)
