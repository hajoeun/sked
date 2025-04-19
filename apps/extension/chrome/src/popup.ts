import { EventData, Message } from './types';

/**
 * 팝업 UI 관리 클래스
 * [SOLID: Single Responsibility]
 * 팝업 UI 및 데이터 관리, 상호작용 처리 책임
 */
class PopupManager {
  private extractButton: HTMLButtonElement;
  private loadingElement: HTMLDivElement;
  private resultContainer: HTMLDivElement;
  private titleInput: HTMLInputElement;
  private descriptionTextarea: HTMLTextAreaElement;
  private dateInput: HTMLInputElement;
  private timeInput: HTMLInputElement;
  private locationInput: HTMLInputElement;
  private downloadButton: HTMLButtonElement;
  private statusElement: HTMLDivElement;

  /**
   * 생성자
   */
  constructor() {
    // DOM 요소 참조 가져오기
    this.extractButton = document.getElementById('extract-button') as HTMLButtonElement;
    this.loadingElement = document.getElementById('loading') as HTMLDivElement;
    this.resultContainer = document.getElementById('result-container') as HTMLDivElement;
    this.titleInput = document.getElementById('title') as HTMLInputElement;
    this.descriptionTextarea = document.getElementById('description') as HTMLTextAreaElement;
    this.dateInput = document.getElementById('date') as HTMLInputElement;
    this.timeInput = document.getElementById('time') as HTMLInputElement;
    this.locationInput = document.getElementById('location') as HTMLInputElement;
    this.downloadButton = document.getElementById('download-button') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLDivElement;

    // 이벤트 리스너 초기화
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    this.extractButton.addEventListener('click', () => this.handleExtract());
    this.downloadButton.addEventListener('click', () => this.handleDownload());
  }

  /**
   * 텍스트 추출 처리
   */
  private handleExtract(): void {
    this.showLoading(true);
    this.showStatus('', 'hidden'); // 이전 상태 메시지 숨김

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || tabs[0].id === undefined) {
        this.showError('활성 탭을 찾을 수 없습니다.');
        this.showLoading(false);
        return;
      }
      const activeTabId = tabs[0].id;

      // content script에 텍스트 추출 요청
      chrome.tabs.sendMessage(
        activeTabId,
        { type: 'GET_PAGE_TEXT' } as Message,
        (response) => {
          if (chrome.runtime.lastError) {
            // content script 로드 실패 등
            this.showError(`텍스트 추출 오류: ${chrome.runtime.lastError.message}`);
            this.showLoading(false);
          } else if (response && response.text) {
            this.handlePageTextResponse(response.text);
          } else {
            this.showError('페이지에서 텍스트를 추출하지 못했습니다.');
            this.showLoading(false);
          }
        }
      );
    });
  }

  /**
   * 페이지 텍스트 응답 처리 (파싱 요청)
   */
  private handlePageTextResponse(text: string): void {
    this.showStatus('텍스트 분석 중...', 'info'); 
    
    // 백그라운드 스크립트에 파싱 요청
    chrome.runtime.sendMessage(
      { type: 'PARSE_TEXT', payload: text } as Message,
      (response) => {
        if (chrome.runtime.lastError) {
          this.showError(`파싱 오류: ${chrome.runtime.lastError.message}`);
          this.showLoading(false);
        } else if (response && response.error) {
          this.showError(`파싱 실패: ${response.error}`);
          this.showLoading(false);
        } else if (response && response.data) {
          this.handleParseResponse(response.data as EventData);
        } else {
          this.showError('일정 정보를 파싱하지 못했습니다.');
          this.showLoading(false);
        }
      }
    );
  }

  /**
   * 파싱 결과 처리 (UI 업데이트)
   */
  private handleParseResponse(eventData: EventData): void {
    this.showLoading(false);
    this.fillFormWithEventData(eventData);
    this.resultContainer.classList.remove('hidden');
    this.downloadButton.disabled = false; // 다운로드 버튼 활성화
    this.showStatus('일정 정보 추출 완료!', 'success');
  }

  /**
   * 폼에 이벤트 데이터 채우기
   */
  private fillFormWithEventData(eventData: EventData): void {
    this.titleInput.value = eventData.title || '';
    this.descriptionTextarea.value = eventData.description || '';
    this.dateInput.value = eventData.date || '';
    this.timeInput.value = eventData.time || '';
    this.locationInput.value = eventData.location || '';
  }

  /**
   * 현재 폼 값으로 이벤트 데이터 얻기
   */
  private getEventDataFromForm(): EventData {
    return {
      title: this.titleInput.value,
      description: this.descriptionTextarea.value,
      date: this.dateInput.value,
      time: this.timeInput.value,
      location: this.locationInput.value
    };
  }

  /**
   * 다운로드 처리
   */
  private handleDownload(): void {
    const eventData = this.getEventDataFromForm();
    
    if (!this.validateEventData(eventData)) {
      this.showStatus('필수 필드(제목, 날짜, 시간)를 채워주세요.', 'error');
      return;
    }

    this.showStatus('다운로드 요청 중...', 'info');

    // 백그라운드 스크립트에 다운로드 요청
    chrome.runtime.sendMessage(
      { type: 'DOWNLOAD_ICS', payload: eventData } as Message,
      (response) => {
        if (chrome.runtime.lastError) {
          this.showError(`다운로드 오류: ${chrome.runtime.lastError.message}`);
        } else if (response && response.error) {
          this.showError(`다운로드 실패: ${response.error}`);
        } else {
          this.showStatus('일정이 성공적으로 다운로드되었습니다.', 'success');
        }
      }
    );
  }

  /**
   * 이벤트 데이터 유효성 검사
   */
  private validateEventData(eventData: EventData): boolean {
    return !!(eventData.title && eventData.date && eventData.time);
  }

  /**
   * 로딩 상태 표시/숨김
   */
  private showLoading(show: boolean): void {
    if (show) {
      this.loadingElement.classList.remove('hidden');
      this.resultContainer.classList.add('hidden'); // 로딩 중 결과 숨김
    } else {
      this.loadingElement.classList.add('hidden');
    }
  }

  /**
   * 상태 메시지 표시
   */
  private showStatus(message: string, type: 'success' | 'error' | 'info' | 'hidden'): void {
    if (type === 'hidden') {
      this.statusElement.classList.add('hidden');
      return;
    }
    this.statusElement.textContent = message;
    // 기존 상태 클래스 제거 후 새 클래스 추가
    this.statusElement.className = 'status'; 
    if (type !== 'info') { // info는 별도 배경색 없음
       this.statusElement.classList.add(type);
    }
    this.statusElement.classList.remove('hidden');

    // 에러 메시지가 아니면 일정 시간 후 숨김
    if (type !== 'error') {
      setTimeout(() => {
        this.statusElement.classList.add('hidden');
      }, 3000);
    }
  }
  
  /**
   * 에러 메시지 표시 (showStatus 래퍼)
   */
  private showError(message: string): void {
      this.showStatus(message, 'error');
  }
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 