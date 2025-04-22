import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { EventParser } from '@sked/parse-core';
import { ICSGenerator, CalendarEvent } from '@sked/ics-generator';
import { Scraper } from '@sked/scrape-core';
import { PreviewService } from '@sked/preview-core';
import { ParseRequestBody, ScrapeRequestBody, MetadataRequestBody } from './types';

/**
 * API 라우트 등록
 * [SOLID: Single Responsibility]
 * 라우트 정의와 핸들러 연결 책임
 */
export function registerRoutes(
  server: FastifyInstance, 
  parser: EventParser,
  icsGenerator: ICSGenerator,
  scraper: Scraper,
  previewService: PreviewService
): void {
  // 건강 체크 라우트
  server.get('/health', async (_, reply) => {
    reply.send({ status: 'ok' });
  });

  // 웹 페이지 스크래핑 API (GET 요청)
  server.post('/api/scrape', async (request: FastifyRequest<{ Body: ScrapeRequestBody }>, reply: FastifyReply) => {
    try {
      const { url } = request.body;
      
      if (!url) {
        return reply.code(400).send({ error: 'URL 쿼리 파라미터가 필요합니다.' });
      }

      // URL 유효성 검사 (간단하게)
      try {
        new URL(url);
      } catch (e) {
        return reply.code(400).send({ error: '유효하지 않은 URL 형식입니다.' });
      }

      // [Dependency Inversion] Scraper 인스턴스를 주입받아 사용
      const markdownContent = await scraper.scrapeUrl(url);
      
      // 성공 시 마크다운 텍스트 반환 (JSON 객체로 감싸서)
      return reply.send({ markdown: markdownContent });

    } catch (error) {
      server.log.error('Error in /api/scrape:', error); // 에러 로깅 추가
      if (error instanceof Error) {
        // 스크래핑 자체 오류 메시지 포함
        return reply.code(500).send({ error: '스크래핑 처리 중 오류가 발생했습니다.', details: error.message });
      }
      return reply.code(500).send({ error: '알 수 없는 스크래핑 오류가 발생했습니다.' });
    }
  });

  // 텍스트에서 일정 정보 추출 API
  server.post('/api/parse', async (request: FastifyRequest<{ Body: ParseRequestBody }>, reply: FastifyReply) => {
    try {
      const { text } = request.body;
      
      if (!text) {
        return reply.code(400).send({ error: '텍스트 내용이 없습니다.' });
      }

      // API 키가 없는 경우 목 데이터 반환
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-actual-openai-api-key-here') {
        console.log('⚠️ API 키가 없어 목 데이터를 반환합니다.');
        return reply.send({
          title: "회식",
          description: "팀 월간 정기 회식",
          date: "2024-04-30",
          time: "19:00",
          location: "서울시 강남구 역삼동 123번지 맛있는 식당"
        });
      }

      const eventData = await parser.parseEvent(text);
      return reply.send(eventData);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(500).send({ error: error.message });
      }
      return reply.code(500).send({ error: '알 수 없는 오류가 발생했습니다.' });
    }
  });

  // 일정 정보를 ICS 파일로 변환하여 다운로드 API (POST 메서드)
  server.post('/api/download', async (
    request: FastifyRequest<{ Body: { eventData: Omit<CalendarEvent, 'url'>, url: string } }>, 
    reply: FastifyReply
  ) => {
    try {
      // 요청 본문에서 eventData와 url 분리
      const { eventData, url } = request.body; 

      // url 값 존재 여부 확인 (필수값)
      if (!url) {
        return reply.code(400).send({ error: 'URL is required in the request body.' });
      }
      
      // description 및 location이 undefined일 경우 빈 문자열로 기본값 설정
      // CalendarEvent 타입에 맞게 url 속성 추가
      const eventDataForICS: CalendarEvent = {
          ...eventData,
          description: eventData.description ?? '', 
          location: eventData.location ?? '', 
          url: url // url 추가
      };

      // icsGenerator.generateICS 호출 시 CalendarEvent 타입 객체 전달
      const icsContent = await icsGenerator.generateICS(eventDataForICS);
      
      // 파일명에 특수문자나 공백이 있을 경우를 대비해 안전한 파일명 생성
      const title = eventData.title || 'event';
      // filename* 값에는 퍼센트 인코딩된 UTF-8 문자열 사용
      const encodedTitleForHeader = encodeURIComponent(title); 
      // filename 값에는 간단한 ASCII 대체 문자열 사용 (Fallback용)
      const asciiSafeTitle = title.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50); // 예시: ASCII 문자와 일부 특수문자만 남김
      
      reply.header('Content-Type', 'text/calendar');
      // filename*을 사용하여 UTF-8 파일명 명시, filename은 호환성 위해 유지
      reply.header('Content-Disposition', `attachment; filename="${asciiSafeTitle}.ics"; filename*=UTF-8''${encodedTitleForHeader}.ics`);
      return reply.send(icsContent);
    } catch (error) {
      server.log.error('Error in /api/download:', error); // 에러 로깅 추가
      if (error instanceof Error) {
        // ICS 생성 실패 또는 기타 오류 메시지 포함
        return reply.code(500).send({ error: 'ICS 파일 생성 중 오류가 발생했습니다.', details: error.message });
      }
      return reply.code(500).send({ error: '알 수 없는 오류가 발생했습니다.' });
    }
  });

  // 웹 페이지 메타데이터 조회 API
  server.post('/api/metadata', async (request: FastifyRequest<{ Body: MetadataRequestBody }>, reply: FastifyReply) => {
    try {
      const { url } = request.body;

      if (!url || typeof url !== 'string') {
        return reply.code(400).send({ error: '요청 본문에 유효한 URL이 필요합니다.' });
      }

      try {
        new URL(url);
      } catch (e) {
        return reply.code(400).send({ error: '유효하지 않은 URL 형식입니다.' });
      }

      // 주입된 previewService 사용
      const metadata = await previewService.fetchMetadata(url);

      return reply.send(metadata);

    } catch (error) {
      server.log.error('Error in /api/metadata:', error);
      if (error instanceof Error) {
        return reply.code(500).send({ error: '메타데이터 처리 중 오류가 발생했습니다.', details: error.message });
      }
      return reply.code(500).send({ error: '알 수 없는 메타데이터 오류가 발생했습니다.' });
    }
  });
} 