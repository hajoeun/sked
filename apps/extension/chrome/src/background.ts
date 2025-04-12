import { API_ENDPOINTS, EventData, Message } from './types';

/**
 * 백그라운드 서비스 클래스
 * [SOLID: Single Responsibility]
 * 백그라운드 로직 처리 책임
 */
class BackgroundService {
  /**
   * 메시지 리스너 초기화
   */
  setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      if (message.type === 'TEXT_EXTRACTED') {
        this.processTextExtraction(message.payload, sender.tab?.id)
          .then(response => sendResponse(response))
          .catch(error => {
            console.error('Error processing text extraction:', error);
            sendResponse({ error: error.message });
          });
        return true; // 비동기 응답을 위해 true 반환
      }

      if (message.type === 'DOWNLOAD_ICS') {
        this.downloadICSFile(message.payload)
          .then(response => sendResponse(response))
          .catch(error => {
            console.error('Error downloading ICS file:', error);
            sendResponse({ error: error.message });
          });
        return true;
      }
    });
  }

  /**
   * 텍스트 추출 처리
   */
  async processTextExtraction(text: string, tabId?: number): Promise<{ eventData?: EventData, error?: string }> {
    try {
      if (!text) {
        throw new Error('추출할 텍스트가 없습니다.');
      }

      // API 서버에 텍스트 전송하여 일정 정보 추출
      const response = await fetch(API_ENDPOINTS.PARSE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '일정 정보 추출에 실패했습니다.');
      }

      const eventData = await response.json();

      // 팝업 열기
      if (tabId) {
        chrome.storage.local.set({ currentEventData: eventData });
        chrome.action.setPopup({ tabId, popup: 'popup.html' });
        chrome.action.openPopup();
      }

      return { eventData };
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: '알 수 없는 오류가 발생했습니다.' };
    }
  }

  /**
   * ICS 파일 다운로드
   */
  async downloadICSFile(eventData: EventData): Promise<{ success: boolean, error?: string }> {
    try {
      // URL 쿼리스트링 방식으로 다운로드
      const downloadUrl = `${API_ENDPOINTS.DOWNLOAD}?title=${encodeURIComponent(eventData.title)}&description=${encodeURIComponent(eventData.description)}&date=${encodeURIComponent(eventData.date)}&time=${encodeURIComponent(eventData.time)}&location=${encodeURIComponent(eventData.location)}`;
      
      // 다운로드 링크 사용
      chrome.downloads.download({
        url: downloadUrl,
        filename: `${eventData.title}.ics`,
        saveAs: true
      });

      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
    }
  }
}

// 백그라운드 서비스 초기화
function initBackgroundService() {
  const service = new BackgroundService();
  service.setupMessageListeners();
}

// 스크립트 실행
initBackgroundService(); 