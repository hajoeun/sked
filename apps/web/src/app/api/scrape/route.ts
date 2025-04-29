import { NextResponse } from 'next/server';
import { Scraper } from '@sked/scrape-core';

export async function POST(request: Request) {
  const scraper = new Scraper(process.env.FIRECRAWL_API_KEY);

  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL 쿼리 파라미터가 필요합니다.' }, { status: 400 });
    }

    // URL 유효성 검사 (간단하게)
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: '유효하지 않은 URL 형식입니다.' }, { status: 400 });
    }

    // [Dependency Inversion] Scraper 인스턴스를 주입받아 사용
    const markdownContent = await scraper.scrapeUrl(url);
    
    // 성공 시 마크다운 텍스트 반환 (JSON 객체로 감싸서)
    return NextResponse.json({ markdown: markdownContent }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/scrape:', error); // 에러 로깅 추가
    if (error instanceof Error) {
      // 스크래핑 자체 오류 메시지 포함
      return NextResponse.json({ error: '스크래핑 처리 중 오류가 발생했습니다.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: '알 수 없는 스크래핑 오류가 발생했습니다.' }, { status: 500 });
  }
} 