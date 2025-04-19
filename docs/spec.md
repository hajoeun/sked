## 목적

웹 페이지(예: 모바일 청첩장)에서 일정 정보를 자동 추출하여, 사용자가 별도 로그인 없이 자신의 캘린더에 추가할 수 있도록 `.ics` 파일을 생성/다운로드하는 일정 관리 도구 **Sked** 개발.

---

## 핵심 기능 요약

1. 사용자는 청첩장 등 일정 포함 링크를 입력한다.
2. 서버는 해당 링크의 웹 페이지에서 본문 텍스트를 추출한다.
3. 텍스트에서 LLM 기반으로 일정 정보(제목, 설명, 날짜, 시간, 장소)를 파악한다.
4. 추출된 정보를 기반으로 `.ics` 캘린더 파일을 생성한다.
5. 사용자는 해당 파일을 다운로드 받아 자신의 캘린더에 직접 추가한다.

---

## 시스템 구성

### 기술 스택 요약

| 구성 요소 | 기술 스택 | 배포 대상 |
| --- | --- | --- |
| **Frontend (UI)** | Next.js (App Router), Tailwind CSS, ShadCN UI | Vercel |
| **Server (API)** | Node.js + Fastify + Playwright + OpenAI API | Render (단일 서버) |
| **ICS Generator** | Node.js | 내부 패키지로 통합 |

### 서버 구조 개요

Sked는 단일 Fastify 기반 서버 내에 다음과 같은 **복수의 REST API 엔드포인트**를 구성하여 기능별로 역할을 분리합니다:

| 엔드포인트 | 역할 |
| --- | --- |
| `GET /api/scrape` | 웹페이지에서 텍스트 추출 (스크래핑) |
| `GET /api/parse` | 텍스트에서 일정 정보 추출 (LLM 기반 의미 분석) |
| `GET /api/download` | 일정 정보를 기반으로 ICS 파일 생성 및 응답 |

모든 로직은 단일 서버 내에서 처리되며, 역할별 기능은 내부 모듈로 분리되어 있습니다.

---

## 모노레포 구조

```bash
sked/
├── apps/
│   ├── web/             # Vercel 배포용 UI
│   ├── extension/       # Chrome, Safari 확장 플러그인
│   └── server/          # Render 배포용 Fastify API 서버 (복수 엔드포인트 통합)
├── packages/
│   ├── scrape-core/    # firecrawl, playwright 텍스트 스크래핑 모듈
│   ├── parse-core/     # LLM 텍스트 → 일정 데이터 추출 모듈
│   └── ics-generator/   # .ics 파일 생성기
```

### 모노레포 구현 전략

**TurboRepo** 기반의 모노레포 구조를 채택하여, 프론트엔드와 서버, 핵심 기능 모듈들을 **하나의 레포에서 통합 관리**합니다.

### 주요 특징

- `apps/` 디렉토리에는 배포 가능한 애플리케이션(Web UI, API 서버 등)이 위치합니다.
- `packages/` 디렉토리에는 재사용 가능한 핵심 로직이 모듈로 분리되어 있습니다.
- 모든 프로젝트는 `pnpm workspaces`와 `turbo.json`을 통해 의존성과 빌드 순서를 관리합니다.

### 장점

- 코드 공유 효율성 극대화 (`import { fn } from '@sked/scrape-core'` 식 활용)
- 개발/배포/빌드 자동화 용이
- 로컬 테스트 및 CI 설정 간소화 (단일 명령어로 전체 테스트 가능)

---

## 역할 분리 전략

### ✅ Scraper (모듈): 텍스트 추출 전용

- `@sked/scrape-core`
    - 정적 → 동적 fallback 기반 본문 텍스트 추출 (Playwright 활용)
    - Fastify 경로: `GET /api/scrape`
    - 1차 구현에는 Playwright 대신 외부 라이브러리를 사용
        
        ```js
        // Install with npm install @mendable/firecrawl-js
        import FireCrawlApp from '@mendable/firecrawl-js';

        const app = new FireCrawlApp({apiKey: env.FIRECRAWL_API_KEY });

        const scrapeResult = await app.scrapeUrl("https://docs.mendable.ai", {
            formats: [ "markdown" ],
        });
        ```

### ✅ Parser (모듈): 일정 정보 추출 전용

- `@sked/parse-core`
    - OpenAI API 호출을 통한 텍스트 의미 분석
    - Fastify 경로: `POST /api/parse`
    - 일정 정보 추출 프롬프트
        
        ```markdown
        당신의 목표는 캘린더에 등록할 일정 정보를 추출하는 것입니다.
        
        텍스트에서 다음 정보를 추출하여 JSON 형식으로 출력해 주세요
        
        - title: 캘린더에 등록될 일정의 제목 10자 내외
        - description: 캘린더에 등록된 일정를 설명하는 설명 50자 내외
        - date: 일정의 날짜, YYYY-MM-DD 형식으로 정규화
        - time: 일정의 시간, 오후 3시 → 15:00 식으로 24시간 HH:MM 형식으로 변환
        - location: 전체 주소 또는 장소명, 가능한 자세히
        
        출력은 아래 JSON 포맷으로 해주세요. 설명이나 문장은 포함하지 마세요.
        
        ```json
        {
          "title": "",
          "description": "",
          "date": "",
          "time": "",
          "location": ""
        }
        ```
        
        다음의 규칙을 따르세요:
        1. 텍스트에 포함된 링크는 건너뜁니다.
        2. 텍스트에서 일정의 정보만을 추출합니다.
        
        아래는 일정을 포함한 웹 페이지를 크롤링한 마크다운 텍스트입니다. 
        
        ---
        ```
        

### ✅ ICS Generator (모듈): 캘린더 일정 파일 생성

- `@sked/ics-generator`
    - 일정 데이터를 기반으로 `.ics` 형식 생성
    - Fastify 경로: `GET /api/download`

---

## 프론트엔드 흐름 요약

1. 사용자가 URL 입력
2. `/api/scrape` 호출 → 원문 텍스트 추출
3. `/api/parse` 호출 → 일정 정보 추출
4. UI에서 미리보기 + 편집 가능
5. `/api/download` 호출 → ICS 파일 생성 및 다운로드

---

## 인증/보안 전략

- 모든 API 요청은 `Bearer` 토큰 방식 인증 적용
- `.env`에 정의된 `SKED_API_SECRET` 기반 Fastify Hook으로 인증 검증
- 향후 abuse 방지를 위한:
    - Rate limiting (IP 단위)
    - Referrer 검증
    - 토큰 유효기간/리프레시 구조 도입 고려
