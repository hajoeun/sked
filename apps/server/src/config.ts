import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config(); // .env 파일 로드

/**
 * 환경 변수 스키마 정의 (Zod 사용)
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().optional(), // CORS 출처 (선택 사항)
  SKED_API_SECRET: z.string().optional(), // 웹 클라이언트 인증용 (선택 사항)
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key가 필요합니다.'),
  FIRECRAWL_API_KEY: z.string().min(1, 'Firecrawl API Key가 필요합니다.') // Firecrawl 키 추가
});

// 파싱된 환경 변수 타입 추론
export type EnvConfig = z.infer<typeof envSchema>;

let parsedConfig: EnvConfig;

/**
 * 환경 변수를 파싱하고 유효성을 검사합니다.
 * 한 번만 파싱하고 결과를 캐싱하여 사용합니다.
 */
export function loadConfig(): EnvConfig {
  if (parsedConfig) {
    return parsedConfig;
  }

  const parseResult = envSchema.safeParse(process.env);

  if (!parseResult.success) {
    console.error(
      '❌ 잘못된 서버 환경 변수:',
      parseResult.error.flatten().fieldErrors,
    );
    throw new Error('서버 환경 변수 설정이 잘못되었습니다. .env 파일을 확인하세요.');
  }

  parsedConfig = parseResult.data;
  console.log('✅ Server configuration loaded successfully.');
  // 실제 키 값 로깅은 보안상 주의
  // console.log('Loaded config:', { ...parsedConfig, OPENAI_API_KEY: '***', FIRECRAWL_API_KEY: '***', SKED_API_SECRET: '***' }); 
  return parsedConfig;
}

/**
 * 환경 변수 유효성 검사
 */
export function validateConfig(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.parse(config);
  return result;
} 