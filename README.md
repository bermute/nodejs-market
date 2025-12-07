# 중고거래 판매글·채팅·약속잡기 도우미

Node.js + Express + EJS + socket.io + OpenAI 로 구현한 과제형 웹앱입니다. 판매글 작성 → AI 자동 설명 → 실시간 채팅 → 약속잡기 → 알림까지 한 번에 체험할 수 있습니다.

## 실행 방법

1. 의존성 설치  
   `npm install`
2. 환경 변수 파일 생성  
   `cp env.sample .env` 후 `OPENAI_API_KEY` 값을 채워 주세요.
3. 개발 서버 실행  
   `npm run dev` (또는 `npm start`)
4. 브라우저에서 `http://localhost:4000` 접속

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI Responses API 호출용 키 |
| `PORT` | 서버 포트 (기본 4000) |

## 폴더 구조

```
c:\newProject
├─server.js                # Express + socket.io 엔트리
├─routes
│   ├─posts.js             # 화면 라우트 (리스트/작성/상세)
│   └─api.js               # AI, 약속 관련 REST API
├─services
│   ├─aiService.js         # OpenAI 호출 래퍼
│   └─notificationService.js # 약속 알림 예약
├─data
│   ├─db.js                # in-memory + JSON 저장소
│   └─storage.json         # 초기 더미 데이터
├─views                    # EJS 뷰 (layout/index/post_new/post_show/404)
├─public
│   ├─css/styles.css       # 기본 스타일
│   ├─js                   # main / ai-helper / chat / schedule
│   └─uploads              # 업로드 및 샘플 이미지
└─docs/PRD.md              # 요구사항 문서 (제공됨)
```

## 주요 기능

- **판매글 리스트/상세/작성**: 파일 업로드 + 기본 폼
- **AI 판매글 초안**: 사진 업로드 시 모달 → `/api/ai/generate-post`
- **실시간 채팅**: 게시글 ID 별 socket.io 룸 연결
- **약속잡기 + 알림**: 예약 등록 → 상태 `예약중` → setTimeout 으로 알림 브로드캐스트
- **데이터 저장**: `data/storage.json` 에 간단히 영속화 (서버 재시작 시 로드)

## 주석/기술서 팁

- 중학생도 이해할 수 있는 한국어 주석을 중심 파일에 추가했습니다.
- 서버 재기동 시 알림 예약이 초기화된다는 점은 기술서에 명시하세요.
- ERD/구조도 작성 시 README 의 폴더 구조와 모델 정의( `data/db.js` )를 참고하면 빠릅니다.



