---
title: "Flutter 기능 단위 아키텍처"
description: "작은 할 일 앱으로 Flutter를 기능 단위로 나누고, 상태를 sealed class와 Dart 3 switch 표현식으로 다루는 구조를 만듭니다."
date: "2026-09-28"
repoURL: "https://github.com/songtomtom/flutter-feature-architecture"
tech: ["Flutter", "Dart 3", "Riverpod", "go_router", "freezed"]
category: mobile
---

화면이 늘어날수록 Flutter 프로젝트는 폴더 구조와 상태 분기에서 먼저 무너집니다. 이 프로젝트는 할 일 목록, 상세, 설정 세 화면짜리 작은 앱으로 그 두 가지를 다루는 방식을 정리한 것입니다. 서버 없이 앱만으로 동작합니다.

- 화면 하나에 필요한 파일은 `features/<기능>/` 한 폴더에 둡니다. 레이어 폴더(`data/`, `domain/`, `presentation/`)는 만들지 않습니다.
- 화면 상태는 freezed sealed class로 정의하고, 위젯에서는 `state.when()` 대신 Dart 3 switch 표현식으로 분기합니다. 빠진 케이스는 컴파일러가 잡습니다.
- 상태 관리, 라우팅, 모델 세 가지 코드 생성기를 `build_runner` 하나로 돌립니다.
- 저장소는 인터페이스와 구현을 나눠 테스트에서 메모리 구현으로 바꿔 끼웁니다.

`app/lib/` 아래 `core`, `features`, `providers`, `shared` 네 디렉터리로 구성되며, 글 4편이 각각 폴더 구조, 상태 분기, 코드 생성, 금지 패턴을 다룹니다.
