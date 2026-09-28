---
title: "Mockito 라이브러리를 사용하여 의존성 모킹"
description: "Mockito와 build_runner로 http.Client를 모킹해 네트워크 의존성이 있는 함수의 성공과 실패 케이스를 테스트합니다."
date: "2025-01-13"
project: flutter-test
order: 2
canonical: "https://medium.com/@songtomtom/mockito-%EB%9D%BC%EC%9D%B4%EB%B8%8C%EB%9F%AC%EB%A6%AC%EB%A5%BC-%EC%82%AC%EC%9A%A9%ED%95%98%EC%97%AC-%EC%9D%98%EC%A1%B4%EC%84%B1-%EB%AA%A8%ED%82%B9-fbc0def913d5"
tags:
  - flutter
  - dart
  - testing
  - mockito
---

Mockito 패키지를 사용하여 의존성을 모킹하는 방법을 살펴보겠습니다.

## 패키지 의존성 추가

먼저 pubspec.yaml 파일에 필요한 패키지들을 추가합니다.

```bash
flutter pub add http
flutter pub add --dev mockito build_runner
```

`pubspec.yaml` — mockito 설치 의존성

```yaml
dependencies:
  flutter:
    sdk: flutter


  # The following adds the Cupertino Icons font to your application.
  # Use with the CupertinoIcons class for iOS style icons.
  cupertino_icons: ^1.0.6
  http: ^1.2.2

dev_dependencies:
  flutter_test:
    sdk: flutter

  # The "flutter_lints" package below contains a set of recommended lints to
  # encourage good coding practices. The lint set provided by the package is
  # activated in the `analysis_options.yaml` file located at the root of your
  # package. See that file for information about deactivating specific lint
  # rules and activating additional ones.
  flutter_lints: ^3.0.0
  test: ^1.25.2
  mockito: ^5.4.4
  build_runner: ^2.4.11
```

<a href="https://medium.com/media/3a68b916cc1ab3d3f2205af0008f8540/href">https://medium.com/media/3a68b916cc1ab3d3f2205af0008f8540/href</a>

## 테스트할 함수 준비

다음과 같이 Album 클래스와 http.Client를 매개변수로 받는 함수를 준비합니다.

`album.dart`

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

<a href="https://medium.com/media/2fe9119b9fde3fce3353610f7f5ef178/href">https://medium.com/media/2fe9119b9fde3fce3353610f7f5ef178/href</a>

`fetch_album.dart`

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

<a href="https://medium.com/media/4f282a398d082a573b6e399b753e6496/href">https://medium.com/media/4f282a398d082a573b6e399b753e6496/href</a>

## 테스트 파일 생성

test/fetch_album_test.dart 파일을 생성하고 다음 코드를 추가합니다.

`fetch_album_test.dart` — mocking 추가 하기전 테스트파일

```dart
import 'package:http/http.dart' as http;
import 'package:mockito/annotations.dart';

@GenerateMocks([http.Client])
void main() {
  // 테스트 코드는 여기에 작성됩니다.
}
```

<a href="https://medium.com/media/5f865cb6f2e5acc27230a780baf04818/href">https://medium.com/media/5f865cb6f2e5acc27230a780baf04818/href</a>

## Mock 생성

터미널에서 다음 명령을 실행하여 Mock 클래스를 생성합니다.

```bash
dart run build_runner build
```

Mock 생성에 성공햇다면 fetch_album_test.mocks.dart 가 생성됩니다.

## 테스트 작성

성공과 실패 케이스에 대한 테스트를 작성합니다.

`fetch_album_test.dart`

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:fluttertest/album.dart';
import 'package:fluttertest/fetch_album.dart';
import 'package:http/http.dart' as http;
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'fetch_album_test.mocks.dart';

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

<a href="https://medium.com/media/0a7975ee779a786e621dc97f2f771bef/href">https://medium.com/media/0a7975ee779a786e621dc97f2f771bef/href</a>

다음 명령으로 테스트를 실행합니다.

```bash
flutter test test/fetch_album_test.dart

00:01 +2: All tests passed!                                           
```

## Reference

- [Flutter — Mock dependencies using Mockito](https://docs.flutter.dev/cookbook/testing/unit/mocking)
- [Flutter — Fetch data from the internet](https://docs.flutter.dev/cookbook/networking/fetch-data)

## Github

- [songtomtom/flutter-test](https://github.com/songtomtom/flutter-test)
