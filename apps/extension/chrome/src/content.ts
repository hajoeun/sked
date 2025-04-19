import { Message } from './types';

/**
 * [SOLID: Single Responsibility]
 * 웹 페이지의 텍스트 추출 책임
 */
class ContentExtractor {
  /**
   * 페이지 텍스트 추출
   */
  extractPageText(): string {
    return document.body.innerText;
  }

  /**
   * 메시지 리스너 설정
   */
  setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
      // 팝업으로부터 텍스트 추출 요청을 받으면 처리
      if (message.type === 'GET_PAGE_TEXT') {
        const text = this.extractPageText();
        // 추출된 텍스트를 팝업으로 응답
        sendResponse({ text }); 
        // 비동기 응답을 위해 true 반환
        return true; 
      }
      // 다른 메시지 유형은 여기서 처리하거나 무시
    });
  }
}

// 콘텐츠 스크립트 초기화
function initContentScript() {
  const extractor = new ContentExtractor();
  // 메시지 리스너만 설정
  extractor.setupMessageListener();
}

// 스크립트 실행
initContentScript(); 