import { createEvent, DateArray } from 'ics';
import { v4 as uuidv4 } from 'uuid';
import { CalendarEvent, ICSGeneratorOptions } from './types';

/**
 * ICS 파일 생성기 클래스
 * [SOLID: Single Responsibility]
 * 일정 데이터를 ICS 형식으로 변환하는 책임만 가짐
 */
export class ICSGenerator {
  private productId: string;
  private alarmMinutesBefore: number;
  private eventDurationHours: number;

  /**
   * 생성자
   * @param options ICS 생성기 설정 옵션
   */
  constructor(options: ICSGeneratorOptions = {}) {
    this.productId = options.productId || '-//SKED//Calendar//KO';
    this.alarmMinutesBefore = options.alarmMinutesBefore || 30;
    this.eventDurationHours = options.eventDurationHours || 2;
  }

  /**
   * 일정 데이터를 ICS 형식으로 변환
   * @param event 일정 데이터
   * @returns ICS 형식 문자열
   */
  async generateICS(event: CalendarEvent): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const { startDateArray, endDateArray } = this.convertToDateArrays(event);

        createEvent({
          uid: uuidv4(),
          title: event.title,
          description: event.description,
          start: startDateArray,
          end: endDateArray,
          location: event.location,
          productId: this.productId,
          calName: '일정',
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          alarms: [{
            action: 'display',
            description: '알림',
            trigger: { minutes: this.alarmMinutesBefore, before: true }
          }]
        }, (error, value) => {
          if (error) {
            reject(new Error(`ICS 생성 실패: ${error.message}`));
            return;
          }
          
          if (!value) {
            reject(new Error('ICS 생성 실패: 결과가 없습니다.'));
            return;
          }

          resolve(value);
        });
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`ICS 생성 실패: ${error.message}`));
        } else {
          reject(new Error('알 수 없는 오류가 발생했습니다.'));
        }
      }
    });
  }

  /**
   * 문자열 날짜/시간을 DateArray로 변환
   * [SOLID: Single Responsibility]
   * 날짜 변환 책임만 가짐
   */
  private convertToDateArrays(event: CalendarEvent): { 
    startDateArray: DateArray, 
    endDateArray: DateArray 
  } {
    // date: YYYY-MM-DD 형식, time: HH:MM 형식 예상
    const [year, month, day] = event.date.split('-').map(Number);
    const [hour, minute] = event.time.split(':').map(Number);

    // ics 라이브러리용 DateArray 형식 [년, 월, 일, 시, 분]
    // 주의: ics 라이브러리는 월을 1-12로 사용합니다
    const startDateArray: DateArray = [year, month, day, hour, minute];
    
    // 종료 시간은 시작시간 + 설정된 이벤트 지속 시간
    const endDateTime = new Date(year, month - 1, day, hour, minute);
    endDateTime.setHours(endDateTime.getHours() + this.eventDurationHours);
    
    const endDateArray: DateArray = [
      endDateTime.getFullYear(),
      endDateTime.getMonth() + 1, // 자바스크립트는 0-11, ics는 1-12
      endDateTime.getDate(),
      endDateTime.getHours(),
      endDateTime.getMinutes()
    ];

    return { startDateArray, endDateArray };
  }
} 