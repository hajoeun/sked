import { NextResponse } from 'next/server';
import { fetchSkedApi } from '@/lib/api'; // 이전에 만든 API 유틸리티

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`[Proxy API] Calling backend /api/scrape for URL: ${url}`);

    // 실제 백엔드 /api/scrape 호출 (lib/api.ts 사용, API 키는 서버 환경에서 자동 포함됨)
    const backendResponse = await fetchSkedApi('/api/scrape', {
        method: 'POST', // 실제 백엔드 API 메소드에 맞춰야 함 (spec.md 에는 GET으로 되어있으나, URL을 body로 받는다면 POST가 적합)
        body: JSON.stringify({ url }),
    });

    // 백엔드 응답을 그대로 클라이언트에 전달
    const data = await backendResponse.json(); // 백엔드가 JSON을 반환한다고 가정

    console.log(`[Proxy API] Received response from backend /api/scrape`);

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Proxy API Error - /api/scrape]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to scrape URL', details: errorMessage }, { status: 500 });
  }
} 