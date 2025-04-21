/**
 * Sked API 서버에 요청을 보내는 fetch 래퍼 함수
 * @param endpoint API 엔드포인트 경로 (예: '/api/scrape')
 * @param options fetch 요청 옵션 (method, body 등)
 * @returns Promise<Response>
 */
export async function fetchSkedApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const apiKey = process.env.SKED_API_KEY; // 서버 환경 변수

  if (!baseUrl) {
    throw new Error("API base URL is not configured. Check NEXT_PUBLIC_API_BASE_URL in .env.local");
  }

  // API 키는 서버 측에서만 사용 가능
  // 클라이언트에서 사용해야 한다면 NEXT_PUBLIC_SKED_API_KEY 사용 고려 (보안 주의)

  const url = `${baseUrl}${endpoint}`;

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    // API 키가 존재하는 경우에만 Authorization 헤더 추가 (주로 서버 간 통신용)
    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
  };

  console.log(`Requesting API: ${options.method || 'GET'} ${url}`); // 디버깅용 로그

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // API 오류 응답 처리
      let errorBody = 'Unknown error';
      try {
          errorBody = await response.text();
      } catch (e) {
          console.error("Could not parse error response body", e);
      }
      console.error(`API Error (${response.status}): ${errorBody}`);
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    return response;
  } catch (error) {
    console.error(`Failed to fetch API: ${error}`);
    if (error instanceof Error) {
      throw new Error(`Network or fetch error: ${error.message}`);
    }
    throw new Error('An unknown error occurred during the API request.');
  }
} 