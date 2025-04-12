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
      if (message.type === 'EXTRACT_TEXT') {
        const text = this.extractPageText();
        sendResponse({ text });
        return true;
      }
    });
  }
}

// 콘텐츠 스크립트 초기화
function initContentScript() {
  const extractor = new ContentExtractor();
  extractor.setupMessageListener();
  
  // 사용자 인터페이스에 '일정 만들기' 버튼 추가
  const addExtractButton = () => {
    // 기존 버튼이 있으면 제거
    const existingButton = document.getElementById('sked-extract-button');
    if (existingButton) {
      existingButton.remove();
    }

    // 새 버튼 생성
    const button = document.createElement('button');
    button.id = 'sked-extract-button';
    button.textContent = '일정 만들기';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

    // 버튼 클릭 이벤트
    button.addEventListener('click', () => {
      const text = extractor.extractPageText();
      chrome.runtime.sendMessage({ 
        type: 'TEXT_EXTRACTED', 
        payload: text 
      });
    });

    document.body.appendChild(button);
  };

  // 페이지 로드 완료 후 버튼 추가
  if (document.readyState === 'complete') {
    addExtractButton();
  } else {
    window.addEventListener('load', addExtractButton);
  }
}

// 스크립트 실행
initContentScript(); 