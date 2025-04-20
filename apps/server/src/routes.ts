import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { EventParser } from '@sked/parse-core';
import { ICSGenerator } from '@sked/ics-generator';
import { Scraper } from '@sked/scrape-core';
import { DownloadRequestBody, ParseRequestBody, ScrapeQueryString } from './types';

/**
 * API 라우트 등록
 * [SOLID: Single Responsibility]
 * 라우트 정의와 핸들러 연결 책임
 */
export function registerRoutes(
  server: FastifyInstance, 
  parser: EventParser,
  icsGenerator: ICSGenerator,
  scraper: Scraper
): void {
  // 건강 체크 라우트
  server.get('/health', async (_, reply) => {
    reply.send({ status: 'ok' });
  });

  // 웹 페이지 스크래핑 API (GET 요청)
  server.get('/api/scrape', async (request: FastifyRequest<{ Querystring: ScrapeQueryString }>, reply: FastifyReply) => {
    try {
      const { url } = request.query;
      
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
  server.post('/api/download', async (request: FastifyRequest<{ Body: DownloadRequestBody }>, reply: FastifyReply) => {
    try {
      const eventData = request.body;
      
      const icsContent = await icsGenerator.generateICS(eventData);
      
      // 파일명에 특수문자나 공백이 있을 경우를 대비해 안전한 파일명 생성
      const safeFilename = encodeURIComponent(eventData.title).replace(/[%]/g, '_') + '.ics';
      
      reply.header('Content-Type', 'text/calendar');
      reply.header('Content-Disposition', `attachment; filename=${safeFilename}`);
      return reply.send(icsContent);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(500).send({ error: error.message });
      }
      return reply.code(500).send({ error: '알 수 없는 오류가 발생했습니다.' });
    }
  });
  
  // 일정 정보를 ICS 파일로 변환하여 다운로드 API (GET 메서드)
  server.get('/api/download', async (request: FastifyRequest<{ Querystring: DownloadRequestBody }>, reply: FastifyReply) => {
    try {
      const eventData = request.query;
      
      // 필수 필드 확인
      if (!eventData.title || !eventData.date || !eventData.time) {
        return reply.code(400).send({ error: '필수 정보(제목, 날짜, 시간)가 누락되었습니다.' });
      }
      
      const icsContent = await icsGenerator.generateICS(eventData);
      
      // 파일명에 특수문자나 공백이 있을 경우를 대비해 안전한 파일명 생성
      const safeFilename = encodeURIComponent(eventData.title).replace(/[%]/g, '_') + '.ics';
      
      reply.header('Content-Type', 'text/calendar');
      reply.header('Content-Disposition', `attachment; filename=${safeFilename}`);
      return reply.send(icsContent);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(500).send({ error: error.message });
      }
      return reply.code(500).send({ error: '알 수 없는 오류가 발생했습니다.' });
    }
  });
} 