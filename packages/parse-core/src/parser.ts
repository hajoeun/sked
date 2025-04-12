import { OpenAI } from 'openai';
import { EventData, EventSchema, ParserOptions } from './types';

/**
 * 텍스트에서 일정 정보를 추출하는 클래스
 * [SOLID: Single Responsibility]
 * 텍스트 분석과 일정 정보 추출을 담당
 */
export class EventParser {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  /**
   * 생성자
   * @param options 파서 설정
   */
  constructor(options: ParserOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey
    });
    this.model = options.model || 'gpt-3.5-turbo';
    this.maxTokens = options.maxTokens || 500;
  }

  /**
   * 텍스트에서 일정 정보를 추출
   * @param text 분석할 텍스트
   * @returns 추출된 일정 정보
   */
  async parseEvent(text: string): Promise<EventData> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const resultContent = completion.choices[0]?.message?.content;
      
      if (!resultContent) {
        throw new Error('응답에서 일정 정보를 찾을 수 없습니다.');
      }

      const parsedData = JSON.parse(resultContent);
      return this.validateEventData(parsedData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`일정 정보 추출 실패: ${error.message}`);
      }
      throw new Error('알 수 없는 오류가 발생했습니다.');
    }
  }

  /**
   * 시스템 프롬프트 생성
   * [Pattern: Template Method]
   * 프롬프트 생성 로직을 위한 템플릿 메서드
   */
  private getSystemPrompt(): string {
    return `당신의 목표는 캘린더에 등록할 일정 정보를 추출하는 것입니다.
        
텍스트에서 다음 정보를 추출하여 JSON 형식으로 출력해 주세요

- title: 캘린더에 등록될 일정의 제목 10자 내외
- description: 캘린더에 등록된 일정를 설명하는 설명 50자 내외
- date: 일정의 날짜, YYYY-MM-DD 형식으로 정규화
- time: 일정의 시간, 오후 3시 → 15:00 식으로 24시간 HH:MM 형식으로 변환
- location: 전체 주소 또는 장소명, 가능한 자세히

출력은 아래 JSON 포맷으로 해주세요. 설명이나 문장은 포함하지 마세요.

\`\`\`json
{
  "title": "",
  "description": "",
  "date": "",
  "time": "",
  "location": ""
}
\`\`\`

다음의 규칙을 따르세요:
1. 텍스트에 포함된 링크는 건너뜁니다.
2. 텍스트에서 일정의 정보만을 추출합니다.`;
  }

  /**
   * 이벤트 데이터 유효성 검증
   * [SOLID: Single Responsibility]
   * 데이터 유효성 검증을 담당
   */
  private validateEventData(data: any): EventData {
    try {
      return EventSchema.parse(data);
    } catch (error) {
      throw new Error('유효하지 않은 일정 데이터 형식입니다.');
    }
  }
} 