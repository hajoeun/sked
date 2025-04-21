import { NextResponse } from 'next/server';
import { fetchSkedApi } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log(`[Proxy API] Calling backend /api/parse`);

    // 실제 백엔드 /api/parse 호출
    const backendResponse = await fetchSkedApi('/api/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    // 백엔드 응답을 그대로 클라이언트에 전달
    const data = await backendResponse.json();

    console.log(`[Proxy API] Received response from backend /api/parse`);

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Proxy API Error - /api/parse]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to parse text', details: errorMessage }, { status: 500 });
  }
} 