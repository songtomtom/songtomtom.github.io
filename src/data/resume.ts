// 이력서 데이터. 내용 수정은 이 파일에서만 합니다.
// 원본: 노션 이력서 페이지 (안녕하세요. 송준영입니다.)

export const PROFILE = {
  name: "송준영",
  handle: "songtomtom",
  headline: "10년 이상 웹 프론트엔드, 백엔드, 모바일 앱, 클라우드 인프라를 넘나들어 온 풀스택 개발자",
  summary: [
    "소프트웨어팀 팀장으로 연 13만 명 규모의 국제 로봇·코딩 대회 플랫폼과 교육용 블록코딩 플랫폼을 이끌고, 사내 프론트엔드 표준과 개발 프로세스를 정의했습니다.",
    "이전에는 개발 리드·CTO로 인프라부터 앱, 백엔드까지 전 과정을 주도해 시드 투자 유치와 TIPS 선정을 달성했습니다.",
  ],
  contacts: [
    { label: "Email", href: "mailto:celvincolvumn@gmail.com", text: "celvincolvumn@gmail.com" },
    { label: "GitHub", href: "https://github.com/songtomtom", text: "github.com/songtomtom" },
    { label: "Blog", href: "https://songtomtom.github.io", text: "songtomtom.github.io" },
  ],
};

export const SKILLS: { group: string; items: string[] }[] = [
  { group: "언어", items: ["Go", "TypeScript", "Dart", "Python"] },
  { group: "프론트·앱", items: ["React", "Flutter", "Web USB / Web Serial"] },
  { group: "백엔드", items: ["GraphQL", "gRPC", "Kafka", "MSA"] },
  { group: "인프라", items: ["Docker", "Kubernetes", "AWS EKS", "ArgoCD", "GitHub Actions", "Fastlane"] },
];

export const STRENGTHS: string[] = [
  "소프트웨어팀 리드와 개발 표준 수립",
  "사내 시스템 기획과 데이터 모델 설계",
  "브라우저와 하드웨어를 연결하는 웹 개발 (Web USB·Web Serial)",
  "다국어 서비스와 대규모 현장 이벤트 실시간 시스템 운영",
  "클라우드 네이티브 인프라와 CI/CD 구축",
  "Go 기반 MSA 백엔드와 Flutter 크로스 플랫폼 앱 개발",
];

export type ExperienceLink = { label: string; href: string };

export type ExperienceItem = {
  title: string;
  period?: string;
  /** 접힌 상태에서도 보이는 핵심 성과 한 줄 */
  highlight: string;
  summary: string;
  tasks: string[];
  tech?: string[];
  links?: ExperienceLink[];
};

export type Experience = {
  company: string;
  role: string;
  period: string;
  items: ExperienceItem[];
};

export const EXPERIENCES: Experience[] = [
  {
    company: "주식회사 에이럭스 (ALUX)",
    role: "소프트웨어팀 팀장",
    period: "2025.03 - 재직중",
    items: [
      {
        title: "G-PRC 국제 로봇·코딩 대회 통합 플랫폼 개발",
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
        links: [{ label: "g-prc.com", href: "https://g-prc.com" }],
      },
      {
        title: "AluxCoding 교육용 블록코딩 플랫폼 개발",
        period: "2025.03 - 현재",
        highlight: "설치 없이 브라우저에서 실물 보드에 펌웨어를 올리는 구조 구현. 자체 입력 컴포넌트 26종, 4개 언어",
        summary:
          "브라우저에서 블록으로 코딩해 실제 하드웨어에 펌웨어를 바로 올려 동작시키는 것까지 한 번에 처리하는 초·중등 코딩 교육 플랫폼입니다. CodeTinker, Connect, Technic, 코딩드론, 코딩라이더, VINU 등 자사 하드웨어 제품군을 지원합니다.",
        tasks: [
          "학습자용 블록 코딩 환경, 관리자 앱, E2E 테스트를 하나의 모노레포로 구성",
          "브라우저에서 실물 보드에 직접 펌웨어를 올리는 하드웨어 연동 구조 구현 (별도 프로그램 설치 불필요)",
          "블록 에디터 커스터마이징: 자체 입력 컴포넌트 26종, 블록 정의·툴박스·다국어·렌더러를 독립 모듈로 분리",
          "머신러닝 이미지 분류 학습 모듈 내장",
          "제품 브랜드 사이트 구축 (한·영·일·중 4개 언어)",
          "단위·E2E·타입·린트·커버리지 검사를 표준 명령으로 통일",
          "오픈소스 포크 부분과 자체 개발 부분의 라이선스 이중 관리 체계 정비",
        ],
        tech: ["TypeScript", "React", "Web USB", "Web Serial"],
        links: [{ label: "aluxcoding.com", href: "https://www.aluxcoding.com/ko" }],
      },
      {
        title: "Alux Product 생산·재고 관리 시스템 구축",
        period: "2026.06 - 현재",
        highlight: "생산·재고·구매·품질을 웹과 현장 앱으로 신규 구축. 3개월 PR 280건 이상, UI 규칙 단일 출처화",
        summary:
          "생산지시·실적, 재고 입출고, 구매, 품질(검사·부적합·격리)까지 다루는 사내 생산관리 시스템을 신규 구축했습니다. 웹과 현장용 모바일 앱으로 구성되며, 3개월간 PR 280건 이상을 이슈–PR 추적 체계로 운영했습니다.",
        tasks: [
          "웹: 대시보드, 생산, LOT 단위 재고, 구매, 프로젝트, 품질, 인쇄용 리포트",
          "현장 앱: QR 스캔, 라벨 프린터 연동, 부품 릴 적재 위치 추적(릴파인더) 등 현장 하드웨어 연동",
          "스프레드시트형 편집 테이블과 조회 전용 테이블을 분리하고, 컬럼 데이터 종류가 표시 방식을 결정하는 원칙으로 UI를 단일 출처에서 통제",
          "타이포그래피·색상·테이블 규칙을 문서로 명문화하고 예외는 이유와 함께 관리",
        ],
        tech: ["TypeScript", "React", "Flutter"],
      },
      {
        title: "ALUX Hub 사내 연락처·사업 연결 관리 시스템 기획 및 구축",
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
        title: "AluxCrawl 공공 조달 공고 수집·알림 서비스 개발",
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
    ],
  },
  {
    company: "펀치랩 주식회사",
    role: "개발 리드 · CTO",
    period: "2024.04 - 2025.03",
    items: [
      {
        title: "머머(murmur) 앱 개발 및 투자 유치",
        period: "2024.04 - 2024.09",
        highlight: "Flutter MVP로 시드 투자 유치, 베타로 TIPS 선정",
        summary:
          "Flutter로 머머(murmur) 앱의 MVP를 개발해 시드 투자 유치에 성공했고, 이후 베타 버전 개발을 통해 TIPS 프로그램 선정을 달성했습니다.",
        tasks: [
          "Flutter를 이용한 크로스 플랫폼 앱 개발",
          "go_router를 활용한 라우팅 구현, Provider 패턴 기반 상태 관리",
          "MVP 기획 및 구현, 베타 버전 개발 및 기능 고도화",
          "투자 유치를 위한 기술 프레젠테이션",
        ],
        tech: ["Flutter", "Dart"],
        links: [
          { label: "App Store", href: "https://apps.apple.com/kr/app/id6504162784" },
          { label: "Google Play", href: "https://play.google.com/store/apps/details?id=com.punchylab.murmur" },
        ],
      },
      {
        title: "OpenAI API 기반 LLM 애플리케이션 개발 및 자연어 처리 시스템 구축",
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
      {
        title: "React 기반 관리자 페이지 개발",
        period: "2024.04 - 2025.03",
        highlight: "실시간 데이터 갱신과 시각화를 갖춘 관리자 대시보드 구축",
        summary: "관리자 대시보드 UI/UX를 설계하고 데이터 시각화, 실시간 데이터 업데이트, 반응형 디자인을 적용한 관리자 페이지를 개발했습니다.",
        tasks: ["관리자 대시보드 UI/UX 설계", "데이터 시각화 컴포넌트 개발", "실시간 데이터 업데이트 기능 구현", "반응형 디자인 적용"],
        tech: ["React", "Recoil"],
      },
      {
        title: "MSA 기반 백엔드 서버 개발 및 운영",
        period: "2024.04 - 2025.03",
        highlight: "Go 마이크로서비스 10여 개를 gRPC·GraphQL로 설계·운영",
        summary: "Go로 10여 개의 마이크로서비스 기반 서버를 개발하고 운영했습니다.",
        tasks: [
          "마이크로서비스 설계 및 구현",
          "gRPC를 활용한 서비스 간 통신 구현",
          "GraphQL API 개발",
          "성능 모니터링 및 장애 대응 시스템 구축",
        ],
        tech: ["Go", "gRPC", "GraphQL"],
      },
      {
        title: "AWS EKS 기반 클라우드 인프라 구축",
        period: "2024.04 - 2025.03",
        highlight: "EKS 클러스터, ArgoCD CI/CD, Istio, Prometheus까지 인프라 전 계층 구축",
        summary: "AWS EKS를 활용해 확장 가능하고 안정적인 클라우드 인프라를 구축했습니다.",
        tasks: [
          "Kubernetes 클러스터 설계 및 구현",
          "ArgoCD 기반 CI/CD 파이프라인 구축",
          "Istio 서비스 메시, cert-manager 인증서 자동화, Prometheus 모니터링 구성",
          "컨테이너화된 애플리케이션 배포 관리 및 클라우드 비용 최적화",
        ],
        tech: ["Kubernetes", "Docker", "ArgoCD", "Istio", "Prometheus"],
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
        period: "2022.06 - 2022.08",
        highlight: "MSA 기반 알림·채팅 서버와 실시간 화상 강의 기능 구현",
        summary: "React와 Go로 MODI Planet의 학습 관리 시스템을 개발했습니다. MSA 기반 백엔드와 프론트엔드 지원으로 실시간 화상 강의 플랫폼을 구축했습니다.",
        tasks: ["MSA 기반 알림 및 채팅 서버 개발", "프론트엔드 퍼블리싱 및 컴포넌트 개발 지원", "실시간 화상 강의 기능 구현"],
        tech: ["React", "Go"],
        links: [{ label: "modiplanet.com", href: "https://modiplanet.com" }],
      },
      {
        title: "MODI와 브라우저 간 하드웨어 통신 라이브러리 개발",
        period: "2021.08 - 2022.04",
        highlight: "Web USB로 설치 없이 브라우저와 하드웨어를 직접 통신하는 라이브러리 개발",
        summary: "Web USB로 별도 응용프로그램 설치 없이 브라우저에서 직접 하드웨어와 통신하는 라이브러리를 개발했습니다.",
        tasks: ["Web USB API를 이용한 브라우저-하드웨어 통신 구현", "크로스 플랫폼 호환성 확보", "라이브러리 성능 최적화 및 안정성 테스트"],
        tech: ["Web USB", "TypeScript"],
      },
      {
        title: "글로벌 코딩 IDE 스크래치 최적화 개발",
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
        period: "2013.10 - 2013.11",
        highlight: "실시간 웹 필터링 엔진과 관리자 대시보드 개발",
        summary: "ASP.NET과 MS-SQL로 eWalker 시스템의 핵심 기능을 개발했습니다.",
        tasks: ["유해 웹사이트 데이터베이스 구축 및 관리", "실시간 웹 필터링 엔진 개발", "사용자 맞춤형 차단 설정 및 관리자 대시보드 개발"],
        tech: ["ASP.NET", "MS-SQL"],
      },
      {
        title: "SKB 모바일 유해차단 시스템 B자녀 안심서비스 CMS 개발",
        period: "2014.05 - 2015.05",
        highlight: "보호자용 관리 인터페이스와 실시간 유해 콘텐츠 필터링 CMS 개발",
        summary: "ASP.NET과 MS-SQL로 SKB 자녀 안심서비스 CMS를 개발하고 유지보수했습니다.",
        tasks: ["유해 정보 사이트 및 앱 차단 기능 구현", "보호자용 관리 인터페이스 개발", "실시간 유해 콘텐츠 필터링 시스템 구축", "사용 통계 및 리포트 기능 개발"],
        tech: ["ASP.NET", "MS-SQL"],
      },
    ],
  },
];
