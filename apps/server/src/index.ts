import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { EventParser } from '@sked/parse-core';
import { ICSGenerator } from '@sked/ics-generator';
import { Scraper } from '@sked/scrape-core';
import { loadConfig, validateConfig } from './config';
import { registerRoutes } from './routes';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 환경 변수 로드
function loadEnv() {
  // 환경 변수 파일 경로 (우선순위: 1. app 디렉토리, 2. 루트 디렉토리)
  const dirPath = path.resolve(__dirname, '..');
  const rootPath = path.resolve(dirPath, '../..');
  
  // 1. 먼저 앱 자체 디렉토리에서 .env.local 파일 확인
  const appEnvPath = path.resolve(dirPath, '.env.local');
  const appEnvDevPath = path.resolve(dirPath, '.env.development.local');
  const appEnvPath2 = path.resolve(dirPath, '.env');
  
  // 2. 루트 디렉토리의 .env 파일
  const rootEnvPath = path.resolve(rootPath, '.env.local');
  const rootEnvDevPath = path.resolve(rootPath, '.env.development.local');
  const rootEnvPath2 = path.resolve(rootPath, '.env');
  
  // 존재하는 파일 중 우선순위가 높은 것을 선택
  const envFiles = [
    { path: appEnvPath, exists: fs.existsSync(appEnvPath) },
    { path: appEnvDevPath, exists: fs.existsSync(appEnvDevPath) },
    { path: appEnvPath2, exists: fs.existsSync(appEnvPath2) },
    { path: rootEnvPath, exists: fs.existsSync(rootEnvPath) },
    { path: rootEnvDevPath, exists: fs.existsSync(rootEnvDevPath) },
    { path: rootEnvPath2, exists: fs.existsSync(rootEnvPath2) }
  ];
  
  const envFile = envFiles.find(file => file.exists);
  
  if (envFile) {
    console.log(`환경 변수 파일 로드: ${envFile.path}`);
    dotenv.config({ path: envFile.path });
  } else {
    // Vercel 환경이 아닐 때만 경고 메시지 출력
    if (!process.env.VERCEL) {
      console.warn('환경 변수 파일을 찾을 수 없습니다. process.env 값을 사용합니다.');
    }
  }
}

// 전역 스코프에서 서버 인스턴스와 설정을 준비합니다.
let server: FastifyInstance | null = null;
let config: ReturnType<typeof loadConfig> | null = null;

async function initializeServer(): Promise<FastifyInstance> {
  if (server) {
    return server;
  }

  // 환경 변수 로드 (한 번만)
  loadEnv();

  // 환경 설정 로드
  config = loadConfig();
  validateConfig(config);

  // Fastify 서버 인스턴스 생성
  server = Fastify({
    logger: {
      level: config.LOG_LEVEL || 'info',
      transport: config.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    },
    ajv: {
      customOptions: {
        strict: 'log',
        keywords: ['kind', 'modifier']
      }
    }
  });

  // CORS 설정
  await server.register(cors, {
    origin: config.CORS_ORIGIN || '*'
  });

  // 서비스 인스턴스 생성
  const parser = new EventParser({ apiKey: config.OPENAI_API_KEY });
  const icsGenerator = new ICSGenerator();
  const scraper = new Scraper(config.FIRECRAWL_API_KEY);

  // 라우트 등록
  registerRoutes(server, parser, icsGenerator, scraper);

  await server.ready(); // 서버가 준비될 때까지 기다립니다.
  return server;
}

// 1) Vercel 서버리스 핸들러
export default async function handler(req: any, res: any) {
  try {
    const initializedServer = await initializeServer();
    // 요청을 Fastify 인스턴스에 전달
    initializedServer.server.emit('request', req, res);
  } catch (error) {
     // 초기화 또는 요청 처리 중 오류 발생 시
    console.error('Handler error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal Server Error during handling request.' }));
  }
}


// 2) 로컬 개발 모드에서는 listen 호출 (process.env.VERCEL이 설정되지 않은 경우)
if (!process.env.VERCEL) {
  initializeServer().then(initializedServer => {
    if (!config) {
       console.error('Config not loaded for local startup.');
       process.exit(1);
       return;
    }
    const port = config.PORT;
    const host = config.HOST;

    initializedServer.listen({ port, host })
      .then(() => {
        console.log(`Development server running on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
      })
      .catch((err) => {
        console.error('Failed to start local server:', err);
        process.exit(1);
      });
  }).catch(err => {
     console.error('Failed to initialize server for local startup:', err);
     process.exit(1);
  });
} 