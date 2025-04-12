import { z } from 'zod';

/**
 * 일정 데이터 스키마
 * [SOLID: Single Responsibility]
 * 일정 데이터의 유효성 검증을 위한 스키마 정의
 */
export const EventSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD 형식
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM 형식
  location: z.string().max(500)
});

export type EventData = z.infer<typeof EventSchema>;

/**
 * 파서 설정 타입
 */
export interface ParserOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
} 