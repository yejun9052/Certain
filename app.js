const app = document.querySelector('#app');
const breadcrumbs = document.querySelector('#breadcrumbs');
const sidebar = document.querySelector('#sidebar');
const toast = document.querySelector('#toast');
const searchModal = document.querySelector('#search-modal');
const searchInput = document.querySelector('#global-search');
const searchResults = document.querySelector('#search-results');
const authModal = document.querySelector('#auth-modal');
const authForm = document.querySelector('#auth-form');
const PDF_FILE = '(SW개발)2026학년도 산학일체형 도제학교 일학습병행 외부평가 학습교재(SW개발_L3).pdf';
const PDF_URL = encodeURI(PDF_FILE);

const icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7V5Z" /></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16M7 7h9M7 11h9" /></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m13.8 6.2 4 4M4.5 20h5" /></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.2 4.45 4.9.71-3.55 3.46.84 4.88L12 14.2l-4.39 2.3.84-4.88L4.9 8.16l4.9-.71L12 3Z" /></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>',
  bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" /></svg>',
  rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.65L4 8.7" /><path d="M4 4v4.7h4.7" /></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 10v6M12 7.2v.1" /></svg>'
};

const units = [
  {
    id: 'deploy', number: '01', title: '애플리케이션 배포', code: 'LM2001020214_23v6',
    description: '소스코드를 실행 가능한 형태로 만들고 운영 환경에 안전하게 전달하는 흐름을 익혀요.',
    goal: '배포 대상 시스템의 특징을 파악하고, 배포에 필요한 도구와 절차를 구성할 수 있다.',
    topics: [
      ['배포 환경', '빌드·웹 서버·WAS'], ['형상관리', '체크아웃·체크인'], ['CI 파이프라인', '검증·패키징·자동화'], ['운영과 복원', '점검·롤백·모니터링']
    ],
    highlight: '환경 구성 → 소스 검증 → 빌드 → 운영 배포'
  },
  {
    id: 'testing', number: '02', title: '애플리케이션 테스트 수행', code: 'LM2001020227_23v6',
    description: '테스트 설계부터 결함 기록·재확인까지 품질을 관리하는 방법을 학습해요.',
    goal: '테스트 계획에 따라 기능과 인터페이스가 요구사항을 충족하는지 검증할 수 있다.',
    topics: [
      ['V-모델', '개발 단계와 테스트'], ['테스트 유형', '단위·통합·시스템·인수'], ['결함 관리', '기록·수정·재테스트'], ['품질 지표', '심각도·우선순위·회귀']
    ],
    highlight: '단위 → 통합 → 시스템 → 인수 테스트'
  },
  {
    id: 'basic-tech', number: '03', title: '응용SW 기초 기술 활용', code: 'LM2001020232_23v5',
    description: '네트워크 계층부터 미들웨어, 관계형 데이터베이스의 기본을 연결해서 이해해요.',
    goal: '네트워크와 데이터베이스의 핵심 구조를 식별하고 응용소프트웨어에 활용할 수 있다.',
    topics: [
      ['네트워크', 'OSI·TCP/IP·포트'], ['미들웨어', 'WAS·메시지 큐'], ['관계형 DB', '키·ERD·스키마'], ['데이터 무결성', '정규화·CRUD·트랜잭션']
    ],
    highlight: '프로토콜 → 미들웨어 → 데이터베이스'
  },
  {
    id: 'environment', number: '04', title: '개발자 환경 구축', code: 'LM2001020233_23v5',
    description: '운영체제와 개발 도구를 설치·설정하고 안정적인 개발 환경을 만들어봐요.',
    goal: '개발 업무에 필요한 운영체제와 도구를 설치하고 기본 기능을 활용할 수 있다.',
    topics: [
      ['운영체제', 'Windows·UNIX·Linux'], ['Linux 명령어', '파일·권한·프로세스'], ['개발 도구', 'IDE·Git·빌드 도구'], ['디버깅', '중단점·변수 감시']
    ],
    highlight: 'OS 설치 → 도구 구성 → 디버깅 환경'
  },
  {
    id: 'ui-test', number: '05', title: 'UI 테스트', code: 'LM2001020709_19v3',
    description: '사용자가 실제로 겪는 흐름을 관찰하며 화면의 사용성을 검증하는 방법을 익혀요.',
    goal: 'UI 사용성을 검증할 테스트 기법을 선정하고 결과를 분석해 개선안을 제시할 수 있다.',
    topics: [
      ['사용성 기법', '휴리스틱·A/B·카드 소팅'], ['테스트 계획', '목적·대상·시나리오'], ['데이터 수집', '정량·정성 데이터'], ['결과 보고', '이슈·심각도·개선안']
    ],
    highlight: '계획 → 관찰·녹화 → 이슈 도출 → 개선'
  },
  {
    id: 'programming', number: '06', title: '프로그래밍 언어 활용', code: 'LM2001020231_23v5',
    description: '구조적·객체지향·스크립트 프로그래밍의 차이와 핵심 설계 개념을 정리해요.',
    goal: '프로그래밍 언어의 문법과 패러다임을 활용하여 응용소프트웨어를 구현할 수 있다.',
    topics: [
      ['구조적 프로그래밍', '순차·선택·반복'], ['객체지향', '캡슐화·상속·다형성'], ['스크립트 언어', '인터프리터·동적 타이핑'], ['설계 산출물', '순서도·의사코드·UML']
    ],
    highlight: '순차·선택·반복 + 객체지향 4대 특성'
  },
  {
    id: 'screen', number: '07', title: '화면 구현', code: 'LM2001020225_23v6',
    description: '화면 설계서를 읽고 HTML·CSS·JavaScript로 접근성 높은 UI를 구현해요.',
    goal: '설계된 화면의 제약사항을 파악하고 웹 표준에 맞게 UI를 구현할 수 있다.',
    topics: [
      ['UI 설계', 'IA·사이트맵·브레드크럼'], ['HTML/CSS', '구조·스타일·반응형'], ['웹 접근성', 'alt·label·키보드'], ['UI 제어', '이벤트·유효성·호환성']
    ],
    highlight: 'HTML 구조 + CSS 스타일 + JS 상호작용'
  },
  {
    id: 'sql', number: '08', title: 'SQL 활용', code: 'LM2001020413_19v4',
    description: '데이터 정의부터 조인·서브쿼리·인덱스·뷰까지 SQL 흐름을 문제로 연습해요.',
    goal: 'SQL 명령문을 작성하여 데이터베이스를 정의하고 데이터를 조회·조작할 수 있다.',
    topics: [
      ['DDL·DML·DCL', '구조·데이터·권한'], ['무결성 제약', 'PK·FK·UNIQUE·CHECK'], ['고급 조회', 'JOIN·서브쿼리·집합'], ['성능과 추상화', '인덱스·뷰']
    ],
    highlight: '정의 → 조작 → 권한·트랜잭션 제어'
  },
  {
    id: 'application', number: '09', title: '프로그래밍 언어 응용', code: 'LM2001020230_23v5',
    description: '언어 선택, 코드 품질, 라이브러리와 의존성 관리의 실무 판단 기준을 익혀요.',
    goal: '프로그래밍 언어의 특성을 활용하여 애플리케이션을 구현하고 최적화할 수 있다.',
    topics: [
      ['언어 유형', '저급·고급·바이트코드'], ['코드 품질', '리뷰·리팩토링·프로파일링'], ['라이브러리', '모듈·패키지·의존성'], ['라이선스', 'MIT·Apache·GPL']
    ],
    highlight: '언어 선택 → 코드 개선 → 의존성 관리'
  }
];

const questionBank = [
  { id: 'q-01', unit: 'deploy', sourcePage: 13, source: '형성평가', difficulty: '기본', tag: '배포', question: '소스코드를 실행 가능한 형태로 변환하는 과정을 무엇이라 하는가?', choices: ['체크인', '빌드', '롤백', '인스펙션'], answer: 1, explanation: '빌드는 소스코드를 컴파일·패키징하여 실행 가능한 결과물로 만드는 과정입니다.' },
  { id: 'q-02', unit: 'deploy', sourcePage: 13, source: '형성평가', difficulty: '기본', tag: 'WAS', question: '웹 애플리케이션에서 동적 비즈니스 로직을 처리하는 서버는?', choices: ['웹 서버', 'DB 서버', 'WAS', '파일 서버'], answer: 2, explanation: 'WAS는 동적 프로그램을 실행하고 데이터베이스와 연동하는 역할을 합니다.' },
  { id: 'q-03', unit: 'deploy', sourcePage: 13, source: '형성평가', difficulty: '기본', tag: '형상관리', question: '형상관리에서 수정한 소스를 저장소에 반영하는 작업은?', choices: ['체크아웃', '체크인', '빌드', '배포'], answer: 1, explanation: '체크인은 수정된 소스를 저장소에 반영하는 작업이며, 체크아웃은 저장소에서 가져오는 작업입니다.' },
  { id: 'q-04', unit: 'testing', sourcePage: 20, source: '형성평가', difficulty: '기본', tag: '테스트', question: '개발자가 직접 수행하며 가장 작은 단위를 검증하는 테스트는?', choices: ['단위 테스트', '통합 테스트', '인수 테스트', '회귀 테스트'], answer: 0, explanation: '단위 테스트는 모듈·컴포넌트 단위에서 결함을 찾는 가장 작은 범위의 테스트입니다.' },
  { id: 'q-05', unit: 'testing', sourcePage: 21, source: '형성평가', difficulty: '응용', tag: '결함 관리', question: '결함이 시스템에 미치는 영향의 크기를 나타내는 개념은?', choices: ['우선순위', '심각도', '커버리지', '재현율'], answer: 1, explanation: '심각도는 결함의 영향 크기이고, 우선순위는 얼마나 시급하게 처리할지를 의미합니다.' },
  { id: 'q-06', unit: 'basic-tech', sourcePage: 22, source: '학습 확인', difficulty: '기본', tag: '네트워크', question: '프로토콜의 3요소에 해당하지 않는 것은?', choices: ['구문', '의미', '타이밍', '용량'], answer: 3, explanation: '프로토콜의 3요소는 구문(Syntax), 의미(Semantics), 타이밍(Timing)입니다.' },
  { id: 'q-07', unit: 'basic-tech', sourcePage: 27, source: '형성평가', difficulty: '기본', tag: '정규화', question: '데이터 중복과 이상 현상을 줄이기 위한 과정은?', choices: ['캡슐화', '정규화', '다중화', '가상화'], answer: 1, explanation: '정규화는 테이블을 분해하여 중복을 줄이고 삽입·갱신·삭제 이상을 방지합니다.' },
  { id: 'q-08', unit: 'environment', sourcePage: 34, source: '형성평가', difficulty: '기본', tag: 'Linux', question: '파일 접근 권한을 변경하는 Linux 명령어는?', choices: ['ls', 'chmod', 'cd', 'mkdir'], answer: 1, explanation: 'chmod는 파일이나 디렉터리의 접근 권한을 변경하는 명령어입니다.' },
  { id: 'q-09', unit: 'ui-test', sourcePage: 40, source: '형성평가', difficulty: '기본', tag: '사용성', question: '사용자가 생각을 소리 내어 말하며 과업을 수행하는 기법은?', choices: ['휴리스틱 평가', '씽크 얼라우드', 'A/B 테스트', '코드 인스펙션'], answer: 1, explanation: '씽크 얼라우드는 사용자가 과업을 수행하며 자신의 생각을 말하도록 하는 사용성 테스트 기법입니다.' },
  { id: 'q-10', unit: 'programming', sourcePage: 47, source: '형성평가', difficulty: '기본', tag: '객체지향', question: '상위 클래스의 속성·메서드를 하위 클래스가 물려받는 특성은?', choices: ['캡슐화', '상속', '다형성', '추상화'], answer: 1, explanation: '상속은 상위 클래스의 속성과 메서드를 하위 클래스가 재사용하는 특성입니다.' },
  { id: 'q-11', unit: 'screen', sourcePage: 53, source: '형성평가', difficulty: '기본', tag: 'HTML', question: '화면의 구조와 콘텐츠를 정의하는 언어는?', choices: ['CSS', 'HTML', 'SQL', 'UML'], answer: 1, explanation: 'HTML은 웹 문서의 구조와 콘텐츠를 정의하고, CSS는 레이아웃과 스타일을 담당합니다.' },
  { id: 'q-12', unit: 'sql', sourcePage: 60, source: '형성평가', difficulty: '기본', tag: 'SQL', question: '조건을 만족하는 행만 반환하는 조인은?', choices: ['OUTER JOIN', 'INNER JOIN', 'CROSS JOIN', 'SELF JOIN'], answer: 1, explanation: 'INNER JOIN은 조인 조건을 만족하는 두 테이블의 행만 반환합니다.' },
  { id: 'q-13', unit: 'sql', sourcePage: 60, source: '형성평가', difficulty: '응용', tag: '인덱스', question: '검색 속도 향상을 위한 데이터 구조는?', choices: ['뷰', '인덱스', '트랜잭션', '서브쿼리'], answer: 1, explanation: '인덱스는 조회 성능을 높이지만 데이터 변경 시 유지 비용과 저장 공간이 추가됩니다.' },
  { id: 'q-14', unit: 'application', sourcePage: 67, source: '형성평가', difficulty: '응용', tag: '리팩토링', question: '외부 동작은 유지하고 내부 코드 구조만 개선하는 작업은?', choices: ['디버깅', '리팩토링', '컴파일', '배포'], answer: 1, explanation: '리팩토링은 기능 결과를 유지하면서 중복 제거·메서드 분리 등 내부 구조를 개선합니다.' },
  { id: 'q-15', unit: 'application', sourcePage: 67, source: '형성평가', difficulty: '기본', tag: '라이선스', question: '사용한 소스코드도 동일 라이선스로 공개해야 할 수 있는 라이선스는?', choices: ['MIT', 'Apache 2.0', 'GPL', 'BSD'], answer: 2, explanation: 'GPL은 카피레프트 라이선스로, 파생 소프트웨어도 동일 라이선스로 공개해야 할 수 있습니다.' }
];

const mockQuestions = [
  { id: 'm-01', unit: 'deploy', type: '객관식', question: '애플리케이션 배포 절차 중 가장 먼저 수행하는 것은?', choices: ['빌드', '배포 환경 구성', '소스 검증', '운영 배포'], answer: 1, explanation: '배포 환경을 구성한 후 소스 검증, 빌드, 운영 배포 순서로 진행합니다.' },
  { id: 'm-02', unit: 'deploy', type: '객관식', question: '소스코드를 실행하지 않고 분석하는 정적 검증 기법은?', choices: ['코드 인스펙션', '부하 테스트', '인수 테스트', '회귀 테스트'], answer: 0, explanation: '코드 인스펙션은 프로그램을 실행하지 않고 소스 자체를 분석합니다.' },
  { id: 'm-03', unit: 'testing', type: '객관식', question: 'V-모델에서 시스템 테스트와 대응하는 개발 단계는?', choices: ['요구사항 분석', '설계', '구현', '형상관리'], answer: 1, explanation: '이 교재의 모의고사 기준 답은 설계입니다. V-모델의 단계 대응은 교재 기준으로 학습하세요.' },
  { id: 'm-04', unit: 'testing', type: '객관식', question: '결함 관리 프로세스에서 결함을 등록하는 단계는?', choices: ['결함 계획', '결함 기록', '결함 수정', '결함 종료'], answer: 1, explanation: '결함 기록 단계에서 결함 정보를 결함 관리 DB에 등록합니다.' },
  { id: 'm-05', unit: 'basic-tech', type: '객관식', question: 'OSI 7계층 중 전송 계층에 해당하는 프로토콜은?', choices: ['HTTP', 'TCP', 'ARP', 'Ethernet'], answer: 1, explanation: 'TCP와 UDP는 전송 계층에서 신뢰성과 전송 방식을 담당합니다.' },
  { id: 'm-06', unit: 'basic-tech', type: '객관식', question: '운영체제와 응용소프트웨어 사이에서 공통 기능을 제공하는 것은?', choices: ['컴파일러', '미들웨어', '텍스트 에디터', '브라우저'], answer: 1, explanation: '미들웨어는 OS와 응용소프트웨어 사이에서 통신·트랜잭션 등의 공통 기능을 제공합니다.' },
  { id: 'm-07', unit: 'basic-tech', type: '객관식', question: '데이터 중복과 이상 현상을 줄이기 위한 과정은?', choices: ['캡슐화', '정규화', '다중화', '가상화'], answer: 1, explanation: '정규화는 데이터 중복을 줄이고 삽입·갱신·삭제 이상을 방지합니다.' },
  { id: 'm-08', unit: 'environment', type: '객관식', question: '오픈소스이며 무료로 배포 가능한 운영체제는?', choices: ['Windows', 'UNIX', 'Linux', 'iOS'], answer: 2, explanation: 'Linux는 오픈소스 기반으로 자유로운 수정·배포가 가능합니다.' },
  { id: 'm-09', unit: 'environment', type: '객관식', question: '파일 접근 권한을 변경하는 명령어는?', choices: ['ls', 'chmod', 'cd', 'mkdir'], answer: 1, explanation: 'chmod는 파일 접근 권한을 변경합니다.' },
  { id: 'm-10', unit: 'ui-test', type: '객관식', question: '사용자가 생각을 소리 내어 말하며 과업을 수행하는 사용성 테스트 기법은?', choices: ['휴리스틱 평가', '씽크 얼라우드', 'A/B 테스트', '코드 인스펙션'], answer: 1, explanation: '씽크 얼라우드는 사용자의 사고 과정과 탐색 맥락을 파악하는 방법입니다.' },
  { id: 'm-11', unit: 'ui-test', type: '객관식', question: 'UI 이슈의 심각도 분류에 해당하지 않는 것은?', choices: ['치명적', '중대', '경미', '영구적'], answer: 3, explanation: '교재에서는 치명적·중대·경미로 UI 이슈를 분류합니다.' },
  { id: 'm-12', unit: 'programming', type: '객관식', question: '상위 클래스의 속성·메서드를 하위 클래스가 물려받는 특성은?', choices: ['캡슐화', '상속', '다형성', '추상화'], answer: 1, explanation: '상속은 상위 클래스의 속성과 메서드를 하위 클래스가 물려받는 특성입니다.' },
  { id: 'm-13', unit: 'programming', type: '객관식', question: '별도 컴파일 없이 한 줄씩 해석·실행되는 언어는?', choices: ['컴파일 언어', '스크립트 언어', '기계어', '어셈블리어'], answer: 1, explanation: '스크립트 언어는 인터프리터가 소스를 해석·실행합니다.' },
  { id: 'm-14', unit: 'screen', type: '객관식', question: '화면의 구조와 콘텐츠를 정의하는 언어는?', choices: ['CSS', 'HTML', 'SQL', 'XML'], answer: 1, explanation: 'HTML은 구조를, CSS는 시각적 스타일을 정의합니다.' },
  { id: 'm-15', unit: 'screen', type: '객관식', question: '여러 브라우저에서 동일하게 동작하는지 확인하는 것은?', choices: ['웹 접근성', '웹 호환성', '웹 보안', '웹 성능'], answer: 1, explanation: '웹 호환성 또는 크로스 브라우징 검사는 브라우저 간 동작 차이를 확인합니다.' },
  { id: 'm-16', unit: 'sql', type: '객관식', question: '테이블 구조를 정의하는 SQL 언어는?', choices: ['DML', 'DDL', 'DCL', 'TCL'], answer: 1, explanation: 'DDL은 CREATE·ALTER·DROP으로 객체 구조를 정의합니다.' },
  { id: 'm-17', unit: 'sql', type: '객관식', question: '조건을 만족하는 행만 반환하는 조인은?', choices: ['OUTER JOIN', 'INNER JOIN', 'CROSS JOIN', 'SELF JOIN'], answer: 1, explanation: 'INNER JOIN은 조인 조건을 만족하는 행만 반환합니다.' },
  { id: 'm-18', unit: 'application', type: '객관식', question: '외부 동작은 유지하며 내부 코드 구조를 개선하는 작업은?', choices: ['디버깅', '리팩토링', '컴파일', '배포'], answer: 1, explanation: '리팩토링은 외부 동작을 유지한 채 내부 구조를 개선합니다.' },
  { id: 'm-19', unit: 'deploy', type: '단답형', question: '소스 반출부터 빌드·테스트·패키징까지 자동화된 배포 흐름 전체를 무엇이라 하는가?', answerText: '배포 파이프라인', explanation: '형상관리부터 운영 반영까지 이어지는 자동화 흐름을 배포 파이프라인이라고 합니다.' },
  { id: 'm-20', unit: 'testing', type: '단답형', question: '결함이 시스템에 미치는 영향의 크기가 아니라, 처리해야 하는 시급성을 나타내는 개념은?', answerText: '우선순위', explanation: '심각도는 영향의 크기이고, 우선순위는 처리의 시급성을 뜻합니다.' },
  { id: 'm-21', unit: 'basic-tech', type: '서술형', question: '정규화가 데이터베이스 설계에서 필요한 이유를 이상 현상과 관련지어 서술하시오.', answerText: '데이터 중복을 줄여 삽입·갱신·삭제 이상을 방지하기 위해 필요하다.', explanation: '정규화는 테이블을 분해하여 중복을 줄이고 데이터 일관성을 높입니다.' },
  { id: 'm-22', unit: 'ui-test', type: '단답형', question: '사용자가 콘텐츠 카드를 스스로 분류하게 하여 메뉴 구조를 검증하는 기법은?', answerText: '카드 소팅', explanation: '카드 소팅은 정보 구조가 사용자의 인식과 일치하는지 확인하는 기법입니다.' },
  { id: 'm-23', unit: 'programming', type: '단답형', question: '객체지향에서 상위 클래스의 속성과 메서드를 하위 클래스가 물려받는 특성은?', answerText: '상속', explanation: '상속은 객체지향 프로그래밍의 4대 특성 중 하나입니다.' },
  { id: 'm-24', unit: 'screen', type: '서술형', question: '클라이언트 측 유효성 검사만으로 충분하지 않은 이유를 서술하시오.', answerText: '클라이언트 검증은 우회될 수 있으므로 서버 측에서도 동일하게 검증해야 한다.', explanation: '개발자 도구 등으로 클라이언트 검증을 우회할 수 있기 때문에 서버 측 검증이 반드시 필요합니다.' },
  { id: 'm-25', unit: 'application', type: '단답형', question: '재사용 가능한 코드·패키지의 모음으로, npm·pip과 같은 도구로 관리되는 것은?', answerText: '라이브러리', explanation: '라이브러리는 재사용 가능한 코드와 패키지의 모음이며 패키지 관리 도구로 버전과 의존성을 관리합니다.' }
];

const aiMockQuestions = [
  { id: 'ai-01', unit: 'deploy', type: '객관식', question: '배포 파이프라인에서 단위 테스트가 실패했다면 가장 적절한 다음 조치는?', choices: ['운영 서버에 먼저 배포한다', '실패 원인을 확인하고 다음 단계 진행을 멈춘다', '테스트 결과를 삭제한다', '이전 버전을 무조건 삭제한다'], answer: 1, explanation: '파이프라인은 앞 단계가 성공했을 때만 다음 단계로 진행되어 결함이 운영 환경에 전달되는 것을 막습니다.', aiReason: '배포 파이프라인과 단계별 성공 조건 개념을 응용형 상황으로 재구성했습니다.' },
  { id: 'ai-02', unit: 'testing', type: '객관식', question: '로그인 실패처럼 영향은 크지만 발생 빈도가 낮은 결함을 설명할 때 구분해야 하는 두 기준은?', choices: ['커버리지와 재현율', '심각도와 우선순위', '정적 테스트와 동적 테스트', '단위 테스트와 인수 테스트'], answer: 1, explanation: '심각도는 시스템 영향의 크기이고, 우선순위는 처리의 시급성입니다.', aiReason: '결함의 심각도와 우선순위를 실제 장애 상황에 적용하도록 재구성했습니다.' },
  { id: 'ai-03', unit: 'basic-tech', type: '객관식', question: '실시간 영상 스트리밍처럼 일부 데이터 손실보다 빠른 전송이 중요한 경우 적합한 프로토콜은?', choices: ['TCP', 'UDP', 'FTP', 'SSH'], answer: 1, explanation: 'UDP는 연결 과정과 재전송 부담이 적어 실시간성이 중요한 서비스에 적합합니다.', aiReason: 'TCP와 UDP의 선택 기준을 서비스 사례형 문제로 재구성했습니다.' },
  { id: 'ai-04', unit: 'environment', type: '객관식', question: 'Linux에서 파일의 소유자에게 읽기·쓰기·실행 권한을 주고 나머지 사용자에게 읽기·실행 권한을 주는 명령은?', choices: ['chmod 644 파일명', 'chmod 755 파일명', 'chown 755 파일명', 'ps -ef 파일명'], answer: 1, explanation: '755는 소유자에게 rwx, 그룹과 기타 사용자에게 r-x 권한을 부여합니다.', aiReason: '교재의 chmod 기본 예시를 권한 숫자 해석 문제로 재구성했습니다.' },
  { id: 'ai-05', unit: 'ui-test', type: '객관식', question: '사용자가 화면을 탐색하며 무엇을 생각하는지 관찰하려면 어떤 기법을 선택해야 하는가?', choices: ['카드 소팅', '씽크 얼라우드', '휴리스틱 평가', '코드 인스펙션'], answer: 1, explanation: '씽크 얼라우드는 사용자가 과업을 수행하며 생각을 소리 내어 말하게 하는 방법입니다.', aiReason: '사용성 테스트 기법의 목적과 관찰 대상을 연결하도록 재구성했습니다.' },
  { id: 'ai-06', unit: 'programming', type: '객관식', question: '여러 클래스가 같은 메서드 규약을 따르도록 만들고 구현은 각 클래스에 맡기려면 무엇을 사용하는가?', choices: ['전역 변수', '인터페이스', '배열', '순서도'], answer: 1, explanation: '인터페이스는 메서드 시그니처를 정의하고 실제 구현은 각 클래스에 위임합니다.', aiReason: '객체지향의 인터페이스 개념을 설계 상황에 적용하도록 재구성했습니다.' },
  { id: 'ai-07', unit: 'screen', type: '객관식', question: '브라우저에서 입력 검사를 통과했더라도 서버에서 같은 검사를 다시 해야 하는 이유는?', choices: ['CSS 속도를 높이기 위해', '클라이언트 검증은 우회될 수 있기 때문에', 'HTML 구조를 만들기 위해', '브레드크럼을 표시하기 위해'], answer: 1, explanation: '클라이언트 측 검증은 개발자 도구 등으로 우회될 수 있으므로 서버 측 검증이 필요합니다.', aiReason: '화면 구현 단원의 클라이언트·서버 검증 차이를 보안 상황으로 재구성했습니다.' },
  { id: 'ai-08', unit: 'sql', type: '객관식', question: '두 SELECT 결과의 중복 행까지 모두 포함해 합치려면 어떤 집합 연산자를 사용하는가?', choices: ['UNION', 'UNION ALL', 'INTERSECT', 'MINUS'], answer: 1, explanation: 'UNION ALL은 중복을 제거하지 않고 모든 결과 행을 반환합니다.', aiReason: 'SQL 집합 연산자의 차이를 결과 요구사항 판단 문제로 재구성했습니다.' },
  { id: 'ai-09', unit: 'application', type: '객관식', question: 'GPL 라이선스 라이브러리를 상업 프로젝트에 포함할 때 가장 먼저 확인할 사항은?', choices: ['화면 해상도', '동일 라이선스 공개 의무와 배포 조건', 'CPU 코어 수', '브라우저 종류'], answer: 1, explanation: 'GPL은 카피레프트 라이선스이므로 파생 소프트웨어의 공개·배포 조건을 사전에 검토해야 합니다.', aiReason: '오픈소스 라이선스의 특징을 실제 라이브러리 선정 상황으로 재구성했습니다.' }
];

const aiAdditionalQuestions = [
  { id: 'ai-10', unit: 'deploy', type: '객관식', question: 'HTML과 이미지처럼 정적인 파일을 빠르게 전달하는 역할에 가장 가까운 구성 요소는?', choices: ['웹 서버', 'WAS', 'DB 서버', '컴파일러'], answer: 0, explanation: '웹 서버는 HTML·CSS·이미지 같은 정적 콘텐츠를 요청에 따라 전달합니다.', aiReason: '배포 환경에서 웹 서버와 WAS의 역할을 구분하는 문제로 재구성했어요.' },
  { id: 'ai-11', unit: 'deploy', type: '객관식', question: '소스 코드가 변경된 뒤 자동 배포 파이프라인에서 일반적으로 가장 먼저 수행할 작업은?', choices: ['소스 빌드', '운영 서버 교체', '사용자 공지', '로그 삭제'], answer: 0, explanation: '변경된 소스가 실행 가능한 산출물로 만들어지는 빌드가 먼저 수행됩니다.', aiReason: 'CI/CD의 단계와 순서를 상황형으로 바꿔 출제했어요.' },
  { id: 'ai-12', unit: 'deploy', type: '객관식', question: '새 버전 배포 후 치명적인 오류가 발견되었을 때 가장 적절한 대응은?', choices: ['오류 로그를 삭제한다', '테스트를 생략하고 재배포한다', '직전 안정 버전으로 롤백한다', 'DB 권한을 모두 공개한다'], answer: 2, explanation: '서비스 영향을 줄이기 위해 검증된 직전 버전으로 되돌리는 롤백을 우선 고려합니다.', aiReason: '운영 장애와 복구 전략을 연결한 응용 문제예요.' },
  { id: 'ai-13', unit: 'deploy', type: '객관식', question: 'WAS가 웹 서버와 구분되어 담당하는 기능으로 가장 적절한 것은?', choices: ['이미지 파일 저장', '동적 비즈니스 로직 실행', 'DNS 이름 등록', '키보드 입력 처리'], answer: 1, explanation: 'WAS는 프로그램을 실행하고 동적인 요청과 업무 로직을 처리합니다.', aiReason: '웹 서버·WAS의 역할 비교 개념을 다른 선택지 구성으로 확인해요.' },
  { id: 'ai-14', unit: 'testing', type: '객관식', question: '프로그램 내부 구현을 알지 못해도 입력과 출력으로 기능을 검증하는 테스트는?', choices: ['화이트박스 테스트', '정적 분석', '블랙박스 테스트', '코드 리뷰'], answer: 2, explanation: '블랙박스 테스트는 내부 구조보다 요구사항에 따른 입력과 결과를 중심으로 검증합니다.', aiReason: '테스트 관점에 따른 분류를 실무 표현으로 바꿔 물었어요.' },
  { id: 'ai-15', unit: 'testing', type: '객관식', question: '여러 모듈을 연결한 뒤 모듈 사이의 데이터 전달과 상호작용을 확인하는 테스트는?', choices: ['단위 테스트', '통합 테스트', '성능 테스트', '보안 테스트'], answer: 1, explanation: '통합 테스트는 개별 모듈을 결합한 후 인터페이스와 상호작용을 검증합니다.', aiReason: '테스트 수준별 목적을 구분하는 문제로 재구성했어요.' },
  { id: 'ai-16', unit: 'testing', type: '객관식', question: '입력 범위가 1부터 100까지일 때 경계값 분석에 해당하는 입력 조합은?', choices: ['1, 2, 99, 100', '25, 50, 75', '10, 30, 60', '0, 50, 200'], answer: 0, explanation: '경계값 분석은 유효 범위의 시작·끝과 그 주변 값을 집중적으로 확인합니다.', aiReason: '교재의 테스트 설계 기법을 숫자 범위 문제로 바꾸었어요.' },
  { id: 'ai-17', unit: 'testing', type: '객관식', question: '영향 범위는 작지만 사용자가 매우 자주 겪는 결함을 빨리 처리하려고 할 때 판단해야 하는 값은?', choices: ['결함의 원인', '테스트 데이터', '코드 커버리지', '결함 우선순위'], answer: 3, explanation: '우선순위는 결함을 어떤 순서로 처리할지 결정하는 기준입니다. 영향도인 심각도와 구분해야 합니다.', aiReason: '심각도와 우선순위의 차이를 실제 결함 처리 상황으로 재구성했어요.' },
  { id: 'ai-18', unit: 'basic-tech', type: '객관식', question: 'OSI 7계층에서 IP 주소를 이용해 목적지까지 경로를 결정하는 계층은?', choices: ['전송 계층', '네트워크 계층', '표현 계층', '응용 계층'], answer: 1, explanation: '네트워크 계층은 논리 주소와 라우팅을 담당합니다.', aiReason: 'OSI 계층의 역할을 개념 선택형으로 새롭게 구성했어요.' },
  { id: 'ai-19', unit: 'basic-tech', type: '객관식', question: '연결 설정과 순서 보장으로 신뢰성 있는 데이터 전송을 제공하는 프로토콜은?', choices: ['UDP', 'ARP', 'TCP', 'DNS'], answer: 2, explanation: 'TCP는 연결 지향 방식으로 순서와 재전송을 관리합니다.', aiReason: 'TCP와 UDP의 차이를 전송 상황에 맞춰 확인하도록 만들었어요.' },
  { id: 'ai-20', unit: 'basic-tech', type: '객관식', question: '관계형 데이터베이스에서 행과 열로 구성된 데이터 집합을 부르는 말은?', choices: ['테이블', '프로세스', '패킷', '스레드'], answer: 0, explanation: '관계형 DB에서 테이블은 행과 열로 데이터를 표현하는 기본 구조입니다.', aiReason: '관계형 데이터베이스의 기본 용어를 직접 적용하는 문제예요.' },
  { id: 'ai-21', unit: 'basic-tech', type: '객관식', question: '데이터베이스 정규화의 주된 목적으로 가장 적절한 것은?', choices: ['모든 테이블을 하나로 합치기', '네트워크 속도 높이기', '비밀번호를 암호화하기', '중복을 줄이고 갱신 이상을 방지하기'], answer: 3, explanation: '정규화는 데이터 중복을 줄이고 삽입·삭제·갱신 이상을 완화합니다.', aiReason: '정규화의 목적을 단순 암기가 아닌 효과 중심으로 물었어요.' },
  { id: 'ai-22', unit: 'environment', type: '객관식', question: 'Linux에서 chmod 644가 의미하는 일반적인 권한 조합은?', choices: ['소유자 rw-, 그룹 r--, 기타 r--', '소유자 rwx, 그룹 r-x, 기타 r-x', '소유자 r--, 그룹 rw-, 기타 ---', '소유자 --x, 그룹 --x, 기타 --x'], answer: 0, explanation: '6은 rw-, 4는 r--를 뜻하므로 644는 소유자에게 읽기·쓰기, 나머지에게 읽기 권한을 줍니다.', aiReason: 'chmod 숫자 권한을 755와 다른 조합으로 다시 확인해요.' },
  { id: 'ai-23', unit: 'environment', type: '객관식', question: 'Linux에서 현재 실행 중인 프로세스 목록을 확인할 때 사용할 수 있는 명령은?', choices: ['mkdir', 'ps -ef', 'chmod', 'grepdir'], answer: 1, explanation: 'ps 명령은 프로세스 상태를 확인하며 ps -ef는 상세 목록을 보여줍니다.', aiReason: '개발 환경 구축 단원의 명령어를 실제 점검 상황에 적용했어요.' },
  { id: 'ai-24', unit: 'environment', type: '객관식', question: 'Git에서 branch를 사용하는 가장 큰 이유는?', choices: ['파일 권한을 변경하기 위해', 'DB 테이블을 생성하기 위해', '작업 흐름을 나누고 변경을 독립적으로 관리하기 위해', '운영체제를 설치하기 위해'], answer: 2, explanation: '브랜치는 기능 개발이나 실험을 기존 코드 흐름과 분리해 관리하게 해줍니다.', aiReason: '개발 도구의 목적을 단순 명령어가 아닌 협업 상황으로 재구성했어요.' },
  { id: 'ai-25', unit: 'environment', type: '객관식', question: '개발·테스트·운영 환경마다 달라지는 DB 주소를 관리하는 방법으로 가장 적절한 것은?', choices: ['소스 코드 곳곳에 직접 입력한다', '모든 환경에서 같은 주소를 쓴다', '주석으로만 구분한다', '환경 변수나 외부 설정으로 분리한다'], answer: 3, explanation: '환경별 설정을 외부화하면 코드 수정 없이 실행 환경에 맞는 값을 적용할 수 있습니다.', aiReason: '개발 환경과 운영 환경 설정 분리 개념을 응용했어요.' },
  { id: 'ai-26', unit: 'ui-test', type: '객관식', question: '같은 목적의 두 화면을 각각 사용자에게 사용하게 해 어느 쪽 성과가 좋은지 비교하는 방법은?', choices: ['A/B 테스트', '코드 인스펙션', '단위 테스트', '부하 테스트'], answer: 0, explanation: 'A/B 테스트는 두 가지 UI 안을 비교해 사용자 반응이나 성과 차이를 확인합니다.', aiReason: 'UI 테스트 방법을 화면 개선 의사결정 상황으로 바꿔 물었어요.' },
  { id: 'ai-27', unit: 'ui-test', type: '객관식', question: '사용자가 비슷하다고 느끼는 콘텐츠를 직접 묶게 하여 메뉴 구조를 정하는 방법은?', choices: ['페어 프로그래밍', '회귀 테스트', '카드 소팅', '코드 커버리지 측정'], answer: 2, explanation: '카드 소팅은 사용자의 인지 구조를 바탕으로 정보 분류와 메뉴 구조를 설계할 때 사용합니다.', aiReason: '정보 구조 설계와 사용자 관찰 기법을 연결했어요.' },
  { id: 'ai-28', unit: 'ui-test', type: '객관식', question: '사용성 테스트에서 화면 사용성이 개선되었는지 판단하는 지표로 가장 적절한 조합은?', choices: ['CPU 온도와 디스크 용량', '과업 성공률과 과업 완료 시간', '소스 코드 줄 수와 파일 수', 'DB 레코드 수와 인덱스 수'], answer: 1, explanation: '과업 성공률과 완료 시간은 사용자가 목표를 얼마나 쉽고 빠르게 달성했는지 보여줍니다.', aiReason: 'UI 테스트 결과를 측정 가능한 지표로 재구성했어요.' },
  { id: 'ai-29', unit: 'ui-test', type: '객관식', question: '이미지의 의미를 화면 낭독기에도 전달하기 위해 HTML에 제공해야 하는 정보는?', choices: ['border 값', 'margin 값', 'z-index 값', 'alt 텍스트'], answer: 3, explanation: 'alt 속성은 이미지가 보이지 않는 상황에도 대체 설명을 제공해 접근성을 높입니다.', aiReason: 'UI 테스트 단원의 접근성 개념을 HTML 속성 문제로 바꿨어요.' },
  { id: 'ai-30', unit: 'programming', type: '객관식', question: '재귀 함수가 무한히 호출되지 않도록 반드시 필요한 것은?', choices: ['전역 변수', '종료 조건', '상속 관계', 'DB 연결'], answer: 1, explanation: '재귀 호출은 문제를 더 작은 형태로 줄이면서 종료 조건에 도달해야 합니다.', aiReason: '프로그래밍 언어 활용의 제어 구조를 재귀 상황으로 응용했어요.' },
  { id: 'ai-31', unit: 'programming', type: '객관식', question: '객체 내부의 데이터를 직접 변경하지 못하게 하고 정해진 메서드로만 접근하게 하는 특성은?', choices: ['캡슐화', '상속', '다형성', '병렬성'], answer: 0, explanation: '캡슐화는 데이터와 동작을 묶고 내부 구현을 감춰 외부 접근을 제어합니다.', aiReason: '객체지향 4대 특성 중 개념과 효과를 연결해 물었어요.' },
  { id: 'ai-32', unit: 'programming', type: '객관식', question: '같은 이름의 메서드를 매개변수 개수나 타입만 다르게 정의하는 것은?', choices: ['오버라이딩', '추상화', '오버로딩', '직렬화'], answer: 2, explanation: '오버로딩은 같은 이름에 서로 다른 매개변수 목록을 허용하는 방식입니다.', aiReason: '오버로딩과 오버라이딩을 혼동하지 않도록 선택지를 구성했어요.' },
  { id: 'ai-33', unit: 'programming', type: '객관식', question: '실행 중 발생할 수 있는 예외를 감지하고 대체 처리를 작성할 때 사용하는 구조는?', choices: ['for-in', 'switch-case', 'do-while', 'try-catch'], answer: 3, explanation: 'try-catch 구조는 예외가 발생할 수 있는 코드와 예외 처리 코드를 분리합니다.', aiReason: '문법 이름을 실제 오류 처리 목적과 연결했어요.' },
  { id: 'ai-34', unit: 'screen', type: '객관식', question: '문서에서 독립적인 제목과 내용을 담는 의미 있는 HTML 요소로 적절한 것은?', choices: ['section', 'br', 'span', 'b'], answer: 0, explanation: 'section은 주제별 콘텐츠 영역을 의미론적으로 묶는 요소입니다.', aiReason: '화면 구현 단원의 시맨틱 HTML 개념을 구조 선택 문제로 바꿨어요.' },
  { id: 'ai-35', unit: 'screen', type: '객관식', question: 'CSS 박스 모델의 바깥쪽부터 안쪽 순서로 올바른 것은?', choices: ['margin → border → padding → content', 'content → margin → border → padding', 'padding → content → margin → border', 'border → content → padding → margin'], answer: 0, explanation: '요소의 바깥쪽부터 margin, border, padding, content 순서로 이해할 수 있습니다.', aiReason: 'CSS 구조 개념을 순서 배열형 문제로 재구성했어요.' },
  { id: 'ai-36', unit: 'screen', type: '객관식', question: '텍스트 입력창과 설명 문구를 연결해 접근성을 높이는 HTML 방법은?', choices: ['input에 width만 지정한다', 'label의 for와 input의 id를 일치시킨다', '모든 문구를 placeholder로만 넣는다', 'div에 title을 반복한다'], answer: 1, explanation: 'label의 for 값과 input의 id를 연결하면 보조기기가 입력 목적을 이해하기 쉽습니다.', aiReason: '화면 구현의 label·입력 요소 연결을 실무 상황으로 바꿨어요.' },
  { id: 'ai-37', unit: 'screen', type: '객관식', question: '화면 너비에 따라 레이아웃을 다르게 적용할 때 주로 사용하는 CSS 기능은?', choices: ['상속', '가상 함수', '외래 키', '미디어 쿼리'], answer: 3, explanation: '미디어 쿼리는 뷰포트 조건에 따라 서로 다른 스타일을 적용합니다.', aiReason: '반응형 화면 구현의 핵심 개념을 선택형으로 구성했어요.' },
  { id: 'ai-38', unit: 'sql', type: '객관식', question: '테이블 구조를 정의하거나 변경하는 SQL 명령어 범주는?', choices: ['DDL', 'DML', 'DCL', 'TCL'], answer: 0, explanation: 'DDL은 CREATE, ALTER, DROP처럼 데이터베이스 구조를 정의하는 명령을 포함합니다.', aiReason: 'SQL 명령어 분류를 대표 명령과 함께 확인하도록 재구성했어요.' },
  { id: 'ai-39', unit: 'sql', type: '객관식', question: '기본 키에 대한 설명으로 옳은 것은?', choices: ['항상 중복 값을 허용한다', '문자열만 저장할 수 있다', '행을 유일하게 식별하며 NULL이 될 수 없다', '조회할 때만 임시로 존재한다'], answer: 2, explanation: '기본 키는 각 행을 유일하게 식별하고 NULL을 허용하지 않습니다.', aiReason: '무결성 제약조건의 목적을 행 식별 상황으로 바꿨어요.' },
  { id: 'ai-40', unit: 'sql', type: '객관식', question: 'GROUP BY로 묶은 집계 결과에 조건을 적용할 때 사용하는 절은?', choices: ['WHERE', 'HAVING', 'ORDER BY', 'VALUES'], answer: 1, explanation: 'HAVING은 그룹화 이후 집계 결과에 조건을 적용할 때 사용합니다.', aiReason: 'WHERE와 HAVING의 적용 시점 차이를 확인하는 문제예요.' },
  { id: 'ai-41', unit: 'sql', type: '객관식', question: '검색 성능을 위해 인덱스를 많이 만들 때 함께 고려해야 할 단점은?', choices: ['SELECT가 항상 불가능해진다', '테이블이 반드시 삭제된다', '열 이름을 사용할 수 없게 된다', 'INSERT·UPDATE 성능과 저장 공간에 부담이 생긴다'], answer: 3, explanation: '인덱스는 조회를 빠르게 할 수 있지만 변경 시 인덱스도 갱신해야 하고 공간을 사용합니다.', aiReason: '인덱스의 장점뿐 아니라 비용까지 판단하도록 만들었어요.' },
  { id: 'ai-42', unit: 'application', type: '객관식', question: '외부에서 보이는 기능은 유지하면서 중복 코드와 복잡한 구조를 개선하는 작업은?', choices: ['리팩터링', '배포', '컴파일', '파티셔닝'], answer: 0, explanation: '리팩터링은 동작을 바꾸지 않고 내부 구조를 개선해 유지보수성을 높입니다.', aiReason: '프로그래밍 언어 응용 단원의 코드 개선 개념을 상황형으로 바꿨어요.' },
  { id: 'ai-43', unit: 'application', type: '객관식', question: '라이브러리와 프레임워크의 차이를 설명한 것으로 가장 적절한 것은?', choices: ['라이브러리는 운영체제이고 프레임워크는 DB다', '둘은 항상 같은 의미다', '라이브러리는 호출하고 프레임워크는 정해진 흐름 안에서 코드를 호출한다', '프레임워크는 코드 재사용이 불가능하다'], answer: 2, explanation: '라이브러리는 개발자가 필요한 시점에 호출하지만 프레임워크는 전체 실행 흐름을 주도하는 경우가 많습니다.', aiReason: '개발 도구의 주도권 차이를 표현을 바꿔 확인했어요.' },
  { id: 'ai-44', unit: 'application', type: '객관식', question: '버그 수정만 포함된 1.4.2에서 다음 버전을 정할 때 시맨틱 버전 규칙에 가장 가까운 것은?', choices: ['2.0.0', '1.4.3', '1.5.0', '4.2.1'], answer: 1, explanation: '호환성을 깨지 않는 버그 수정은 패치 버전인 마지막 숫자를 증가시키는 것이 일반적입니다.', aiReason: '버전 관리 개념을 실제 변경 유형과 연결했어요.' },
  { id: 'ai-45', unit: 'application', type: '객관식', question: 'Apache 2.0 라이선스에 대한 설명으로 비교적 적절한 것은?', choices: ['모든 사용을 금지한다', '소스 공개를 항상 강제한다', '개인 학습에서만 사용할 수 있다', '조건을 지키면 수정·배포가 가능한 허용적 라이선스다'], answer: 3, explanation: 'Apache 2.0은 저작권·라이선스 고지 등의 조건 아래 수정과 배포를 허용합니다.', aiReason: '오픈소스 라이선스의 사용 범위를 비교하는 문제로 재구성했어요.' },
  { id: 'ai-46', unit: 'deploy', type: '객관식', question: '변경된 애플리케이션을 운영에 반영하는 일반적인 흐름으로 가장 자연스러운 것은?', choices: ['배포 → 빌드 → 테스트', '빌드 → 테스트 → 배포', '테스트 → 삭제 → 빌드', '롤백 → 배포 → 요구사항 분석'], answer: 1, explanation: '소스를 빌드하고 테스트로 검증한 뒤 운영 환경에 배포하는 흐름이 일반적입니다.', aiReason: '여러 단원의 배포·테스트 개념을 한 흐름으로 묶은 통합 문제예요.' },
  { id: 'ai-47', unit: 'testing', type: '객관식', question: '기능 수정 후 기존 기능이 함께 깨지지 않았는지 확인하는 테스트는?', choices: ['회귀 테스트', '탐색적 테스트', '사용성 테스트', '복구 테스트'], answer: 0, explanation: '회귀 테스트는 변경으로 인해 기존에 정상 동작하던 기능에 문제가 생기지 않았는지 확인합니다.', aiReason: '변경 이후 검증 전략을 배포 단계와 연결해 출제했어요.' },
  { id: 'ai-48', unit: 'basic-tech', type: '객관식', question: '웹 클라이언트와 서버가 요청·응답을 주고받을 때 대표적으로 사용하는 프로토콜은?', choices: ['FTP', 'SMTP', 'HTTP', 'SNMP'], answer: 2, explanation: 'HTTP는 웹에서 요청과 응답을 전달하기 위한 대표적인 응용 계층 프로토콜입니다.', aiReason: '네트워크와 화면 구현의 접점을 묻는 통합 문제예요.' },
  { id: 'ai-49', unit: 'sql', type: '객관식', question: '두 테이블에서 조인 조건이 일치하는 행만 가져오려면 어떤 조인을 사용하는가?', choices: ['FULL OUTER JOIN', 'INNER JOIN', 'CROSS JOIN', 'RIGHT OUTER JOIN'], answer: 1, explanation: 'INNER JOIN은 조인 조건을 만족하는 양쪽 테이블의 행만 반환합니다.', aiReason: 'SQL 조인 종류를 결과 범위 관점에서 다시 확인해요.' },
  { id: 'ai-50', unit: 'screen', type: '객관식', question: '웹 화면의 입력값을 서버에서도 다시 검증해야 하는 가장 중요한 이유는?', choices: ['CSS 파일을 줄이기 위해', '화면 색상을 통일하기 위해', '브라우저마다 글꼴을 맞추기 위해', '클라이언트 검증은 우회될 수 있어 데이터와 보안을 보호해야 하기 때문에'], answer: 3, explanation: '브라우저 검증만으로는 조작된 요청을 막을 수 없으므로 서버에서 최종 검증해야 합니다.', aiReason: '화면 구현과 애플리케이션 보안의 연결점을 시험 문제로 재구성했어요.' }
];

aiMockQuestions.push(...aiAdditionalQuestions);

const mockSets = [
  { no: 1, title: '기초 개념 점검', description: '9개 능력단위의 핵심 개념을 한 번에 점검해요.', time: '30분', questions: 25, score: '미응시', status: '도전 가능' },
  { no: 2, title: '응용 문제 훈련', description: '개념을 실제 상황에 적용하는 문제로 연습해요.', time: '30분', questions: 25, score: '미응시', status: '도전 가능' },
  { no: 3, title: '취약 단원 집중', description: '네트워크·DB·SQL 영역을 중심으로 구성했어요.', time: '30분', questions: 25, score: '미응시', status: '도전 가능' },
  { no: 4, title: '최종 실전 리허설', description: '시험 전 마지막 실전 감각을 끌어올려요.', time: '30분', questions: 25, score: '미응시', status: '도전 가능' }
];

const AUTH_DB_KEY = 'certain-users-v1';
const AUTH_SESSION_KEY = 'certain-session-v1';
const LEGACY_STORAGE_KEYS = ['certain-bookmarks', 'certain-history', 'certain-wrong', 'certain-resume-question'];

function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch (error) { return null; }
}

function safeSetItem(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (error) { return false; }
}

function safeRemoveItem(key) {
  try { localStorage.removeItem(key); } catch (error) { /* Guest mode still works in memory. */ }
}

let currentUserId = safeGetItem(AUTH_SESSION_KEY) || null;
let authMode = 'login';
let examTimerId = null;

function readJson(key, fallback) {
  try {
    const value = safeGetItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function emptyStudyState() {
  return { bookmarked: [], history: {}, wrongIds: [], resumeQuestionId: 'q-01' };
}

function normalizeStudyState(source = {}) {
  const history = source && source.history && typeof source.history === 'object' && !Array.isArray(source.history) ? source.history : {};
  return {
    bookmarked: Array.isArray(source.bookmarked) ? [...new Set(source.bookmarked)] : [],
    history: { ...history },
    wrongIds: Array.isArray(source.wrongIds) ? [...new Set(source.wrongIds)] : [],
    resumeQuestionId: typeof source.resumeQuestionId === 'string' ? source.resumeQuestionId : 'q-01'
  };
}

function readUsers() {
  const users = readJson(AUTH_DB_KEY, {});
  return users && typeof users === 'object' && !Array.isArray(users) ? users : {};
}

function writeUsers(users) {
  return safeSetItem(AUTH_DB_KEY, JSON.stringify(users));
}

function activeUser() {
  const users = readUsers();
  const user = currentUserId && Object.prototype.hasOwnProperty.call(users, currentUserId) ? users[currentUserId] : null;
  return user && typeof user === 'object' && !Array.isArray(user) && typeof user.id === 'string' && typeof user.password === 'string' ? user : null;
}

function loadStudyState(userId) {
  const users = readUsers();
  const user = userId && Object.prototype.hasOwnProperty.call(users, userId) ? users[userId] : null;
  return normalizeStudyState(user?.study);
}

// The first version used global keys and seeded example wrong answers. Remove those keys
// so the new account-based store always starts with an empty study record.
LEGACY_STORAGE_KEYS.forEach((key) => safeRemoveItem(key));
if (currentUserId && !activeUser()) {
  currentUserId = null;
  safeRemoveItem(AUTH_SESSION_KEY);
}

const state = {
  route: getRoute(),
  selectedUnit: 'deploy',
  learnScope: 'all',
  mockScope: 'all',
  mockUnitFilter: 'deploy',
  practiceIndex: 0,
  practiceFilter: 'all',
  practiceUnit: null,
  practiceSelected: null,
  practiceSubmitted: false,
  ...loadStudyState(currentUserId),
  examActive: false,
  examMode: 'book',
  examUnitFilter: 'all',
  examSet: 1,
  examIndex: 0,
  examAnswers: {},
  examSubmitted: false,
  examQuestionIds: [],
  examTimeLeft: 0
};

function getRoute() {
  const route = window.location.hash.replace('#', '').split('/')[0];
  return ['dashboard', 'learn', 'study', 'practice', 'mock', 'notes', 'pdf'].includes(route) ? route : 'dashboard';
}

function getUnit(id) { return units.find((unit) => unit.id === id) || units[0]; }
function getQuestion(id) { return questionBank.find((question) => question.id === id); }
function getAiQuestion(id) { return aiMockQuestions.find((question) => question.id === id); }

function shuffleQuestions(list) {
  const shuffled = [...list];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}
function saveState() {
  const user = activeUser();
  if (!user) return;
  const users = readUsers();
  users[currentUserId] = { ...user, study: normalizeStudyState(state) };
  writeUsers(users);
}

function setResumeQuestion(questionId) {
  if (!questionId) return;
  state.resumeQuestionId = questionId;
  saveState();
}

function resetTransientState() {
  state.practiceIndex = 0;
  state.practiceFilter = 'all';
  state.practiceUnit = null;
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  state.examActive = false;
  state.examAnswers = {};
  state.examSubmitted = false;
  state.examQuestionIds = [];
  state.examTimeLeft = 0;
}

function applyStudyState(study) {
  Object.assign(state, normalizeStudyState(study));
  resetTransientState();
}

function setAuthMessage(message, isError = true) {
  const messageElement = document.querySelector('#auth-message');
  if (!messageElement) return;
  messageElement.textContent = message;
  messageElement.classList.toggle('is-error', isError);
  messageElement.classList.toggle('is-success', !isError);
}

function updateAuthModal() {
  if (!authModal) return;
  const isRegister = authMode === 'register';
  const title = document.querySelector('#auth-title');
  const description = document.querySelector('#auth-description');
  const confirmField = document.querySelector('#auth-password-confirm-field');
  const submit = document.querySelector('#auth-submit');
  const switchButton = document.querySelector('#auth-switch');
  if (title) title.textContent = isRegister ? '회원가입' : '로그인';
  if (description) description.textContent = isRegister ? '아이디와 비밀번호를 만들면 학습 기록을 따로 저장할 수 있어요.' : '로그인하면 오답·북마크·이어서 풀기 위치가 이 계정에 저장돼요.';
  if (confirmField) confirmField.hidden = !isRegister;
  if (submit) submit.textContent = isRegister ? '계정 만들기' : '로그인';
  if (switchButton) switchButton.textContent = isRegister ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 회원가입';
  setAuthMessage('');
}

function openAuth(mode = 'login') {
  if (!authModal) return;
  authMode = mode;
  updateAuthModal();
  authModal.classList.add('is-open');
  authModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => document.querySelector('#auth-id')?.focus(), 30);
}

function closeAuth() {
  if (!authModal) return;
  authModal.classList.remove('is-open');
  authModal.setAttribute('aria-hidden', 'true');
  authForm?.reset();
  setAuthMessage('');
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const idInput = document.querySelector('#auth-id');
  const passwordInput = document.querySelector('#auth-password');
  const confirmInput = document.querySelector('#auth-password-confirm');
  const id = idInput?.value.trim().toLowerCase() || '';
  const password = passwordInput?.value || '';
  const users = readUsers();
  const hasUser = Object.prototype.hasOwnProperty.call(users, id);

  if (!/^[a-z0-9가-힣_-]{1,20}$/i.test(id)) {
    setAuthMessage('아이디는 영문·숫자·한글·_·-만 사용할 수 있어요.');
    return;
  }
  if (password.length < 4) {
    setAuthMessage('비밀번호는 4자 이상 입력해주세요.');
    return;
  }

  if (authMode === 'register') {
    if (hasUser) {
      setAuthMessage('이미 사용 중인 아이디예요.');
      return;
    }
    if (password !== (confirmInput?.value || '')) {
      setAuthMessage('비밀번호가 서로 달라요.');
      return;
    }
    users[id] = { id, password, createdAt: new Date().toISOString(), study: emptyStudyState() };
    if (!writeUsers(users)) {
      delete users[id];
      setAuthMessage('브라우저 저장소를 사용할 수 없어 계정을 만들지 못했어요.');
      return;
    }
    currentUserId = id;
    safeSetItem(AUTH_SESSION_KEY, id);
    applyStudyState(users[id].study);
    closeAuth();
    showToast(`${id}님 계정이 만들어졌어요. 이제 학습 기록이 저장됩니다.`);
    render();
    return;
  }

  const user = hasUser && users[id] && typeof users[id] === 'object' && typeof users[id].password === 'string' ? users[id] : null;
  if (!user || user.password !== password) {
    setAuthMessage('아이디 또는 비밀번호를 확인해주세요.');
    return;
  }
  currentUserId = id;
  safeSetItem(AUTH_SESSION_KEY, id);
  applyStudyState(user.study);
  closeAuth();
  showToast(`${id}님으로 로그인했어요. 학습 기록을 불러왔습니다.`);
  render();
}

function logout() {
  stopExamTimer();
  currentUserId = null;
  safeRemoveItem(AUTH_SESSION_KEY);
  applyStudyState(emptyStudyState());
  state.route = 'dashboard';
  if (window.location.hash !== '#dashboard') window.location.hash = 'dashboard';
  showToast('로그아웃했어요. 지금부터는 저장되지 않는 게스트 모드입니다.');
  render();
}

function updateAccountUI() {
  const user = activeUser();
  const profileName = document.querySelector('#profile-name');
  const profileStatus = document.querySelector('#profile-status');
  const profileAction = document.querySelector('#profile-auth-action');
  const topAvatar = document.querySelector('#top-avatar');
  const profileAvatar = document.querySelector('#profile-avatar');
  if (profileName) profileName.textContent = user ? user.id : '게스트';
  if (profileStatus) profileStatus.textContent = user ? '학습 기록 저장 중' : '로그인하면 저장됨';
  if (profileAction) {
    profileAction.textContent = user ? '로그아웃' : '로그인';
    profileAction.dataset.action = user ? 'logout' : 'open-auth';
  }
  const initial = user ? user.id.slice(0, 1).toUpperCase() : 'G';
  if (topAvatar) topAvatar.textContent = initial;
  if (profileAvatar) profileAvatar.textContent = initial;
}

function updateMockTimeLabels() {
  if (state.route !== 'mock') return;
  if (!state.examActive) {
    const aiCard = document.querySelector('.ai-mock-card');
    const aiTime = aiCard?.querySelector('.mock-meta span');
    if (aiTime) aiTime.innerHTML = `${icons.clock}${state.mockScope === 'all' ? '60분' : '10분'}`;
    return;
  }
  if (state.examMode !== 'ai') return;
  const fullExam = state.examUnitFilter === 'all';
  const timer = document.querySelector('.timer');
  const examStats = document.querySelectorAll('.exam-side .mini-stat strong');
  if (timer) timer.innerHTML = `${icons.clock} ${formatExamTime(state.examTimeLeft || (fullExam ? 3600 : 600))}`;
  if (examStats[2]) examStats[2].textContent = fullExam ? '60분' : '10분';
}

function examDurationSeconds(mode, unitFilter) {
  if (mode === 'ai') return unitFilter === 'all' ? 60 * 60 : 10 * 60;
  return 30 * 60;
}

function formatExamTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function stopExamTimer() {
  if (examTimerId) window.clearInterval(examTimerId);
  examTimerId = null;
}

function startExamTimer() {
  stopExamTimer();
  examTimerId = window.setInterval(() => {
    if (!state.examActive) { stopExamTimer(); return; }
    state.examTimeLeft = Math.max(0, state.examTimeLeft - 1);
    updateMockTimeLabels();
    if (state.examTimeLeft === 0) {
      stopExamTimer();
      state.examActive = false;
      showToast('시험 시간이 끝났어요.');
      render();
    }
  }, 1000);
}

function resumePractice() {
  const questionIndex = questionBank.findIndex((question) => question.id === state.resumeQuestionId);
  state.practiceFilter = 'all';
  state.practiceUnit = null;
  state.practiceIndex = questionIndex >= 0 ? questionIndex : 0;
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  navigate('practice');
}

function resetState() {
  if (!window.confirm('저장된 북마크, 오답 기록, 이어 풀기 위치를 모두 초기화할까요?')) return;
  stopExamTimer();
  state.bookmarked = [];
  state.history = {};
  state.wrongIds = [];
  state.resumeQuestionId = 'q-01';
  state.learnScope = 'all';
  state.mockScope = 'all';
  state.mockUnitFilter = 'deploy';
  state.practiceIndex = 0;
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  state.examActive = false;
  state.examAnswers = {};
  state.examSubmitted = false;
  state.examQuestionIds = [];
  state.examTimeLeft = 0;
  saveState();
  showToast('학습 기록을 초기화했어요.');
  render();
}

function navigate(route) {
  state.route = route;
  if (window.location.hash !== `#${route}`) window.location.hash = route;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function closeSidebar() { sidebar.classList.remove('is-open'); }

function setBreadcrumb(label) {
  const base = '<span>학습 공간</span><b>/</b>';
  breadcrumbs.innerHTML = `${base}<strong>${label}</strong>`;
}

function updateNav() {
  document.querySelectorAll('.nav-item[data-route]').forEach((item) => item.classList.toggle('is-active', item.dataset.route === state.route || (state.route === 'study' && item.dataset.route === 'learn')));
}

function render() {
  updateNav();
  if (state.route === 'dashboard') { setBreadcrumb('대시보드'); app.innerHTML = renderDashboard(); }
  if (state.route === 'learn') { setBreadcrumb('단원 학습'); app.innerHTML = renderLearn(); }
  if (state.route === 'study') { setBreadcrumb(`${getUnit(state.selectedUnit).title} · 학습`); app.innerHTML = renderStudy(); }
  if (state.route === 'practice') { setBreadcrumb('문제 풀기'); app.innerHTML = renderPractice(); }
  if (state.route === 'mock') { setBreadcrumb(state.examActive ? `${state.examMode === 'ai' ? 'AI ' : ''}${state.examSet}회 모의고사` : '모의고사 풀기'); app.innerHTML = state.examActive ? renderExam() : renderMock(); }
  if (state.route === 'notes') { setBreadcrumb('오답노트'); app.innerHTML = renderNotes(); }
  if (state.route === 'pdf') { setBreadcrumb('교재 원본 PDF'); app.innerHTML = renderPdfViewer(); }
  updateAccountUI();
  updateMockTimeLabels();
}

function renderPdfViewer() {
  return `
    <div class="screen-toolbar pdf-screen-toolbar">
      <div><div class="eyebrow">REFERENCE PDF</div><h1 class="page-title">교재 원본 PDF</h1><p class="page-subtitle">학습 내용과 문제의 원문을 확인할 때 사용하는 교재입니다. 브라우저 안에서 페이지를 넘기며 바로 볼 수 있어요.</p></div>
      <div class="toolbar-actions"><a class="button button-secondary" href="${PDF_URL}" target="_blank" rel="noopener">새 탭에서 열기 ${icons.arrow}</a><a class="button button-primary" href="${PDF_URL}" download>PDF 저장 ${icons.arrow}</a></div>
    </div>
    <section class="pdf-viewer-layout">
      <div class="pdf-frame-wrap"><iframe class="pdf-frame" src="${PDF_URL}#view=FitH" title="정보처리산업기사 학습교재 원본 PDF"></iframe></div>
      <aside class="pdf-info-panel"><div class="eyebrow">PDF REFERENCE</div><h2>원문을 옆에 두고 공부하세요.</h2><p>단원 학습이나 문제 풀이 중 교재 표현과 페이지를 확인할 때 사용할 수 있습니다.</p><div class="pdf-info-list"><div><span>파일</span><strong>SW개발 학습교재</strong></div><div><span>구성</span><strong>9개 단원 · 모의평가</strong></div><div><span>사용법</span><strong>스크롤 · 확대 · 페이지 검색</strong></div></div><a class="text-button pdf-download-link" href="${PDF_URL}" download>원본 파일 다운로드 ${icons.arrow}</a></aside>
    </section>`;
}

function renderDashboard() {
  const resumeQuestion = getQuestion(state.resumeQuestionId) || questionBank[0];
  const resumeUnit = getUnit(resumeQuestion.unit);
  return `
    <div class="stack-gap">
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow">오늘 공부</div>
          <h1>오늘 공부할 내용을<br /><span>골라보세요.</span></h1>
          <p>개념을 읽거나 문제를 풀면서 정보처리산업기사 필기 내용을 차근차근 정리해보세요.</p>
          <div class="hero-actions">
            <button class="button button-primary" data-action="resume-practice">이어서 풀기 ${icons.arrow}</button>
            <button class="button button-secondary" data-action="go-mock">모의고사 풀기 ${icons.play}</button>
          </div>
        </div>
      </section>

      <section class="stats-grid">
        <article class="stat-card stat-card-action" data-action="resume-practice"><div class="stat-top"><span>이어서 풀기</span><span class="stat-icon">${icons.play}</span></div><div class="stat-value"><strong>${String(questionBank.findIndex((item) => item.id === resumeQuestion.id) + 1).padStart(2, '0')}</strong><span>번 문제</span></div><div class="stat-trend">${resumeUnit.title}</div></article>
        <article class="stat-card"><div class="stat-top"><span>오답노트</span><span class="stat-icon">${icons.rotate}</span></div><div class="stat-value"><strong>${state.wrongIds.length}</strong><span>문제</span></div><div class="stat-trend">다시 확인할 문제</div></article>
        <article class="stat-card"><div class="stat-top"><span>북마크</span><span class="stat-icon">${icons.bookmark}</span></div><div class="stat-value"><strong>${state.bookmarked.length}</strong><span>문제</span></div><div class="stat-trend">저장해둔 문제</div></article>
      </section>

      <section>
        <div class="section-heading"><div><h2>공부 방법 선택</h2><p>원하는 방식으로 공부를 시작하세요.</p></div></div>
        <div class="quick-grid">
          <button class="quick-card" data-action="go-learn"><span class="quick-icon">${icons.book}</span><span><strong>단원 공부하기</strong><p>전체 단원 또는<br />특정 단원만 선택</p></span><span class="arrow">${icons.chevron}</span></button>
          <button class="quick-card" data-action="go-mock"><span class="quick-icon">${icons.pen}</span><span><strong>모의고사 풀기</strong><p>전체 범위 또는<br />단원별로 선택</p></span><span class="arrow">${icons.chevron}</span></button>
          <button class="quick-card" data-action="go-notes"><span class="quick-icon">${icons.rotate}</span><span><strong>단원별 틀린 문제</strong><p>어떤 단원을 더<br />공부할지 확인</p></span><span class="arrow">${icons.chevron}</span></button>
        </div>
      </section>

      <section class="dashboard-columns">
        <div class="panel panel-padding">
          <div class="section-heading"><div><h2>필수 능력단위</h2><p>공부하고 싶은 단원을 골라 시작하세요.</p></div><button class="text-button" data-route="learn">전체 보기 ${icons.arrow}</button></div>
          <div class="unit-grid">${units.map(renderUnitCard).join('')}</div>
        </div>
        <div class="panel panel-padding recent-panel">
          <div class="section-heading"><div><h2>최근 학습</h2><p>마지막으로 보던 곳에서 이어가세요.</p></div><button class="text-button" data-action="reset-state">초기화</button></div>
          <button class="recent-row" data-action="resume-practice"><span class="recent-row-icon">${icons.play}</span><span><strong>${resumeQuestion.question}</strong><small>${resumeUnit.title} · 교재 p.${resumeQuestion.sourcePage}</small></span><span class="recent-row-arrow">${icons.arrow}</span></button>
          <button class="recent-row" data-action="go-learn"><span class="recent-row-icon blue">${icons.book}</span><span><strong>단원 목록에서 다시 고르기</strong><small>9개 필수 능력단위 · 개념부터 학습</small></span><span class="recent-row-arrow">${icons.arrow}</span></button>
        </div>
      </section>

      <button class="review-card" data-action="resume-practice"><div><div class="review-label">RESUME YOUR SESSION · ${String(questionBank.findIndex((item) => item.id === resumeQuestion.id) + 1).padStart(2, '0')}</div><h3>마지막으로 풀던 문제부터 이어갈까요?</h3><p>${resumeQuestion.question}</p></div><span class="review-arrow">${icons.arrow}</span></button>
    </div>`;
}

function renderUnitCard(unit) {
  return `<button class="unit-card" data-action="select-unit-dashboard" data-unit="${unit.id}"><span class="unit-index">UNIT ${unit.number}</span><span class="unit-status">학습하기</span><h3>${unit.title}</h3><small>${unit.topics[0][0]} · ${unit.topics[1][0]}</small><span class="unit-card-link">단원 열기 ${icons.arrow}</span></button>`;
}

function renderLearn() {
  const unit = getUnit(state.selectedUnit);
  return `
    <div class="screen-toolbar"><div><div class="eyebrow">CURRICULUM</div><h1 class="page-title">단원 공부하기</h1><p class="page-subtitle">전체 단원을 한 번에 보거나, 필요한 단원 하나만 골라 공부할 수 있어요.</p></div><div class="toolbar-actions"><button class="button button-secondary" data-action="resume-practice">이어서 풀기 ${icons.arrow}</button></div></div>
    <div class="study-scope-switch"><button class="scope-button ${state.learnScope === 'all' ? 'is-active' : ''}" data-action="set-learn-scope" data-scope="all">전체 같이 보기</button><button class="scope-button ${state.learnScope === 'unit' ? 'is-active' : ''}" data-action="set-learn-scope" data-scope="unit">특정 단원만 보기</button></div>
    ${state.learnScope === 'all' ? renderAllUnitStudy() : renderSpecificUnitStudy(unit)}`;
}

function renderAllUnitStudy() {
  return `<section class="panel all-unit-panel"><div class="section-heading"><div><h2>전체 단원</h2><p>교재의 9개 필수 능력단위를 모두 살펴볼 수 있어요.</p></div><span class="muted-label">9개 단원</span></div><div class="all-unit-grid">${units.map((item) => `<article class="all-unit-card"><div class="all-unit-card-head"><span class="unit-index">UNIT ${item.number}</span><span class="all-unit-card-count">${item.topics.length}개 주제</span></div><h3>${item.title}</h3><p>${item.description}</p><div class="all-unit-topics">${item.topics.slice(0, 3).map((topic) => `<span>${topic[0]}</span>`).join('')}</div><div class="all-unit-card-actions"><button class="text-button" data-action="select-study-unit" data-unit="${item.id}">자세히 보기 ${icons.arrow}</button><button class="button button-primary" data-action="start-study-unit" data-unit="${item.id}">공부하기 ${icons.play}</button></div></article>`).join('')}</div></section>`;
}

function renderSpecificUnitStudy(unit) {
  return `<div class="learn-layout">
    <aside class="panel unit-sidebar"><div class="sidebar-label" style="margin:10px 10px 8px">단원 선택</div>${units.map((item) => `<button class="unit-side-item ${item.id === unit.id ? 'is-active' : ''}" data-action="select-study-unit" data-unit="${item.id}"><span class="unit-side-number">${item.number}</span><span class="unit-side-copy"><strong>${item.title}</strong><span>${item.topics.length}개 학습 주제</span></span><span class="unit-side-arrow">${icons.chevron}</span></button>`).join('')}</aside>
    <section class="panel learn-detail">
      <div class="detail-top"><div class="detail-title-wrap"><span class="detail-number">${unit.number}</span><div><h2>${unit.title}</h2><p class="detail-code">${unit.code}</p></div></div><div class="detail-side-note"><strong>${unit.topics.length}개</strong><span>학습 주제</span></div></div>
      <div class="detail-goal"><label>LEARNING GOAL</label><p>${unit.goal}</p></div>
      <h3 class="topic-heading">이 단원에서 배우는 것</h3>
      <div class="topic-grid">${unit.topics.map((topic, index) => `<article class="topic-card"><span>0${index + 1}</span><div><strong>${topic[0]}</strong><small>${topic[1]}</small></div></article>`).join('')}</div>
      <div class="detail-footer"><p>핵심 흐름 · ${unit.highlight}</p><button class="button button-primary" data-action="start-study">학습 시작 ${icons.play}</button></div>
    </section>
  </div>`;
}

function renderStudy() {
  const unit = getUnit(state.selectedUnit);
  const isDeploy = unit.id === 'deploy';
  return `
    <div class="screen-toolbar"><div><button class="text-button" data-route="learn">${icons.chevron} 단원 목록으로</button><div class="eyebrow" style="margin-top:21px">UNIT ${unit.number} · ${unit.title}</div><h1 class="page-title">${isDeploy ? '애플리케이션 배포 환경 구성' : unit.topics[0][0]}</h1><p class="page-subtitle">${unit.description}</p></div><div class="toolbar-actions"><span class="muted-label">학습 1 / 4</span><button class="button button-secondary" data-action="go-practice-unit">이 단원 문제 풀기 ${icons.arrow}</button></div></div>
    <div class="study-layout">
      <article class="panel study-article">
        <div class="article-meta"><span>학습 목표</span><b>약 8분</b></div>
        <div class="study-callout"><strong>${unit.goal}</strong><span>개념을 읽은 뒤 아래 핵심 정리로 기억을 확인해보세요.</span></div>
        <h2>배포 환경의 개념</h2>
        <p>배포 환경이란 개발이 완료된 소스코드를 실행 가능한 형태로 변환하고, 이를 운영 서버까지 전달하는 데 필요한 전체 시스템·도구·절차의 집합을 말합니다.</p>
        <p>형상관리 도구, 빌드 도구, 정적·동적 테스트 도구, 배포 자동화 도구가 서로 연계되어 하나의 파이프라인을 구성합니다.</p>
        <div class="study-compare"><div class="compare-head"><span>웹 서버와 WAS를 구분해 기억하기</span>${icons.info}</div><div class="compare-row"><strong>웹 서버</strong><span>HTML·이미지 등 정적 콘텐츠 응답, 부하 분산</span><em>Apache · Nginx</em></div><div class="compare-row"><strong>WAS</strong><span>동적 비즈니스 로직 처리, DB 연동</span><em>Tomcat · JBoss</em></div></div>
        <h2>핵심 정리</h2>
        <div class="key-points"><div><span>01</span><p>배포 파이프라인은 형상관리 → 빌드 → 정적분석 → 테스트 → 패키징 → 배포 순서로 이어집니다.</p></div><div><span>02</span><p>운영 환경 장애에 대비해 이전 정상 버전으로 되돌리는 롤백 절차를 준비해야 합니다.</p></div><div><span>03</span><p>개발·테스트·운영 환경과 계정·데이터베이스를 분리하면 실수로 운영 데이터가 훼손되는 사고를 줄일 수 있습니다.</p></div></div>
        <div class="article-next"><button class="button button-secondary" data-route="learn">이전</button><button class="button button-primary" data-action="go-practice-unit">내용 확인 문제 풀기 ${icons.arrow}</button></div>
      </article>
      <aside class="panel study-outline"><div class="side-panel-title"><h3>${unit.title}</h3><span>4개 학습</span></div><div class="study-steps">${unit.topics.map((topic, index) => `<button class="study-step ${index === 0 ? 'is-active' : ''}"><span>${index === 0 ? icons.check : `0${index + 1}`}</span><div><strong>${topic[0]}</strong><small>${index === 0 ? '학습 중' : '다음 학습'}</small></div></button>`).join('')}</div><div class="side-divider"></div><p class="study-resume-note">읽던 내용과 문제 위치는 자동으로 저장돼요. 다음에 바로 이어갈 수 있습니다.</p><button class="button button-primary study-quiz-button" data-action="go-practice-unit">단원 문제 풀기 ${icons.play}</button></aside>
    </div>`;
}

function getPracticeQuestions() {
  let list = [...questionBank];
  if (state.practiceUnit) list = list.filter((question) => question.unit === state.practiceUnit);
  if (state.practiceFilter === 'wrong') list = list.filter((question) => state.wrongIds.includes(question.id));
  if (state.practiceFilter === 'bookmarked') list = list.filter((question) => state.bookmarked.includes(question.id));
  return list;
}

function renderPractice() {
  const list = getPracticeQuestions();
  if (!list.length) return `<div class="empty-state"><div><h2>아직 저장한 문제가 없어요</h2><p>문제를 풀며 북마크를 남기면 여기에 모아둘 수 있어요.</p><button class="button button-primary" data-action="set-practice-all">전체 문제 보기</button></div></div>`;
  if (state.practiceIndex >= list.length) state.practiceIndex = 0;
  const question = list[state.practiceIndex];
  const isAnswered = state.practiceSubmitted;
  return `
    <div class="practice-top"><div><div class="eyebrow">RECALL MODE</div><h1 class="page-title">문제 풀기</h1><p class="page-subtitle">답을 고르기 전에, 왜 그런지 먼저 떠올려보세요.</p></div><div class="practice-tabs">${[['all','전체 문제'], ['wrong','오답'], ['bookmarked','북마크']].map(([id,label]) => `<button class="practice-tab ${state.practiceFilter === id ? 'is-active' : ''}" data-action="set-practice-filter" data-filter="${id}">${label}${id === 'wrong' ? ` ${state.wrongIds.length}` : ''}</button>`).join('')}</div></div>
    <div class="question-layout">
      <article class="panel question-card">
        <div class="question-meta"><span><strong>${String(state.practiceIndex + 1).padStart(2, '0')}</strong> / ${String(list.length).padStart(2, '0')} · ${getUnit(question.unit).title}</span><span class="question-tag">${question.tag}</span></div>
        <div class="question-line"><span class="muted-label">${question.source} · p.${question.sourcePage}</span><span class="line"></span><span class="muted-label">${question.difficulty}</span></div>
        <h2 class="question-title">${question.question}</h2>
        <div class="choices">${question.choices.map((choice, index) => `<button class="choice ${isAnswered && index === question.answer ? 'is-correct' : ''} ${isAnswered && state.practiceSelected === index && index !== question.answer ? 'is-wrong' : ''} ${!isAnswered && state.practiceSelected === index ? 'is-selected' : ''}" data-action="select-practice-choice" data-choice="${index}"><span class="choice-number">${index + 1}</span><span>${choice}</span></button>`).join('')}</div>
        ${isAnswered ? `<div class="question-feedback"><strong>${state.practiceSelected === question.answer ? '정답이에요. 정확하게 기억했어요!' : '복습이 필요해요. 해설을 확인해보세요.'}</strong><p>${question.explanation}</p></div>` : ''}
        <div class="question-actions"><div class="question-actions-left"><button class="bookmark-button ${state.bookmarked.includes(question.id) ? 'is-bookmarked' : ''}" data-action="toggle-bookmark">${icons.bookmark}<span>${state.bookmarked.includes(question.id) ? '저장됨' : '북마크'}</span></button><button class="bookmark-button" data-action="show-hint">${icons.info}<span>힌트</span></button></div>${isAnswered ? `<button class="button button-primary" data-action="next-practice">다음 문제 ${icons.arrow}</button>` : `<button class="button button-primary" data-action="submit-practice" ${state.practiceSelected === null ? 'disabled' : ''}>정답 확인 ${icons.check}</button>`}</div>
      </article>
      <aside class="panel question-side"><div class="side-panel-title"><h3>문제 진행</h3><span>${state.practiceIndex + 1} / ${list.length}</span></div><div class="question-map">${list.map((item, index) => `<button class="map-button ${index === state.practiceIndex ? 'is-current' : ''} ${state.history[item.id] === true ? 'is-done' : ''} ${state.history[item.id] === false ? 'is-wrong' : ''}" data-action="select-practice-question" data-index="${index}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div><div class="side-divider"></div><div class="mini-stat-list"><div class="mini-stat"><span>현재 단원</span><strong>${getUnit(question.unit).number} · ${getUnit(question.unit).title}</strong></div><div class="mini-stat"><span>푼 문제</span><strong>${Object.keys(state.history).length}문제</strong></div><div class="mini-stat"><span>권장 학습</span><strong>10분</strong></div></div><div class="hint-card"><label>STUDY TIP</label><p>문제를 맞히는 것보다 틀린 이유를 설명할 수 있는지가 더 중요해요.</p></div></aside>
    </div>`;
}

function renderMock() {
  const selectedUnit = getUnit(state.mockUnitFilter);
  const aiQuestions = state.mockScope === 'unit' ? aiMockQuestions.filter((question) => question.unit === state.mockUnitFilter) : aiMockQuestions;
  return `
    <div class="mock-hero"><div><div class="eyebrow">MOCK TEST</div><h1 class="page-title">모의고사 풀기</h1><p class="page-subtitle">전체 범위로 풀거나, 한 단원만 골라 집중해서 풀 수 있어요.</p></div><div class="mock-filter">${icons.clock} 교재 기반 + AI 재구성</div></div>
    <div class="study-scope-switch mock-scope-switch"><button class="scope-button ${state.mockScope === 'all' ? 'is-active' : ''}" data-action="set-mock-scope" data-scope="all">전체 같이 보기</button><button class="scope-button ${state.mockScope === 'unit' ? 'is-active' : ''}" data-action="set-mock-scope" data-scope="unit">특정 단원만 보기</button></div>
    ${state.mockScope === 'unit' ? `<div class="mock-unit-picker"><span>풀 단원</span><div class="unit-filter-pills">${units.map((unit) => `<button class="unit-filter-pill ${unit.id === state.mockUnitFilter ? 'is-active' : ''}" data-action="set-mock-unit" data-unit="${unit.id}">${unit.number}. ${unit.title}</button>`).join('')}</div></div>` : ''}
    <div class="mock-grid">${state.mockScope === 'all' ? mockSets.map((mock) => `<article class="mock-card"><div class="mock-card-top"><span class="mock-card-number">MOCK TEST 0${mock.no}</span><span class="mock-card-status">${mock.status}</span></div><h3>${mock.title}</h3><p>${mock.description}</p><div class="mock-card-bottom"><div class="mock-meta"><span>${icons.clock}${mock.time}</span><span>${icons.pen}${mock.questions}문항</span></div><span class="mock-score">${mock.score}</span><button class="button button-secondary" data-action="start-exam" data-exam="${mock.no}">${mock.status === '최근 응시' ? '다시 풀기' : '시작하기'} ${icons.arrow}</button></div></article>`).join('') : `<article class="mock-card unit-mock-card"><div class="mock-card-top"><span class="mock-card-number">UNIT MOCK</span><span class="mock-card-status">${selectedUnit.number} 단원</span></div><h3>${selectedUnit.title} 집중 모의고사</h3><p>${selectedUnit.description}와 연결된 문제만 모아 집중해서 풀어보세요.</p><div class="mock-card-bottom"><div class="mock-meta"><span>${icons.clock}10분</span><span>${icons.pen}${questionBank.filter((question) => question.unit === selectedUnit.id).length + aiQuestions.length}문항</span></div><span class="mock-score">단원별</span><button class="button button-secondary" data-action="start-ai-exam" data-unit="${selectedUnit.id}">시작하기 ${icons.arrow}</button></div></article>`}<article class="mock-card ai-mock-card"><div class="mock-card-top"><span class="mock-card-number">AI MOCK TEST</span><span class="mock-card-status">AI 재구성</span></div><h3>${state.mockScope === 'unit' ? `${selectedUnit.title} AI 모의고사` : 'AI 모의고사'}</h3><p>교재의 개념과 기존 문제를 분석해 표현과 상황을 새롭게 바꾼 문제예요.</p><div class="mock-card-bottom"><div class="mock-meta"><span>${icons.clock}15분</span><span>${icons.pen}${aiQuestions.length}문항</span></div><span class="mock-score">새 문제</span><button class="button button-primary" data-action="start-ai-exam" data-unit="${state.mockScope === 'unit' ? state.mockUnitFilter : 'all'}">AI 모의고사 시작 ${icons.arrow}</button></div></article></div>
    <div class="mock-empty"><strong>문제 구성 안내</strong> · 기존 모의고사는 PDF 원문 기준이고, AI 모의고사는 같은 개념을 다른 표현과 상황으로 재구성한 연습용 문제입니다.</div>`;
}

function currentExamQuestions() {
  if (state.examMode === 'ai') {
    const source = state.examUnitFilter === 'all' ? aiMockQuestions : aiMockQuestions.filter((question) => question.unit === state.examUnitFilter);
    if (!state.examQuestionIds.length) return source;
    const ordered = state.examQuestionIds.map(getAiQuestion).filter((question) => question && (state.examUnitFilter === 'all' || question.unit === state.examUnitFilter));
    return ordered.length ? ordered : source;
  }
  return mockQuestions;
}

function currentExamQuestion() { return currentExamQuestions()[state.examIndex]; }

function renderExam() {
  const questions = currentExamQuestions();
  const question = currentExamQuestion();
  const selected = state.examAnswers[state.examIndex];
  const submitted = state.examSubmitted;
  const total = questions.length;
  const title = state.examMode === 'ai' ? 'AI 모의고사' : `${state.examSet}회 · ${mockSets[state.examSet - 1].title}`;
  const label = state.examMode === 'ai' ? 'AI 재구성 모의고사' : `실전 모의고사 ${state.examSet}회`;
  return `
    <div class="exam-topbar"><div><button class="text-button" data-action="exit-exam">${icons.chevron} 모의고사 목록</button><h2 style="margin-top:13px">${title}</h2></div><div class="timer">${icons.clock} ${state.examMode === 'ai' ? '15:00' : '28:42'}</div></div>
    <div class="exam-layout"><article class="panel exam-question-card"><div class="question-meta"><span><strong>${String(state.examIndex + 1).padStart(2, '0')}</strong> / ${total}</span><span class="question-tag">${question.type}</span></div><div class="question-line"><span class="muted-label">${label}</span><span class="line"></span><span class="muted-label">${getUnit(question.unit).title}</span></div><h2 class="question-title">${question.question}</h2>${question.choices ? `<div class="choices">${question.choices.map((choice, index) => `<button class="choice ${submitted && index === question.answer ? 'is-correct' : ''} ${submitted && selected === index && index !== question.answer ? 'is-wrong' : ''} ${!submitted && selected === index ? 'is-selected' : ''}" data-action="select-exam-choice" data-choice="${index}"><span class="choice-number">${index + 1}</span><span>${choice}</span></button>`).join('')}</div>` : `<input class="answer-input" id="exam-answer" value="${selected || ''}" placeholder="답안을 입력하세요" ${submitted ? 'disabled' : ''} />`}${submitted ? `<div class="question-feedback ${question.choices ? '' : 'is-neutral'}"><strong>${question.choices ? (selected === question.answer ? '정답입니다.' : '오답입니다.') : '답안이 저장되었어요.'}</strong><p>${question.explanation}</p>${question.aiReason ? `<p class="ai-reason">${question.aiReason}</p>` : ''}</div>` : ''}<div class="question-actions"><div class="question-actions-left"><span class="muted-label">${question.type === '서술형' ? '핵심어를 포함해 작성하세요.' : '가장 적절한 답을 선택하세요.'}</span></div>${submitted ? `<button class="button button-primary" data-action="next-exam">${state.examIndex === total - 1 ? '시험 결과 보기' : '다음 문항'} ${icons.arrow}</button>` : `<button class="button button-primary" data-action="submit-exam">답안 제출 ${icons.check}</button>`}</div></article><aside class="panel exam-side"><div class="side-panel-title"><h3>문항 목록</h3><span>${total}문항</span></div><p>현재 문항 ${state.examIndex + 1} / ${total}</p><div class="question-map">${questions.map((item, index) => `<button class="map-button ${index === state.examIndex ? 'is-current' : ''} ${state.examAnswers[index] !== undefined ? 'is-done' : ''}" data-action="select-exam-question" data-index="${index}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div><div class="side-divider"></div><div class="mini-stat-list"><div class="mini-stat"><span>문제 유형</span><strong>${state.examMode === 'ai' ? '개념 응용형' : '객관식·서술형'}</strong></div><div class="mini-stat"><span>문제 수</span><strong>${total}문항</strong></div><div class="mini-stat"><span>제한 시간</span><strong>${state.examMode === 'ai' ? '15분' : '30분'}</strong></div></div><button class="button button-secondary exam-submit" data-action="exit-exam">나중에 이어 풀기</button></aside></div>`;
}

function renderNotes() {
  const notes = state.wrongIds.map(getQuestion).filter(Boolean);
  const unitStats = units.map((unit) => ({ unit, count: notes.filter((question) => question.unit === unit.id).length }));
  const recommended = [...unitStats].sort((a, b) => b.count - a.count)[0];
  const recommendationTitle = recommended.count ? recommended.unit.title : '아직 오답이 없어요';
  const recommendationText = recommended.count ? '현재 가장 많은 오답이 쌓인 단원입니다. 개념을 다시 읽고 문제를 풀어보세요.' : '문제를 풀면 단원별 오답이 자동으로 정리됩니다.';
  return `
    <div class="screen-toolbar"><div><div class="eyebrow">WRONG ANSWERS</div><h1 class="page-title">단원별 틀린 문제</h1><p class="page-subtitle">어떤 단원에서 자주 틀리는지 확인하고, 필요한 부분부터 다시 공부하세요.</p></div><div class="toolbar-actions"><button class="button button-primary" data-action="review-all-notes">전체 오답 풀기 ${icons.play}</button></div></div>
    <div class="notes-summary"><article class="notes-summary-card lime"><div class="notes-summary-top"><span>다시 봐야 할 문제</span><strong>${notes.length}</strong></div><h3>저장한 오답을 정리해요</h3><p>단원별 카드를 눌러 해당 단원의 오답만 모아 풀 수 있어요.</p></article><article class="notes-summary-card"><div class="notes-summary-top"><span>먼저 공부할 단원</span><strong style="color:var(--red)">${recommended.count}문제</strong></div><h3>${recommendationTitle}</h3><p>${recommendationText}</p></article></div>
    <section class="wrong-unit-section"><div class="section-heading"><div><h2>단원별 오답 수</h2><p>문제가 있는 단원부터 우선 복습하는 것을 추천해요.</p></div></div><div class="wrong-unit-grid">${unitStats.map(({ unit, count }) => `<button class="wrong-unit-card ${recommended.unit.id === unit.id && count > 0 ? 'is-recommended' : ''}" data-action="review-unit-wrongs" data-unit="${unit.id}"><span class="wrong-unit-number">${unit.number}</span><span class="wrong-unit-copy"><strong>${unit.title}</strong><small>${count ? `${count}개 오답` : '틀린 문제 없음'}</small></span><span class="wrong-unit-arrow">${icons.arrow}</span></button>`).join('')}</div></section>
    <div class="section-heading"><div><h2>저장한 오답</h2><p>최근에 틀린 문제부터 표시합니다.</p></div><select class="filter-select" aria-label="오답 필터"><option>최근 오답순</option><option>단원별</option><option>난이도순</option></select></div>
    <div class="notes-list">${notes.slice(0, 6).map((question, index) => `<article class="note-card"><span class="note-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${question.question}</h3><p>${getUnit(question.unit).title} · 교재 p.${question.sourcePage}</p><div class="note-tags"><span class="note-tag">${question.tag}</span><span class="note-tag" style="color:var(--red);background:rgba(255,126,138,.08)">${question.difficulty}</span></div></div><button class="icon-button" data-action="review-note" data-question="${question.id}" aria-label="문제 다시 풀기">${icons.arrow}</button></article>`).join('')}</div>`;
}

function handlePracticeChoice(index) {
  if (state.practiceSubmitted) return;
  state.practiceSelected = index;
  render();
}

function submitPractice() {
  const list = getPracticeQuestions();
  const question = list[state.practiceIndex];
  if (state.practiceSelected === null) { showToast('먼저 답을 선택해주세요.'); return; }
  state.practiceSubmitted = true;
  setResumeQuestion(question.id);
  state.history[question.id] = state.practiceSelected === question.answer;
  if (state.practiceSelected !== question.answer && !state.wrongIds.includes(question.id)) state.wrongIds.unshift(question.id);
  saveState();
  render();
}

function nextPractice() {
  const list = getPracticeQuestions();
  state.practiceIndex = (state.practiceIndex + 1) % list.length;
  setResumeQuestion(list[state.practiceIndex].id);
  state.practiceSelected = null;
  state.practiceSubmitted = false;
  render();
}

function startExam(no, mode = 'book', unitFilter = 'all') {
  state.examSet = Number(no) || 1;
  state.examMode = mode;
  state.examUnitFilter = unitFilter;
  state.examIndex = 0;
  state.examAnswers = {};
  state.examSubmitted = false;
  state.examActive = true;
  const aiSource = mode === 'ai' ? (unitFilter === 'all' ? aiMockQuestions : aiMockQuestions.filter((question) => question.unit === unitFilter)) : [];
  state.examQuestionIds = mode === 'ai' ? shuffleQuestions(aiSource).map((question) => question.id) : [];
  state.examTimeLeft = examDurationSeconds(mode, unitFilter);
  navigate('mock');
  startExamTimer();
}

function submitExam() {
  const question = currentExamQuestion();
  if (question.choices) {
    if (state.examAnswers[state.examIndex] === undefined) { showToast('답을 선택해주세요.'); return; }
  } else {
    const input = document.querySelector('#exam-answer');
    if (!input || !input.value.trim()) { showToast('답안을 입력해주세요.'); return; }
    state.examAnswers[state.examIndex] = input.value.trim();
  }
  state.examSubmitted = true;
  render();
}

function nextExam() {
  const questions = currentExamQuestions();
  if (state.examIndex === questions.length - 1) {
    const correct = questions.filter((question, index) => question.choices && state.examAnswers[index] === question.answer).length;
    stopExamTimer();
    state.examActive = false;
    showToast(`${state.examMode === 'ai' ? 'AI 모의고사' : '모의고사'}를 완료했어요. 객관식 ${correct}개 정답`);
    render();
    return;
  }
  state.examIndex += 1;
  state.examSubmitted = false;
  render();
}

function openSearch() {
  searchModal.classList.add('is-open');
  searchModal.setAttribute('aria-hidden', 'false');
  searchInput.value = '';
  renderSearchResults('');
  window.setTimeout(() => searchInput.focus(), 30);
}

function closeSearch() {
  searchModal.classList.remove('is-open');
  searchModal.setAttribute('aria-hidden', 'true');
}

function renderSearchResults(query) {
  const normalized = query.trim().toLowerCase();
  const unitResults = units.filter((unit) => !normalized || `${unit.title} ${unit.description} ${unit.topics.flat().join(' ')}`.toLowerCase().includes(normalized)).slice(0, 5);
  const questionResults = questionBank.filter((question) => !normalized || `${question.question} ${question.tag}`.toLowerCase().includes(normalized)).slice(0, 4);
  if (!normalized) {
    searchResults.innerHTML = `<div class="search-placeholder">단원명이나 개념을 검색해보세요.<br />예: 정규화, WAS, 리팩토링</div>`;
    return;
  }
  if (!unitResults.length && !questionResults.length) { searchResults.innerHTML = '<div class="search-placeholder">검색 결과가 없어요.</div>'; return; }
  searchResults.innerHTML = [...unitResults.map((unit) => `<button class="search-result" data-action="search-navigate" data-route="learn" data-unit="${unit.id}"><span class="search-result-icon">${icons.book}</span><span><strong>${unit.title}</strong><span>단원 학습 · ${unit.topics.map((topic) => topic[0]).join(' · ')}</span></span></button>`), ...questionResults.map((question) => `<button class="search-result" data-action="search-question" data-question="${question.id}"><span class="search-result-icon">${icons.pen}</span><span><strong>${question.question}</strong><span>${getUnit(question.unit).title} · ${question.tag}</span></span></button>`)].join('');
}

document.addEventListener('click', (event) => {
  const routeElement = event.target.closest('[data-route]');
  if (routeElement) {
    if (routeElement.dataset.route === 'learn' && routeElement.dataset.unit) state.selectedUnit = routeElement.dataset.unit;
    navigate(routeElement.dataset.route);
    return;
  }

  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const action = actionElement.dataset.action;

  if (action === 'open-sidebar') sidebar.classList.add('is-open');
  if (action === 'close-sidebar') closeSidebar();
  if (action === 'open-search') openSearch();
  if (action === 'close-search') closeSearch();
  if (action === 'open-auth') openAuth('login');
  if (action === 'close-auth') closeAuth();
  if (action === 'toggle-auth-mode') { authMode = authMode === 'login' ? 'register' : 'login'; authForm?.reset(); updateAuthModal(); }
  if (action === 'logout') logout();
  if (action === 'go-learn') { state.learnScope = 'all'; navigate('learn'); }
  if (action === 'go-mock') { state.mockScope = 'all'; navigate('mock'); }
  if (action === 'go-notes') navigate('notes');
  if (action === 'go-practice') { state.practiceUnit = null; state.practiceIndex = 0; navigate('practice'); }
  if (action === 'resume-practice' || action === 'continue-learning') resumePractice();
  if (action === 'reset-state') resetState();
  if (action === 'start-mock') startExam(1);
  if (action === 'select-unit-dashboard') { state.selectedUnit = actionElement.dataset.unit; state.learnScope = 'unit'; navigate('learn'); }
  if (action === 'select-unit') { state.selectedUnit = actionElement.dataset.unit; render(); }
  if (action === 'set-learn-scope') { state.learnScope = actionElement.dataset.scope; render(); }
  if (action === 'select-study-unit') { state.selectedUnit = actionElement.dataset.unit; state.learnScope = 'unit'; render(); }
  if (action === 'start-study-unit') { state.selectedUnit = actionElement.dataset.unit; state.learnScope = 'unit'; navigate('study'); }
  if (action === 'start-study') navigate('study');
  if (action === 'go-practice-unit') { state.practiceUnit = state.selectedUnit; state.practiceIndex = 0; state.practiceFilter = 'all'; state.practiceSelected = null; state.practiceSubmitted = false; navigate('practice'); }
  if (action === 'set-practice-filter') { state.practiceFilter = actionElement.dataset.filter; state.practiceUnit = null; state.practiceIndex = 0; state.practiceSelected = null; state.practiceSubmitted = false; render(); }
  if (action === 'set-practice-all') { state.practiceFilter = 'all'; state.practiceUnit = null; state.practiceIndex = 0; render(); }
  if (action === 'select-practice-choice') handlePracticeChoice(Number(actionElement.dataset.choice));
  if (action === 'submit-practice') submitPractice();
  if (action === 'next-practice') nextPractice();
  if (action === 'select-practice-question') { state.practiceIndex = Number(actionElement.dataset.index); const selectedQuestion = getPracticeQuestions()[state.practiceIndex]; setResumeQuestion(selectedQuestion?.id); state.practiceSelected = null; state.practiceSubmitted = false; render(); }
  if (action === 'toggle-bookmark') {
    const question = getPracticeQuestions()[state.practiceIndex];
    if (!question) return;
    state.bookmarked = state.bookmarked.includes(question.id) ? state.bookmarked.filter((id) => id !== question.id) : [...state.bookmarked, question.id];
    saveState(); render();
  }
  if (action === 'show-hint') showToast('힌트: 문제의 핵심 용어를 먼저 떠올려보세요.');
  if (action === 'start-exam') startExam(actionElement.dataset.exam);
  if (action === 'set-mock-scope') { state.mockScope = actionElement.dataset.scope; render(); }
  if (action === 'set-mock-unit') { state.mockScope = 'unit'; state.mockUnitFilter = actionElement.dataset.unit; render(); }
  if (action === 'start-ai-exam') startExam(1, 'ai', actionElement.dataset.unit || 'all');
  if (action === 'exit-exam') { stopExamTimer(); state.examActive = false; navigate('mock'); }
  if (action === 'select-exam-choice' && !state.examSubmitted) { state.examAnswers[state.examIndex] = Number(actionElement.dataset.choice); render(); }
  if (action === 'select-exam-question') { state.examIndex = Number(actionElement.dataset.index); state.examSubmitted = false; render(); }
  if (action === 'submit-exam') submitExam();
  if (action === 'next-exam') nextExam();
  if (action === 'review-note') {
    const question = getQuestion(actionElement.dataset.question);
    const index = questionBank.findIndex((item) => item.id === question.id);
    setResumeQuestion(question.id);
    state.practiceFilter = 'all'; state.practiceUnit = null; state.practiceIndex = index; state.practiceSelected = null; state.practiceSubmitted = false; navigate('practice');
  }
  if (action === 'review-all-notes') { state.practiceFilter = 'wrong'; state.practiceUnit = null; state.practiceIndex = 0; state.practiceSelected = null; state.practiceSubmitted = false; navigate('practice'); }
  if (action === 'review-unit-wrongs') {
    const unitQuestions = questionBank.filter((question) => question.unit === actionElement.dataset.unit && state.wrongIds.includes(question.id));
    state.practiceFilter = 'wrong'; state.practiceUnit = actionElement.dataset.unit; state.practiceIndex = 0; state.practiceSelected = null; state.practiceSubmitted = false;
    if (unitQuestions[0]) setResumeQuestion(unitQuestions[0].id);
    navigate('practice');
  }
  if (action === 'search-navigate') { state.selectedUnit = actionElement.dataset.unit; closeSearch(); navigate('learn'); }
  if (action === 'search-question') { const index = questionBank.findIndex((item) => item.id === actionElement.dataset.question); setResumeQuestion(actionElement.dataset.question); state.practiceFilter = 'all'; state.practiceUnit = null; state.practiceIndex = index; state.practiceSelected = null; state.practiceSubmitted = false; closeSearch(); navigate('practice'); }
});

searchInput.addEventListener('input', (event) => renderSearchResults(event.target.value));
authForm?.addEventListener('submit', handleAuthSubmit);
window.addEventListener('hashchange', () => { state.route = getRoute(); render(); });
window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  if (event.key === 'Escape') closeSearch();
});

render();
