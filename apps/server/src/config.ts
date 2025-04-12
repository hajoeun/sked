import { EnvConfig } from './types';

/**
 * 환경 변수 설정
 * [SOLID: Single Responsibility]
 * 환경 설정 관리 책임
 */
export function loadConfig(): EnvConfig {
  return {
    PORT: parseInt(process.env.PORT || '3000', 10),
    HOST: process.env.HOST || '0.0.0.0',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
  };
}

/**
 * 환경 변수 유효성 검사
 */
export function validateConfig(config: EnvConfig): void {
  if (!config.OPENAI_API_KEY) {
    // 개발 환경에서는 경고만 표시하고 진행
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ 경고: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다. 일부 기능이 동작하지 않을 수 있습니다.');
    } else {
      // 프로덕션 환경에서는 예외 발생
      throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
    }
  }
} 