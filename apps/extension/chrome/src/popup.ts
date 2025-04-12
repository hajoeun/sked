import { EventData } from './types';

/**
 * 팝업 UI 관리 클래스
 * [SOLID: Single Responsibility]
 * 팝업 UI 및 데이터 관리 책임
 */
class PopupManager {
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
    this.titleInput = document.getElementById('title') as HTMLInputElement;
    this.descriptionTextarea = document.getElementById('description') as HTMLTextAreaElement;
    this.dateInput = document.getElementById('date') as HTMLInputElement;
    this.timeInput = document.getElementById('time') as HTMLInputElement;
    this.locationInput = document.getElementById('location') as HTMLInputElement;
    this.downloadButton = document.getElementById('download-button') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLDivElement;

    // 이벤트 리스너 초기화
    this.setupEventListeners();

    // 저장된 데이터 로드
    this.loadEventData();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    this.downloadButton.addEventListener('click', () => this.handleDownload());
  }

  /**
   * 저장된 이벤트 데이터 로드
   */
  private loadEventData(): void {
    chrome.storage.local.get(['currentEventData'], (result) => {
      const eventData = result.currentEventData as EventData | undefined;
      if (eventData) {
        this.fillFormWithEventData(eventData);
      }
    });
  }

  /**
   * 폼에 이벤트 데이터 채우기
   */
  private fillFormWithEventData(eventData: EventData): void {
    this.titleInput.value = eventData.title || '';
    this.descriptionTextarea.value = eventData.description || '';
    
    // YYYY-MM-DD 형식의 날짜를 input[type="date"]에 설정
    if (eventData.date) {
      this.dateInput.value = eventData.date;
    }
    
    // HH:MM 형식의 시간을 input[type="time"]에 설정
    if (eventData.time) {
      this.timeInput.value = eventData.time;
    }
    
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
    
    // 필수 필드 검증
    if (!this.validateEventData(eventData)) {
      this.showStatus('모든 필드를 채워주세요.', 'error');
      return;
    }

    // 백그라운드 스크립트에 다운로드 요청
    chrome.runtime.sendMessage(
      { type: 'DOWNLOAD_ICS', payload: eventData },
      (response) => {
        if (response && response.error) {
          this.showStatus(`오류: ${response.error}`, 'error');
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
    return !!(
      eventData.title &&
      eventData.date &&
      eventData.time
    );
  }

  /**
   * 상태 메시지 표시
   */
  private showStatus(message: string, type: 'success' | 'error'): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
    this.statusElement.classList.remove('hidden');

    // 일정 시간 후 상태 메시지 숨기기
    setTimeout(() => {
      this.statusElement.classList.add('hidden');
    }, 3000);
  }
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 