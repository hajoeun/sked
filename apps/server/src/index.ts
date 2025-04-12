import Fastify from 'fastify';
import cors from '@fastify/cors';
import { EventParser } from '@sked/parse-core';
import { ICSGenerator } from '@sked/ics-generator';
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
    console.warn('환경 변수 파일을 찾을 수 없습니다. 기본값을 사용합니다.');
    dotenv.config(); // 기본 .env 파일 로드 시도
  }
}

/**
 * 메인 서버 시작 함수
 * [SOLID: Single Responsibility]
 * 서버 설정과 시작 책임
 */
async function startServer() {
  try {
    // 환경 변수 로드
    loadEnv();
    
    // 환경 설정 로드
    const config = loadConfig();
    validateConfig(config);

    // Fastify 서버 인스턴스 생성
    const server = Fastify({
      logger: true
    });

    // CORS 설정
    await server.register(cors, {
      origin: config.CORS_ORIGIN
    });

    // 파서 및 ICS 생성기 인스턴스 생성
    const parser = new EventParser({
      apiKey: config.OPENAI_API_KEY
    });

    const icsGenerator = new ICSGenerator();

    // 라우트 등록
    registerRoutes(server, parser, icsGenerator);

    // 서버 시작
    await server.listen({
      port: config.PORT,
      host: config.HOST
    });

    console.log(`서버가 시작되었습니다. http://${config.HOST === '0.0.0.0' ? 'localhost' : config.HOST}:${config.PORT}`);
  } catch (error) {
    console.error('서버 시작 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer(); 