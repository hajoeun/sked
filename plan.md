## 구현 계획

### Phase 1
1. `packages/parse-core`를 먼저 구현
- openai를 사용한다
2. `packages/ics-generator`를 구현
3. server를 구현
- `/api/parse`, `/api/download` 를 구현
4. `apps/extension/chrome`을 구현
- '일정 만들기' 버튼 클릭하면 아래의 코드와 같은 방식으로 html 텍스트 읽음
- const mainText = document.body.innerText;
  chrome.runtime.sendMessage({ type: 'TEXT_EXTRACTED', payload: mainText });
- 스크래핑한 텍스트를 `/api/parse`를 활용해서 일정 데이터 파싱
- `/api/download`를 호출해 .ics로 다운로드

### Phase 2
1. server를 구현
- `/api/scrape` 를 구현
2. web을 구현
- 사용자가 URL 입력하는 폼을 구현
- 입력 완료 플로우 구현 `/api/scrape`, `/api/parse`를 순서대로 호출하는 기능 구현
- 호출 단계마다 진행 상태를 표현
- API 응답 결과를 UI에서 미리보기

### Phase 3
1. web 고도화
- 미리보기를 편집할 수 있도록 개선
- `/api/download`를 호출해 미리보기를 다운로드할 수 있는 기능 구현

### Phase 4
1. scraper-core에서 firecrawl의 리밋이 초과된 상황에 Playwright를 호출하는 로직 구현
2. Playwright 공식 이미지를 사용해서 dockerfile 생성
    - 예시
        ```dockerfile
        FROM mcr.microsoft.com/playwright:v1.41.1-jammy
        WORKDIR /app
        COPY . .
        RUN npm install
        RUN npx playwright install --with-deps
        CMD ["node", "apps/server/index.js"]
        ```

### Phase 5
- web은 Vercel에 server는 Render에 배포
- 배포 계획 요약
    | 컴포넌트 | 플랫폼 | 설정 |
    | --- | --- | --- |
    | Vercel UI | Vercel | Next.js (App Router) 배포 |
    | Server API | Render | Fastify 기반 단일 서버 (extract/parse/download 포함) |

