import { NextResponse, NextRequest } from 'next/server';
import { fetchSkedApi } from '@/lib/api'; // 서버 측 API 호출 유틸리티
import { EventData } from '@/components/sked/PreviewCard'; // EventData 타입 임포트

export async function POST(request: NextRequest) {
  try {
    // 1. 클라이언트로부터 수정된 일정 데이터 받기
    const { eventData, url }: { eventData: EventData, url: string } = await request.json();

    // 2. 데이터 유효성 검사 (간단하게 필수 필드만 확인)
    if (!eventData || !eventData.title || !eventData.date || !eventData.time) {
      return NextResponse.json(
        { error: '필수 일정 정보(제목, 날짜, 시간)가 누락되었습니다.' }, 
        { status: 400 }
      );
    }

    console.log(`[Proxy API /api/download] Received event data:`, eventData);

    // 3. 백엔드 /api/download API 호출 (POST 방식 사용)
    // lib/api.ts의 fetchSkedApi는 서버 환경에서 실행되므로 API 키 포함됨
    const backendResponse = await fetchSkedApi('/api/download', {
      method: 'POST',
      body: JSON.stringify({ eventData, url }),
      // headers는 fetchSkedApi 내부에서 자동으로 설정됨 (Content-Type: application/json 등)
    });

    // 4. 백엔드 응답 처리
    if (!backendResponse.ok) {
      // 백엔드 API 오류 시 오류 내용 전달
      const errorBody = await backendResponse.text();
      console.error(`[Proxy API /api/download] Backend API error (${backendResponse.status}):`, errorBody);
      return NextResponse.json(
        { error: 'ICS 파일 생성 중 오류 발생', details: errorBody }, 
        { status: backendResponse.status || 500 }
      );
    }

    console.log(`[Proxy API /api/download] Received successful response from backend.`);

    // 5. 백엔드 응답 헤더 및 본문(ICS 내용)을 클라이언트에 그대로 전달
    const icsContent = await backendResponse.blob(); // 응답 본문을 Blob으로 받음
    const contentType = backendResponse.headers.get('content-type') || 'text/calendar';
    const contentDisposition = backendResponse.headers.get('content-disposition') || `attachment; filename="${eventData.title || 'event'}.ics"`;

    // 새로운 Response 객체를 생성하여 클라이언트에 반환
    const response = new NextResponse(icsContent, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition,
        },
    });

    return response;

  } catch (error) {
    console.error('[Proxy API Error - /api/download]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'ICS 다운로드 처리 중 서버 오류 발생', details: errorMessage }, 
      { status: 500 }
    );
  }
} 