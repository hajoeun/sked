/**
 * 환경 변수 타입 정의
 * [SOLID: Single Responsibility]
 * 환경 변수 구조 정의 책임
 */
export interface EnvConfig {
  PORT: number;
  HOST: string;
  OPENAI_API_KEY: string;
  CORS_ORIGIN: string;
}

/**
 * 일정 파싱 요청 타입
 */
export interface ParseRequestBody {
  text: string;
}

/**
 * /api/scrape 요청 본문 타입
 */
export interface ScrapeRequestBody {
  url: string;
}

/**
 * /api/metadata 요청 본문 타입
 */
export interface MetadataRequestBody {
  url: string;
} 