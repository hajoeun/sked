import { NextResponse } from 'next/server';
import { EventParser } from '@sked/parse-core';

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  const parser = new EventParser({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: '텍스트 내용이 없습니다.' }, { status: 400 });
    }

    // API 키가 없는 경우 목 데이터 반환
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-actual-openai-api-key-here') {
      console.log('⚠️ API 키가 없어 목 데이터를 반환합니다.');
      return NextResponse.json({
        title: "회식",
        description: "팀 월간 정기 회식",
        date: "2024-04-30",
        time: "19:00",
        location: "서울시 강남구 역삼동 123번지 맛있는 식당"
      });
    }

    const eventData = await parser.parseEvent(text);
    return NextResponse.json(eventData, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
} 