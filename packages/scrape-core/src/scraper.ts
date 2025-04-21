const FIRECRAWL_API_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape';

/**
 * [SOLID: Single Responsibility]
 * 웹 페이지 스크래핑 책임을 담당하는 클래스.
 * Firecrawl API를 직접 호출하여 URL에서 마크다운 형식의 본문을 추출합니다.
 */
export class Scraper {
  private apiKey: string | undefined;

  /**
   * Scraper 인스턴스를 생성합니다.
   * API 키는 환경 변수에서 우선적으로 읽어옵니다.
   * @param apiKey - Firecrawl API 키 (선택 사항, 제공되지 않으면 환경 변수 사용)
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey;

    if (!this.apiKey) {
      console.warn('⚠️ Firecrawl API key is not provided. Scraping will likely fail.');
    }
  }

  /**
   * 주어진 URL에서 마크다운 형식의 본문 텍스트를 스크래핑합니다.
   * @param url - 스크래핑할 웹 페이지 URL
   * @returns 스크래핑된 마크다운 텍스트
   * @throws API 키가 없거나 스크래핑 중 오류 발생 시 에러
   */
  async scrapeUrl(url: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is missing, cannot scrape.');
    }

    console.log(`[Scraper] Calling Firecrawl API for URL: ${url}`);

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown"], // 마크다운 형식 요청
        // onlyMainContent: true, // 기본값이 true 이므로 필요시 명시
        // blockAds: true, // 기본값이 true 이므로 필요시 명시
      }),
    };

    try {
      const response = await fetch(FIRECRAWL_API_ENDPOINT, options);

      if (!response.ok) {
        // API 자체 오류 처리 (예: 402, 429, 500 등)
        const errorBody = await response.text();
        console.error(`[Scraper] Firecrawl API Error (${response.status}):`, errorBody);
        throw new Error(`Firecrawl API request failed with status ${response.status}: ${errorBody}`);
      }

      const result = await response.json();

      if (!result.success || !result.data || typeof result.data.markdown !== 'string') {
        console.warn('[Scraper] Firecrawl API did not return successful markdown content:', result);
        throw new Error('스크래핑 결과에서 유효한 마크다운 내용을 찾을 수 없습니다. API 응답 확인 필요.');
      }

      console.log(`[Scraper] Scraping successful via API for: ${url}`);
      return result.data.markdown; // API 응답 구조에 따라 data.markdown 반환

    } catch (error) {
      console.error(`[Scraper] Error during fetch or processing for ${url}:`, error);
      if (error instanceof Error) {
        // 네트워크 오류 또는 위에서 던진 오류 처리
        throw new Error(`스크래핑 중 오류 발생 (${url}): ${error.message}`);
      }
      throw new Error(`알 수 없는 스크래핑 오류 발생 (${url})`);
    }
  }
} 