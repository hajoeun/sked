import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { EnvConfig } from '../config'; // 수정된 config 파일에서 EnvConfig 타입 import

export function createAuthHook(config: EnvConfig) {
  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) => {
    // '/health' 경로는 인증 예외
    if (request.url === '/health' || request.url === '/api/health') {
      return done();
    }

    const apiKey = config.SKED_API_KEY;
    // SKED_API_KEY가 설정되지 않은 경우, 개발 환경 등에서 인증을 건너뛰도록 할 수 있습니다.
    // 여기서는 엄격하게 키가 없으면 서버 오류로 처리합니다.
    if (!apiKey) {
      console.error('SKED_API_KEY is not configured on the server.');
      reply.code(500).send({ error: 'Internal Server Error: API Key not configured.' });
      return; // done() 호출 안 함
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`Unauthorized access attempt: Missing or invalid Authorization header. IP: ${request.ip}, URL: ${request.url}`);
      reply.code(401).send({ error: 'Unauthorized: Missing or invalid Authorization header.' });
      return; // done() 호출 안 함
    }

    const submittedKey = authHeader.substring(7); // 'Bearer ' 다음 문자열 추출

    if (submittedKey !== apiKey) {
       console.warn(`Unauthorized access attempt: Invalid API Key submitted. IP: ${request.ip}, URL: ${request.url}`);
      reply.code(401).send({ error: 'Unauthorized: Invalid API Key.' });
      return; // done() 호출 안 함
    }

    // 인증 성공
    done();
  };
} 