// 이력서 데이터. 내용 수정은 이 파일에서만 합니다.
// 원본: 노션 이력서 페이지 (안녕하세요. 송준영입니다.)

export const PROFILE = {
  name: "송준영",
  handle: "songtomtom",
  headline: "플랫폼을 처음부터 다시 세워 본 개발 리더. 10년 넘게 프론트엔드, 백엔드, 모바일, 인프라를 직접 다뤘고, 지금은 소프트웨어팀 팀장으로 전사 생산·물류 시스템을 설계하며 팀의 표준과 프로세스를 세웁니다.",
  summary: [
    "소프트웨어팀 팀장으로 전사가 쓰는 생산·재고·구매·품질 시스템을 ERP 양방향 연동까지 넉 달 만에 세웠고, 연 13만 명 규모의 국제 로봇·코딩 대회 플랫폼과 교육용 블록코딩 플랫폼을 이끌며 사내 프론트엔드 표준과 개발 프로세스를 정의했습니다.",
    "이전에는 개발 리드·CTO로 인프라부터 앱, 백엔드까지 전 과정을 주도해 시드 투자 유치와 TIPS 선정을 달성했습니다.",
    "표준과 프로세스를 먼저 세우고 그 위에 빠르게 쌓는 방식을 선호합니다. 디자인 시스템, 코드 컨벤션, PR 리뷰 같은 기반을 한 번 만들어 여러 프로젝트가 같은 속도로 나아가게 하는 일에 가장 보람을 느낍니다.",
  ],
  contacts: [
    { label: "Email", href: "mailto:celvincolvumn@gmail.com", text: "celvincolvumn@gmail.com" },
    { label: "GitHub", href: "https://github.com/songtomtom", text: "github.com/songtomtom" },
    // 인쇄(PDF)에서만 표시. 웹에서는 자기 자신을 가리키므로 숨긴다.
    { label: "Blog", href: "https://songtomtom.github.io", text: "songtomtom.github.io", printOnly: true },
  ],
};

export const SKILLS: { group: string; items: string[] }[] = [
  { group: "언어", items: ["Go", "TypeScript", "Dart", "Python"] },
  { group: "프론트엔드", items: ["React"] },
  { group: "모바일", items: ["Flutter"] },
  { group: "백엔드", items: ["GraphQL", "gRPC", "Kafka", "MySQL"] },
  { group: "인프라", items: ["Docker", "Kubernetes"] },
];

export const STRENGTHS: string[] = [
  "소프트웨어팀 리드와 개발 표준 수립",
  "전사 업무 시스템(생산·재고·ERP 연동) 설계와 구축",
  "레거시 플랫폼의 전면 재구축과 자체 엔진 설계",
  "다국어 서비스와 대규모 현장 이벤트 실시간 시스템 운영",
  "사내 시스템 기획과 데이터 모델 설계",
  "Go 기반 MSA 백엔드와 Flutter 크로스 플랫폼 앱 개발",
  "클라우드 네이티브 인프라와 CI/CD 구축",
];

import type { Category } from "@lib/categories";

export type ExperienceLink = { label: string; href: string };

export type ExperienceItem = {
  title: string;
  period?: string;
  /** 이 항목에서 다룬 분야. 뱃지로 표시 */
  categories?: Category[];
  /** 접힌 상태에서도 보이는 핵심 성과 한 줄 */
  highlight: string;
  summary: string;
  tasks: string[];
  tech?: string[];
  links?: ExperienceLink[];
  /** 프로젝트 페이지 id (src/content/projects/<id>). 있으면 "자세히 보기" 링크 */
  project?: string;
};

export type Experience = {
  company: string;
  role: string;
  period: string;
  items: ExperienceItem[];
};

// 각 경력의 프로젝트는 시작 시점 기준 최신순으로 정렬한다 (같은 달이면 적힌 순서 유지).
const startOf = (period: string | undefined, fallback: string) => (period ?? fallback).slice(0, 7);
const sortItems = (list: Experience[]): Experience[] =>
  list.map((e) => ({
    ...e,
    items: [...e.items].sort((a, b) => startOf(b.period, e.period).localeCompare(startOf(a.period, e.period))),
  }));

export const EXPERIENCES: Experience[] = sortItems([
  {
    company: "주식회사 에이럭스 (ALUX)",
    role: "소프트웨어팀 팀장",
    period: "2025.03 - 재직중",
    items: [
      {
        title: "G-PRC 국제 로봇·코딩 대회 통합 플랫폼 개발",
        project: "gprc",
        categories: ["frontend", "backend", "mobile", "infra"],
        period: "2025.03 - 현재",
        highlight: "참가자 13만 명, 8개국 대회에 앱 접수·실시간 심사 중계 도입. 10개 저장소, PR 200건 이상 리뷰 기반 운영",
        summary:
          "로봇·드론·코딩 3개 분야, 6개 종목으로 열리는 국제 대회의 참가 신청부터 지역 예선·글로벌 결선 운영, 현장 실시간 중계, 시상식, 경품 추첨까지 대회 전 주기를 다루는 다국어 플랫폼을 구축했습니다. 총 10개 저장소로 구성되어 있으며, 공식 사이트 저장소 기준 PR 200건 이상을 PR 리뷰 기반 팀 개발 프로세스로 운영했습니다.",
        tasks: [
          "대회 공식 사이트(일정·규정·역대기록·참가신청·심판 신청) 및 통합 관리자 대시보드 개발",
          "참가자·현장 운영용 모바일 앱: 오프라인 데이터 관리, QR 스캔, 전자서명",
          "현장 라이브 중계 앱: 종목별 중계 화면, 실시간 스트리밍",
          "진행상황 전광판, 시상식 실시간 연출 화면, 럭키드로우 추첨 화면",
          "본선 참가자 신원 확인 및 개인정보·초상권 동의서 디지털 서명",
          "6개 언어(ko·en·ja·ms·zh-CN·zh-HK) 약관 및 다국어 라우팅 체계 구축",
          "유료 참가 신청 결제 흐름, 소셜 로그인, 사용자 행동 분석 지표 설계",
          "기존 웹의 전면 재구축 마이그레이션 계획 수립 및 주도",
          "대회 규모: 2025년 제11회 코엑스 A홀, 참가자 13만 명 이상, 해외 8개국. 이 회차에 앱 기반 접수와 실시간 심사 중계 도입",
        ],
        tech: ["TypeScript", "React", "Flutter", "Go"],
        links: [
          { label: "g-prc.com", href: "https://g-prc.com" },
          { label: "App Store", href: "https://apps.apple.com/kr/app/gprc/id6745237554" },
          { label: "Google Play", href: "https://play.google.com/store/apps/details?id=com.alux.aluxcontest" },
        ],
      },
      {
        title: "AluxLabs 블록코딩 플랫폼: Scratch 전면 마이그레이션 및 자체 실행 엔진 개발",
        project: "aluxlabs",
        categories: ["frontend", "backend"],
        period: "2025.03 - 현재",
        highlight: "Scratch 3를 React·Blockly 12로 전면 재구축하고 scratch-vm 없이 7만 줄 규모의 자체 런타임을 설계. 16개월, PR 900건 이상",
        summary:
          "Scratch 3 기반이던 초·중등 코딩 교육 플랫폼을 React·TypeScript·Blockly 12로 전면 마이그레이션하고, scratch-vm을 걷어낸 자체 실행 엔진을 만들었습니다. AI 블록, GraphQL 백엔드, 자사 하드웨어 제품군과의 결합을 원본 Scratch 구조로는 감당할 수 없다고 판단해 내린 결정이었고, 이후 콘텐츠·하드웨어 확장의 기반이 됐습니다. CodeTinker, Connect, Technic, 코딩드론, 코딩라이더, VINU 등 자사 하드웨어를 지원합니다.",
        tasks: [
          "자체 실행 엔진 설계: 블록 실행·스케줄러·모니터·프로파일러를 갖춘 런타임, 무거운 작업(SB3 로드, Vision AI 추론)은 Web Worker로 분리",
          "블록 에디터를 scratch-blocks에서 Blockly 12로 교체. Scratch 스타일 렌더러·테마·연속 툴박스·커스텀 필드 26종을 독립 라이브러리로 분리",
          "Vision AI 블록(얼굴·손·자세·사물 인식, 이미지 분류)을 TensorFlow.js·MediaPipe로 구현, Google Teachable Machine 모델 연동",
          "브라우저에서 설치 없이 실물 보드에 펌웨어 업로드(AVR·nRF), BLE·Web Serial·로컬 브리지 세 경로의 하드웨어 통신 계층",
          "자사 하드웨어 확장 블록 20여 종과 미션형 콘텐츠용 관리자 앱",
          "Nx 모노레포(앱 3개, 라이브러리 18개)로 전환, webpack → Vite, GraphQL 코드 생성, 단위·E2E·타입·린트 검사 표준화",
          "오픈소스 포크 부분과 자체 개발 부분의 라이선스 이중 관리 체계 정비",
        ],
        tech: ["TypeScript", "React", "Blockly", "TensorFlow.js", "Web Serial", "Web Bluetooth", "Nx", "GraphQL"],
      },
      {
        title: "Alux Product 전사 생산·물류 관리 시스템 구축 (ERP 양방향 연동)",
        project: "alux-product",
        categories: ["frontend", "backend", "mobile"],
        period: "2026.06 - 현재",
        highlight: "생산·재고·구매·품질·외주를 Go 마이크로서비스 8개와 웹·현장 앱으로 넉 달 만에 신규 구축. 기존 ERP와 양방향 동기화, 웹 PR 390건·백엔드 커밋 2,000건 이상 직접 작성",
        summary:
          "엑셀과 ERP 수기 입력에 의존하던 전사 생산·물류 업무를 하나의 시스템으로 옮겼습니다. 생산지시·실적, LOT 단위 재고 입출고, 구매·외주 발주와 마감, 품질(검사·부적합·격리), 프로젝트까지 다루며, 기존 ERP와 품목·BOM·전표를 양방향으로 동기화해 현장은 이 시스템만 쓰고 회계는 ERP에 그대로 남게 했습니다. 도메인 복잡도와 ERP 정합성 때문에 지금까지 만든 것 중 가장 어려운 시스템이었고, 백엔드·웹의 대부분을 직접 작성했습니다.",
        tasks: [
          "백엔드: 재고·생산·구매·품질·프로젝트·ERP·알림·사용자 8개 Go 서비스를 GraphQL Federation으로 묶고 ent 스키마 233개로 도메인 모델링",
          "ERP 양방향 연동: 품목·BOM·거래처·공정 가져오기 CronJob 8종, 생산지시·외주발주·매출마감 전표 역동기화를 5단계로 도입. 취소·삭제 안전망과 멱등키로 재전송 결함 방지",
          "웹(141 라우트): 대시보드, MRP, LOT 추적, 공정 일괄 적용, 승인·감사 이력, 인쇄용 리포트. 스프레드시트형 편집 테이블과 조회 테이블을 분리하고 컬럼 데이터 종류가 표시를 결정하는 원칙으로 UI 단일 출처화",
          "현장 앱(Flutter): QR 스캔 입출고, 라벨 프린터 연동, 부품 릴 적재 위치 추적, 현재고 드릴다운 집계",
          "타이포그래피·색상·테이블 규칙을 문서화하고 예외는 이유와 함께 관리. 이슈–PR 추적 체계로 웹 PR 390건, 앱 PR 47건 운영",
        ],
        tech: ["Go", "GraphQL Federation", "ent", "PostgreSQL", "TypeScript", "React", "Flutter"],
      },
      {
        title: "ALUX Hub 사내 연락처·사업 연결 관리 시스템 기획 및 구축",
        project: "alux-hub",
        categories: ["backend"],
        period: "2026.06 - 현재",
        highlight: "연락처 1,150명·사업 50여 건을 엔티티 8종으로 통합 설계. 기획부터 로드맵까지 직접 작성",
        summary:
          "흩어져 있던 연락처 명부와 사업관리 엑셀을 하나의 권한 통제 시스템으로 통합해, 이 사업에 관련된 사람이 누구인지와 이 사람이 어떤 사업과 엮여 있는지를 양방향으로 조회하게 만들었습니다.",
        tasks: [
          "기획·데이터 모델·로드맵 명세를 직접 작성 (연락처 약 1,150명, 사업 50여 건 마이그레이션)",
          "핵심 엔티티 8종과 연결 테이블 6종 설계. 회사를 단일 마스터로 두어 두 엑셀의 자동 매칭을 가능하게 함",
          "3단 권한(Admin/Editor/Viewer)과 전체 변경 이력 기록 설계",
          "명함 촬영 후 자동 인식·검수 등록 기능 정의",
          "회사명 표기 불일치 정규화, 누락된 사업 연결 백필 등 데이터 정합성 선결 과제를 사전 식별",
          "5단계 단계별 도입 로드맵 수립 후 경영진 검토 절차로 연결",
        ],
      },
      {
        title: "Flow 로봇 코딩 앱 개발 (블록 → C 코드 → 보드 업로드)",
        project: "alux-flow",
        categories: ["mobile", "frontend"],
        period: "2026.01 - 현재",
        highlight: "Flutter와 Blockly WebView 하이브리드로 5개 플랫폼 지원. 초기 아키텍처·CI·스토어 배포 구축, Play Store 출시",
        summary:
          "Blockly로 블록을 조립하면 C 코드를 생성해 서버에서 컴파일하고 USB로 ATmega 보드에 바로 올리는 로봇 코딩 앱입니다. Flutter 앱 안에 Blockly 에디터를 WebView로 얹는 하이브리드 구조를 설계했고, Android·iOS·macOS·Windows·Web을 한 코드베이스로 지원합니다.",
        tasks: [
          "Flutter ↔ Blockly(React/TS) 브리지 설계: WebView JS 핸들러 하나로 통신 경로를 고정하고 양쪽 코드베이스를 분리",
          "Blockly C 코드 생성기, GraphQL 컴파일 요청, USB Serial·Web Serial 보드 업로드 흐름 구현",
          "플랫폼별 분기 원칙 수립(삭제·교체 금지, 추가·분기만 허용)으로 5개 플랫폼 동시 유지",
          "Fastlane·GitHub Actions CI/CD, Firebase App Distribution, Play Store 배포 파이프라인 구축",
          "feature 단위 코로케이션, Riverpod·freezed·Dart 3 switch 표현식 기반 상태 관리 규칙 정립",
        ],
        tech: ["Flutter", "Dart", "Blockly", "TypeScript", "GraphQL", "USB Serial"],
        links: [{ label: "Google Play", href: "https://play.google.com/store/apps/details?id=com.aluxrobot.flow" }],
      },
      {
        title: "AluxCrawl 공공 조달 공고 수집·알림 서비스 개발",
        project: "aluxcrawl",
        categories: ["frontend", "backend", "mobile"],
        period: "2026.01 - 2026.06",
        highlight: "사내 프론트엔드 표준과 디자인 시스템을 여기서 정의해 이후 두 프로젝트가 파생",
        summary:
          "나라장터·국방전자조달 등 공공 입찰·공고를 자동 수집해 사내 담당자에게 알려주는 사내 서비스입니다.",
        tasks: [
          "웹 콘솔: 대시보드, 크롤러 관리, 조달 시스템별 공고 조회, 알림, API 문서 및 플레이그라운드",
          "모바일 앱: 로그인, 공고 조회, 알림 수신",
          "사내 프론트엔드 표준을 이 프로젝트에서 정의. 디자인 시스템과 인증 구조를 ALUX Hub·Alux Product가 그대로 파생해 사용",
          "서비스별 테마 컬러 체계를 정해 사내 서비스군을 시각적으로 구분",
        ],
        tech: ["TypeScript", "React", "Flutter", "Python"],
      },
      {
        title: "AluxCoding 제품 브랜드 사이트 구축",
        project: "aluxcoding",
        categories: ["frontend"],
        period: "2025.12 - 현재",
        highlight: "4개 언어 제품 소개·상세·문의 사이트. 블록코딩 체험 데모를 사이트 안에 내장",
        summary:
          "교육용 하드웨어·소프트웨어 제품군을 소개하는 브랜드 사이트입니다. 한·영·일·중 4개 언어 라우팅, 제품별 상세 페이지, 문의 흐름을 갖추고, 사이트 안에서 바로 블록코딩을 체험할 수 있는 데모를 넣었습니다.",
        tasks: [
          "제품 상세·비교 페이지와 제품별 로고·배지 체계, 문의 폼",
          "4개 언어(ko·en·ja·zh-CN) 로케일 라우팅과 번역 리소스 관리",
          "AluxLabs 블록 에디터를 축소 내장한 체험 데모 컴포넌트",
          "GraphQL 연동, 태블릿·데스크톱 목업 컴포넌트로 제품 화면 소개",
        ],
        tech: ["TypeScript", "React", "Vite", "GraphQL"],
        links: [{ label: "aluxcoding.com", href: "https://www.aluxcoding.com/ko" }],
      },
    ],
  },
  {
    company: "펀치랩 주식회사",
    role: "개발 리드 · CTO",
    period: "2024.04 - 2025.03",
    items: [
      {
        title: "머머(murmur) 앱 개발 및 투자 유치",
        categories: ["mobile", "backend", "infra"],
        period: "2024.04 - 2025.03",
        highlight: "Flutter MVP로 시드 투자, 베타로 TIPS 선정. 앱부터 Go 마이크로서비스·EKS 인프라까지 혼자 구축",
        summary:
          "Flutter로 머머(murmur) 앱의 MVP를 개발해 시드 투자 유치에 성공했고, 베타 버전으로 TIPS 프로그램에 선정됐습니다. 앱과 함께 Go 마이크로서비스 백엔드, AWS EKS 인프라, 운영용 관리자 대시보드까지 직접 구축해 운영했습니다.",
        tasks: [
          "Flutter 크로스 플랫폼 앱: go_router 라우팅, Provider 상태 관리, MVP → 베타 고도화",
          "Go 마이크로서비스 10여 개를 gRPC 내부 통신·GraphQL 외부 API로 구성",
          "AWS EKS 클러스터, ArgoCD 배포, Istio, cert-manager, Prometheus를 직접 구축해 운영",
          "운영 데이터를 보는 React 관리자 대시보드(실시간 갱신)",
          "투자 유치를 위한 기술 프레젠테이션",
        ],
        tech: ["Flutter", "Dart", "Go", "gRPC", "GraphQL", "Kubernetes", "ArgoCD"],
        links: [
          { label: "App Store", href: "https://apps.apple.com/kr/app/id6504162784" },
          { label: "Google Play", href: "https://play.google.com/store/apps/details?id=com.punchylab.murmur" },
        ],
      },
      {
        title: "OpenAI API 기반 LLM 애플리케이션 개발 및 자연어 처리 시스템 구축",
        categories: ["backend"],
        period: "2024.04 - 2025.03",
        highlight: "LLM과 spaCy·NLTK를 결합한 하이브리드 NLP 시스템 설계",
        summary:
          "OpenAI GPT 모델을 활용해 자연어 처리 기능을 갖춘 애플리케이션을 개발하고, spaCy와 NLTK로 텍스트 분석·처리 시스템을 구축했습니다.",
        tasks: [
          "OpenAI API를 활용한 대화형 AI 시스템 개발 및 프롬프트 엔지니어링을 통한 출력 최적화",
          "spaCy를 이용한 텍스트 처리 및 개체명 인식",
          "NLTK를 활용한 토큰화, 품사 태깅, 구문 분석",
          "LLM과 전통적 NLP 기술을 결합한 하이브리드 시스템 설계",
        ],
        tech: ["OpenAI API", "Python", "spaCy", "NLTK"],
      },
    ],
  },
  {
    company: "(주)럭스로보",
    role: "SW팀 웹 파트장",
    period: "2020.03 - 2023.09",
    items: [
      {
        title: "코딩 교육, 실시간 화상 강의 LMS(MODI Planet) 개발",
        categories: ["backend", "frontend"],
        period: "2022.06 - 2022.08",
        highlight: "MSA 기반 알림·채팅 서버와 실시간 화상 강의 기능 구현",
        summary: "React와 Go로 MODI Planet의 학습 관리 시스템을 개발했습니다. MSA 기반 백엔드와 프론트엔드 지원으로 실시간 화상 강의 플랫폼을 구축했습니다.",
        tasks: ["MSA 기반 알림 및 채팅 서버 개발", "프론트엔드 퍼블리싱 및 컴포넌트 개발 지원", "실시간 화상 강의 기능 구현"],
        tech: ["React", "Go"],
        links: [{ label: "modiplanet.com", href: "https://modiplanet.com" }],
      },
      {
        title: "MODI와 브라우저 간 하드웨어 통신 라이브러리 개발",
        categories: ["frontend"],
        period: "2021.08 - 2022.04",
        highlight: "Web USB로 설치 없이 브라우저와 하드웨어를 직접 통신하는 라이브러리 개발",
        summary: "Web USB로 별도 응용프로그램 설치 없이 브라우저에서 직접 하드웨어와 통신하는 라이브러리를 개발했습니다.",
        tasks: ["Web USB API를 이용한 브라우저-하드웨어 통신 구현", "크로스 플랫폼 호환성 확보", "라이브러리 성능 최적화 및 안정성 테스트"],
        tech: ["Web USB", "TypeScript"],
      },
      {
        title: "글로벌 코딩 IDE 스크래치 최적화 개발",
        categories: ["frontend"],
        period: "2020.04 - 2020.05",
        highlight: "오픈소스 스크래치를 React·TypeScript로 재구성해 자사 IDE로 전환",
        summary: "오픈소스 스크래치 프로젝트를 분석·최적화해 자사 맞춤형 코딩 IDE를 개발했습니다.",
        tasks: ["스크래치 소스 코드 분석", "자사 최적화 라이브러리 분리 작업", "React와 TypeScript를 이용한 프로젝트 재구성"],
        tech: ["React", "TypeScript"],
        links: [{ label: "modiplanet.com/moditor", href: "https://modiplanet.com/moditor" }],
      },
    ],
  },
  {
    company: "주식회사 케이이십일",
    role: "웹 IT 개발팀 사원",
    period: "2019.08 - 2020.03",
    items: [
      {
        title: "우리차이나 통합 LMS 개발",
        categories: ["frontend", "backend"],
        highlight: "AngularJS·Express 기반 LMS 구축, MySQL에서 MongoDB로 마이그레이션",
        summary: "AngularJS, Express, MongoDB로 우리차이나의 통합 학습 관리 시스템을 개발했습니다.",
        tasks: [
          "AngularJS를 이용한 반응형 프론트엔드 개발",
          "Express 기반 RESTful API 설계 및 구현",
          "MySQL에서 MongoDB로의 데이터베이스 마이그레이션",
          "시스템 배포 및 운영 관리",
        ],
        tech: ["AngularJS", "Express", "MongoDB"],
        links: [{ label: "urichina.com", href: "https://www.urichina.com" }],
      },
    ],
  },
  {
    company: "주식회사 원스탑코리아",
    role: "웹 IT 개발팀 사원",
    period: "2017.03 - 2019.08",
    items: [
      {
        title: "원스탑코리아 웹사이트 리뉴얼",
        categories: ["frontend", "backend"],
        period: "2017.10 - 2018.01",
        highlight: "번역 서비스 요청 프로세스를 간소화한 반응형 사이트로 전면 개편",
        summary: "PHP와 MySQL로 번역 서비스 전문 기업 원스탑코리아의 웹사이트를 전면 개선했습니다.",
        tasks: ["PHP 동적 웹페이지 개발 및 MySQL 데이터베이스 설계", "반응형 웹 디자인 구현", "번역 서비스 요청 프로세스 간소화 및 성능 최적화"],
        tech: ["PHP", "MySQL"],
        links: [{ label: "1stopkorea.co.kr", href: "http://1stopkorea.co.kr" }],
      },
    ],
  },
  {
    company: "(주)아이넷캅",
    role: "보안 개발팀 사원",
    period: "2016.12 - 2017.03",
    items: [
      {
        title: "KT 모바일 백신 T가드 서버 개발 및 운영",
        categories: ["backend"],
        highlight: "백신 엔진 서버 운영과 실시간 바이러스 DB 업데이트 시스템 구축",
        summary: "PHP와 MySQL로 KT 모바일 백신 서비스 T가드의 백신 엔진 서버를 개발하고 운영했습니다.",
        tasks: ["백신 엔진 서버 관리 및 최적화", "실시간 바이러스 데이터베이스 업데이트 시스템 구축", "서버 성능 모니터링 및 보안 강화"],
        tech: ["PHP", "MySQL"],
        links: [{ label: "inetcop.org/antivirus", href: "https://www.inetcop.org/antivirus" }],
      },
    ],
  },
  {
    company: "(주)수산아이앤티",
    role: "서비스 개발팀 연구원",
    period: "2013.02 - 2015.11",
    items: [
      {
        title: "통신사 인터넷 사용자 단말 판단 인증 시스템 운영",
        categories: ["backend", "infra"],
        highlight: "KT·SKT·LGU+ 단말 인증 시스템 운영, ASP에서 Spring으로 마이그레이션",
        summary: "Spring과 MySQL로 KT, SKT, LGU+ 인터넷 사용자의 단말 판단 인증 시스템을 개발·운영했습니다.",
        tasks: [
          "대규모 서버 인프라 구축 및 관리",
          "통신사 간 실시간 데이터 동기화 시스템 개발",
          "ASP에서 Spring으로 시스템 마이그레이션, MS-SQL에서 MySQL로 데이터베이스 마이그레이션",
          "서비스 모니터링 및 장애 대응 시스템 구축",
        ],
        tech: ["Spring", "MySQL"],
        links: [{ label: "soosanint.com", href: "https://www.soosanint.com/contents.php?con_id=service1" }],
      },
      {
        title: "eWalker 유해사이트 차단 솔루션 개발",
        categories: ["backend"],
        period: "2013.10 - 2013.11",
        highlight: "실시간 웹 필터링 엔진과 관리자 대시보드 개발",
        summary: "ASP.NET과 MS-SQL로 eWalker 시스템의 핵심 기능을 개발했습니다.",
        tasks: ["유해 웹사이트 데이터베이스 구축 및 관리", "실시간 웹 필터링 엔진 개발", "사용자 맞춤형 차단 설정 및 관리자 대시보드 개발"],
        tech: ["ASP.NET", "MS-SQL"],
      },
      {
        title: "SKB 모바일 유해차단 시스템 B자녀 안심서비스 CMS 개발",
        categories: ["backend"],
        period: "2014.05 - 2015.05",
        highlight: "보호자용 관리 인터페이스와 실시간 유해 콘텐츠 필터링 CMS 개발",
        summary: "ASP.NET과 MS-SQL로 SKB 자녀 안심서비스 CMS를 개발하고 유지보수했습니다.",
        tasks: ["유해 정보 사이트 및 앱 차단 기능 구현", "보호자용 관리 인터페이스 개발", "실시간 유해 콘텐츠 필터링 시스템 구축", "사용 통계 및 리포트 기능 개발"],
        tech: ["ASP.NET", "MS-SQL"],
      },
    ],
  },
]);
