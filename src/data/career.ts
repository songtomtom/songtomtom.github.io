// 공개 경력 데이터. 회사·직무·기간·한 줄 역할만 싣는다.
// 프로젝트별 성과·수치·상세 이력은 저장소에 두지 않는다(private/ 은 gitignore).

export const PROFILE = {
  name: "송준영",
  handle: "songtomtom",
  headline: "10년 넘게 프론트엔드, 백엔드, 모바일, 인프라를 다뤘고, 지금은 소프트웨어팀 팀장으로 팀의 표준과 프로세스를 세웁니다.",
  aim: "현장 도메인을 시스템으로 옮기는 일(Forward Deployed)과 팀의 AI 개발 환경을 설계하는 일(Harness)을 지향합니다.",
  summary: [
    "문제 정의. 부서를 고객으로 두고 현장 요구를 듣는 데서 시작해, 도메인을 하나씩 열어 실제 데이터로 검증하며 시스템으로 옮깁니다. 백엔드와 웹의 대부분을 직접 작성합니다.",
    "환경 설계. 프론트엔드 표준, 디자인 시스템, 모노레포, CI/CD를 세워 여러 프로젝트가 같은 속도로 가게 합니다. 최근에는 코딩 에이전트가 팀의 규칙을 지키며 일하게 하는 AI 개발 환경(하네스)을 설계해 팀 저장소에 적용하고 있습니다.",
    "검증. 외부 API는 실제 호출로 확인해 문서와 다른 동작을 고정하고, 변경은 리뷰 기반 PR로 운영합니다. 이 블로그의 글도 예제 저장소에서 실제로 실행한 결과만 인용합니다.",
  ],
  contacts: [
    { label: "GitHub", href: "https://github.com/songtomtom", text: "github.com/songtomtom" },
    { label: "Email", href: "mailto:celvincolvumn@gmail.com", text: "celvincolvumn@gmail.com" },
  ],
};

export const SKILLS: { group: string; items: string[] }[] = [
  { group: "언어", items: ["Go", "TypeScript", "Dart", "Python"] },
  { group: "프론트엔드", items: ["React"] },
  { group: "모바일", items: ["Flutter"] },
  { group: "백엔드", items: ["GraphQL", "gRPC", "Kafka", "MySQL"] },
  { group: "인프라", items: ["Docker", "Kubernetes"] },
];

export type CareerItem = { period: string; company: string; role: string };

export const CAREER: CareerItem[] = [
  { period: "2025.03 – 재직중", company: "주식회사 에이럭스 (ALUX)", role: "소프트웨어팀 팀장" },
  { period: "2024.04 – 2025.03", company: "펀치랩 주식회사", role: "개발 리드 · CTO" },
  { period: "2020.03 – 2023.09", company: "(주)럭스로보", role: "SW팀 웹 파트장" },
  { period: "2019.08 – 2020.03", company: "주식회사 케이이십일", role: "웹 IT 개발팀 사원" },
  { period: "2017.03 – 2019.08", company: "주식회사 원스탑코리아", role: "웹 IT 개발팀 사원" },
  { period: "2016.12 – 2017.03", company: "(주)아이넷캅", role: "보안 개발팀 사원" },
  { period: "2013.02 – 2015.11", company: "(주)수산아이앤티", role: "서비스 개발팀 연구원" },
];
