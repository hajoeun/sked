import { z } from 'zod';

/**
 * [SOLID: Single Responsibility]
 * 환경 변수의 스키마 정의와 파싱을 담당합니다.
 * 필요한 환경 변수가 누락되거나 형식이 잘못된 경우 에러를 발생시켜
 * 애플리케이션 실행 초기에 문제를 인지할 수 있도록 합니다.
 */
const envSchema = z.object({
  // Firecrawl API 키: 필수 문자열
  FIRECRAWL_API_KEY: z.string().min(1, 'Firecrawl API 키가 필요합니다.'),
  // 필요시 다른 환경 변수 추가 (예: NODE_ENV)
  // NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// 환경 변수 파싱 시도
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ 잘못된 환경 변수:',
    parsedEnv.error.flatten().fieldErrors,
  );
  // 중요한 환경 변수 누락 시 애플리케이션 종료 또는 기본값 설정 등의 처리 필요
  // 여기서는 에러를 던져 실행을 중단시킵니다.
  throw new Error('환경 변수 설정이 잘못되었습니다. process.env를 확인하세요.');
}

// 파싱된 환경 변수 내보내기 (타입 추론 포함)
export const env = parsedEnv.data; 