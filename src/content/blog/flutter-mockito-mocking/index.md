---
title: "Mockito 라이브러리를 사용하여 의존성 모킹"
description: "네트워크에 의존하는 함수를 테스트하기 위해 http.Client를 주입 가능하게 바꾸고 Mockito로 가짜 클라이언트를 만듭니다. 왜 코드 생성이 필요한지, when과 thenAnswer의 의미, 모킹을 남용하면 생기는 문제를 정리합니다."
date: "2025-01-13"
project: flutter-test
order: 2
canonical: "https://medium.com/@songtomtom/mockito-%EB%9D%BC%EC%9D%B4%EB%B8%8C%EB%9F%AC%EB%A6%AC%EB%A5%BC-%EC%82%AC%EC%9A%A9%ED%95%98%EC%97%AC-%EC%9D%98%EC%A1%B4%EC%84%B1-%EB%AA%A8%ED%82%B9-fbc0def913d5"
category: mobile
tags:
  - flutter
  - dart
  - testing
  - mockito
---

1편의 `Counter`는 외부에 의존하는 것이 없어서 테스트가 쉬웠습니다. 실제 코드는 대부분 네트워크, 데이터베이스, 시간, 파일 같은 바깥 세계에 기댑니다. 이런 함수를 그대로 테스트하면 인터넷이 끊기면 실패하고, 서버 데이터가 바뀌면 실패하고, 느리고, 실패 케이스(404, 타임아웃)를 재현할 수도 없습니다.

해결은 의존성을 **바꿔 끼울 수 있게** 만들고, 테스트에서는 가짜를 끼우는 것입니다. 이 글은 `http.Client`를 Mockito로 가짜로 바꾸는 과정입니다. 코드는 [songtomtom/flutter-test](https://github.com/songtomtom/flutter-test)에 있습니다.

## 패키지

```bash
flutter pub add http
flutter pub add --dev mockito build_runner
```

`mockito`는 가짜 객체를 만드는 라이브러리이고, `build_runner`는 코드 생성 도구입니다. Mockito가 왜 코드 생성이 필요한지는 아래에서 설명합니다.

## 테스트 가능한 코드로 만들기

먼저 테스트 대상입니다. 원격 API에서 앨범 하나를 가져와 모델로 바꾸는 함수입니다.

`lib/album.dart`

```dart
class Album {
  final int userId;
  final int id;
  final String title;

  const Album({
    required this.userId,
    required this.id,
    required this.title,
  });

  factory Album.fromJson(Map<String, dynamic> json) {
    return switch (json) {
      {
        'userId': int userId,
        'id': int id,
        'title': String title,
      } =>
        Album(
          userId: userId,
          id: id,
          title: title,
        ),
      _ => throw const FormatException('Failed to load album.'),
    };
  }
}
```

`fromJson`은 Dart 3의 패턴 매칭을 씁니다. 키가 없거나 타입이 다르면 `FormatException`이 납니다. 이 부분은 순수 로직이라 1편 방식의 단위 테스트로 검증할 수 있습니다.

`lib/fetch_album.dart`

```dart
import 'dart:convert';

import 'package:fluttertest/album.dart';
import 'package:http/http.dart' as http;

Future<Album> fetchAlbum(http.Client client) async {
  final response = await client
      .get(Uri.parse('https://jsonplaceholder.typicode.com/albums/1'));

  if (response.statusCode == 200) {
    return Album.fromJson(jsonDecode(response.body));
  } else {
    throw Exception('Failed to load album');
  }
}
```

핵심은 `fetchAlbum`이 **`http.Client`를 인자로 받는다**는 점입니다. 함수 안에서 `http.get(...)`을 직접 부르면 테스트가 그 호출을 가로챌 방법이 없습니다. 클라이언트를 밖에서 넣어 주면 앱에서는 진짜 `http.Client()`를, 테스트에서는 가짜를 넣을 수 있습니다. 이것이 의존성 주입이고, 모킹은 그 다음 단계입니다. 주입 구조가 없으면 아무리 좋은 모킹 라이브러리도 소용이 없습니다.

## Mock 클래스 생성

`test/fetch_album_test.dart`의 윗부분입니다.

```dart
import 'package:http/http.dart' as http;
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'fetch_album_test.mocks.dart';

@GenerateMocks([http.Client])
void main() {
  // ...
}
```

```bash
dart run build_runner build
```

`@GenerateMocks([http.Client])`를 보고 `build_runner`가 `fetch_album_test.mocks.dart`에 `MockClient` 클래스를 만들어 줍니다.

왜 코드 생성이 필요할까요. Dart는 null 안전성이 있어서, `http.Client`의 `get` 메서드는 반드시 `Future<Response>`를 돌려줘야 합니다. 예전 Mockito처럼 실행 시점에 아무 메서드나 가로채는 방식으로는 반환 타입을 만족하는 값을 만들 수 없습니다. 그래서 인터페이스를 읽고 타입에 맞는 스텁 메서드를 가진 클래스를 미리 생성합니다. 생성된 파일은 대상 인터페이스가 바뀌면 다시 생성해야 하므로, 저장소에 커밋할지는 팀 규칙에 따르되 `pub get` 후 `build_runner`를 돌리는 단계를 CI에 넣어 둡니다.

## 테스트

```dart
@GenerateMocks([http.Client])
void main() {
  group('fetchAlbum', () {
    test('returns an Album if the http call completes successfully', () async {
      final client = MockClient();
      when(client
              .get(Uri.parse('https://jsonplaceholder.typicode.com/albums/1')))
          .thenAnswer((_) async =>
              http.Response('{"userId": 1, "id": 2, "title": "mock"}', 200));

      expect(await fetchAlbum(client), isA<Album>());
    });

    test('throws an exception if the http call completes with an error', () {
      final client = MockClient();
      when(client
              .get(Uri.parse('https://jsonplaceholder.typicode.com/albums/1')))
          .thenAnswer((_) async => http.Response('Not Found', 404));

      expect(fetchAlbum(client), throwsException);
    });
  });
}
```

`when(...).thenAnswer(...)`가 Mockito의 전부라고 해도 됩니다. "이 인자로 이 메서드가 불리면, 이 값을 돌려줘라"는 선언입니다.

- `thenReturn`이 아니라 `thenAnswer`를 쓰는 이유는 반환값이 `Future`이기 때문입니다. `Future`는 만들어지는 순간 실행이 시작되므로 매번 새로 만들어야 하고, `thenAnswer`의 콜백이 그 역할을 합니다.
- 두 번째 테스트는 네트워크 없이는 재현하기 어려운 404 상황을 한 줄로 만듭니다. 이것이 모킹의 진짜 가치입니다. 성공 경로는 실제 서버로도 확인할 수 있지만, 실패 경로는 가짜가 아니면 안정적으로 만들 수 없습니다.
- 실패 테스트의 `expect(fetchAlbum(client), throwsException)`에는 `await`가 없습니다. `throwsException` 매처가 `Future`를 받아 완료를 기다리며 예외를 검사합니다. `await`를 붙이면 매처에 도달하기 전에 예외가 터져 테스트 자체가 실패합니다.

```bash
flutter test test/fetch_album_test.dart
# 00:01 +2: All tests passed!
```

## 인자 매칭에 대해

지금 테스트는 `Uri.parse('https://...albums/1')`로 정확한 URL을 매칭합니다. `fetchAlbum`이 URL을 조금이라도 바꾸면 스텁이 매칭되지 않아 `MockClient`가 `null`을 돌려주고 테스트는 알아보기 어려운 오류로 실패합니다. URL이 테스트의 관심사가 아니라면 `any`를 쓰는 편이 낫습니다.

```dart
when(client.get(any)).thenAnswer((_) async => http.Response('...', 200));
```

반대로 "정확히 이 URL을 불렀는지"가 관심사라면 `verify(client.get(expectedUri)).called(1)`로 호출 자체를 검증합니다. 반환값을 검사하는 것과 호출을 검사하는 것은 다른 테스트이므로 섞지 않는 편이 읽기 좋습니다.

## 모킹의 함정

모킹은 강력해서 남용하기 쉽습니다. 겪어 본 문제들입니다.

- **구현을 그대로 베낀 테스트.** 함수 안의 호출 순서를 하나하나 `when`으로 정의하면 테스트가 구현과 같은 내용이 됩니다. 리팩터링할 때마다 테스트도 고쳐야 하고, 정작 버그는 못 잡습니다. 모킹은 경계(네트워크, DB)에서만 하고 안쪽 로직은 진짜 객체로 테스트합니다.
- **가짜가 진짜와 다르게 행동하는 경우.** 서버가 실제로는 200과 함께 빈 본문을 돌려주는데 테스트는 항상 정상 JSON을 준다면, 테스트는 통과하고 앱은 죽습니다. 실패 케이스를 넣을 때는 실제 서버가 어떻게 실패하는지 확인하고 씁니다.
- **모킹할 수 없는 구조.** `fetchAlbum`이 클라이언트를 인자로 받지 않았다면 이 글의 모든 것이 불가능했습니다. 테스트 가능성은 라이브러리가 아니라 설계에서 나옵니다. 새 코드를 쓸 때 "이 의존성을 테스트에서 바꿔 끼울 수 있나"를 먼저 물어보는 습관이 모킹 라이브러리보다 중요합니다.

## Reference

- [Flutter — Mock dependencies using Mockito](https://docs.flutter.dev/cookbook/testing/unit/mocking)
- [Flutter — Fetch data from the internet](https://docs.flutter.dev/cookbook/networking/fetch-data)
- [mockito package](https://pub.dev/packages/mockito)
