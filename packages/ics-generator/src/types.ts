/**
 * ICS 생성기에 필요한 이벤트 데이터 타입
 * [SOLID: Single Responsibility]
 * ICS 생성에 필요한 데이터 구조 정의
 */
export interface CalendarEvent {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD 형식
  time: string; // HH:MM 형식
  location: string;
}

/**
 * ICS 생성기 설정 옵션
 */
export interface ICSGeneratorOptions {
  productId?: string;
  alarmMinutesBefore?: number;
  eventDurationHours?: number;
} 