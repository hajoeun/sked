/**
 * 메시지 타입 정의
 * [SOLID: Single Responsibility]
 * 메시지 타입 구조 정의
 */
export interface Message {
  type: string;
  payload?: any;
}

/**
 * 일정 데이터 타입
 */
export interface EventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
}

/**
 * API 경로 설정
 */
export const API_ENDPOINTS = {
  PARSE: 'http://localhost:3000/api/parse',
  DOWNLOAD: 'http://localhost:3000/api/download'
}; 