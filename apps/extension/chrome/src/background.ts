import { API_ENDPOINTS, EventData, Message } from './types';

/**
 * 백그라운드 서비스 클래스
 * [SOLID: Single Responsibility]
 * 백그라운드 API 통신 및 다운로드 처리 책임
 */
class BackgroundService {
  /**
   * 메시지 리스너 초기화
   */
  setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      // popup.ts로부터 텍스트 파싱 요청 처리
      if (message.type === 'PARSE_TEXT') {
        this.parseTextFromApi(message.payload)
          .then(response => sendResponse(response)) // { data: EventData } 또는 { error: string }
          .catch(error => {
            console.error('Error parsing text from API:', error);
            sendResponse({ error: error.message });
          });
        return true; // 비동기 응답
      }

      // popup.ts로부터 ICS 다운로드 요청 처리
      if (message.type === 'DOWNLOAD_ICS') {
        this.downloadICSFile(message.payload)
          .then(response => sendResponse(response)) // { success: boolean, error?: string }
          .catch(error => {
            console.error('Error downloading ICS file:', error);
            sendResponse({ error: error.message });
          });
        return true; // 비동기 응답
      }

      // 다른 메시지 타입은 무시하거나 필요한 경우 처리 추가
    });
  }

  /**
   * API를 통해 텍스트 파싱
   */
  async parseTextFromApi(text: string): Promise<{ data?: EventData, error?: string }> {
    try {
      if (!text) {
        throw new Error('파싱할 텍스트가 없습니다.');
      }

      console.log('Sending text to parse API:', text.substring(0, 100) + '...'); // 로그 추가

      const response = await fetch(API_ENDPOINTS.PARSE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      console.log('Parse API response status:', response.status); // 로그 추가

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // JSON 파싱 실패 시 텍스트로 에러 처리
          const errorText = await response.text();
          throw new Error(`API 오류 (${response.status}): ${errorText || '알 수 없는 오류'}`);
        }
        throw new Error(errorData.error || `API 요청 실패 (${response.status})`);
      }

      const eventData = await response.json() as EventData;
      console.log('Parsed event data:', eventData); // 로그 추가
      return { data: eventData };

    } catch (error) {
      console.error('Error in parseTextFromApi:', error); // 에러 로그 강화
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: '텍스트 파싱 중 알 수 없는 오류가 발생했습니다.' };
    }
  }

  /**
   * ICS 파일 다운로드
   */
  async downloadICSFile(eventData: EventData): Promise<{ success: boolean, error?: string }> {
    try {
      if (!eventData || !eventData.title) {
          throw new Error('ICS 파일을 생성하기 위한 이벤트 데이터가 유효하지 않습니다.');
      }
      console.log('Requesting ICS download for:', eventData); // 로그 추가
      
      // 서버의 /api/download 엔드포인트 사용
      const downloadUrl = `${API_ENDPOINTS.DOWNLOAD}?title=${encodeURIComponent(eventData.title)}&description=${encodeURIComponent(eventData.description || '')}&date=${encodeURIComponent(eventData.date || '')}&time=${encodeURIComponent(eventData.time || '')}&location=${encodeURIComponent(eventData.location || '')}`;

      // chrome.downloads API를 사용하여 파일 다운로드
      chrome.downloads.download({
        url: downloadUrl,
        filename: `${eventData.title.replace(/[^a-z0-9가-힣\s]/gi, '').substring(0, 50) || 'schedule'}.ics`, // 안전한 파일명 생성
        saveAs: true // 사용자에게 저장 위치 묻기
      }, (downloadId) => {
          if (chrome.runtime.lastError) {
              console.error('Download failed:', chrome.runtime.lastError.message);
              // 다운로드 실패 시 에러 처리는 여기서는 sendResponse를 직접 호출하기 어려움
              // 필요하다면 popup.ts에 상태 업데이트를 위한 별도 메시지 전송 로직 추가 가능
          } else {
              console.log('Download started with ID:', downloadId);
          }
      });

      // download 시작 요청 후 즉시 성공 반환 (실제 다운로드 완료 여부는 별개)
      return { success: true }; 

    } catch (error) {
      console.error('Error in downloadICSFile:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'ICS 파일 다운로드 중 알 수 없는 오류가 발생했습니다.' };
    }
  }
}

// 백그라운드 서비스 초기화
function initBackgroundService() {
  console.log('Initializing background service...'); // 초기화 로그
  const service = new BackgroundService();
  service.setupMessageListeners();
  console.log('Background service initialized and listeners set up.');
}

// 스크립트 실행
initBackgroundService(); 