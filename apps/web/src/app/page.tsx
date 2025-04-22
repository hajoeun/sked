'use client'

import { useState } from 'react'
import { UrlInputForm } from '@/components/sked/UrlInputForm'
import {
  ProgressIndicator,
  ProgressStep,
} from '@/components/sked/ProgressIndicator'
import { PreviewCard, EventData } from '@/components/sked/PreviewCard'
import { DownloadButton } from '@/components/sked/DownloadButton'
import { Loader } from '@/components/sked/Loader'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [progressStep, setProgressStep] = useState<ProgressStep>('idle')
  const [editedEventData, setEditedEventData] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string>('')

  // URL 입력 폼 제출 핸들러
  const handleUrlSubmit = async ({ url }: { url: string }) => {
    console.log('Submitting URL:', url)
    setOriginalUrl(url)
    setIsLoading(true)
    setProgressStep('scraping')
    setError(null)
    setEditedEventData(null)

    try {
      // 1. 스크래핑 API 호출 (/api/scrape 프록시 사용)
      console.log('Calling scrape proxy API...')
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json()
        throw new Error(errorData.details || 'Failed to scrape URL')
      }

      // --- 응답 형식 확인 필요 ---
      // spec.md의 Firecrawl 예시를 보면 scrapeResult.markdown 또는 scrapeResult.data 가 텍스트일 수 있음
      const scrapeResult = await scrapeResponse.json()
      const textToParse =
        scrapeResult.markdown || scrapeResult.data || scrapeResult.text // 실제 응답 키에 맞춰야 함
      console.log('Scraping successful, text length:', textToParse?.length)

      if (!textToParse) {
        throw new Error('No text content found after scraping.')
      }
      setProgressStep('parsing')

      // 2. 파싱 API 호출 (/api/parse 프록시 사용)
      console.log('Calling parse proxy API...')
      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
      })

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json()
        throw new Error(errorData.details || 'Failed to parse text')
      }

      const parsedData: EventData = await parseResponse.json()
      console.log('Parsing successful:', parsedData)

      setEditedEventData(parsedData) // 초기 편집 데이터 설정
      setProgressStep('editing') // 편집 단계로 변경
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('Error during process:', err)
      setError(error.message || 'An unexpected error occurred.')
      setProgressStep('error')
    } finally {
      setIsLoading(false)
    }
  }

  // 미리보기 카드 데이터 변경 핸들러
  const handlePreviewDataChange = (field: keyof EventData, value: string) => {
    setEditedEventData((prevData) => {
      if (!prevData) return null
      return { ...prevData, [field]: value }
    })
  }

  // 다운로드 버튼 클릭 핸들러
  const handleDownload = async () => {
    if (!editedEventData) {
      setError('다운로드할 데이터가 없습니다.')
      setProgressStep('error')
      return
    }
    if (!originalUrl) {
      setError('원본 URL 정보가 없습니다. 다시 시도해주세요.')
      setProgressStep('error')
      return
    }

    console.log(
      'Initiating ICS download for:',
      editedEventData,
      'from URL:',
      originalUrl
    )
    setError(null)
    // 다운로드 시작 시 progressStep을 명시적으로 변경할 필요는 없을 수 있음
    // setProgressStep('downloading'); // 필요하다면 ProgressStep에 추가

    try {
      // 1. 프론트엔드 프록시 /api/download 호출
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventData: editedEventData, url: originalUrl }),
      })

      if (!response.ok) {
        // API 오류 처리 (프록시에서 전달된 오류)
        const errorData = await response.json().catch(() => ({
          error: '응답 파싱 오류',
          details: response.statusText,
        }))
        throw new Error(
          errorData.details || errorData.error || 'ICS 파일 다운로드 실패'
        )
      }

      // 2. 파일 이름 추출 (Content-Disposition 헤더)
      const disposition = response.headers.get('content-disposition')
      let filename = 'event.ics' // 기본 파일명

      if (disposition) {
        let filenameMatch = disposition.match(/filename\*=UTF-8''([^";]+)/i) // filename* 먼저 확인 (RFC 6266) - 수정: 따옴표 제외
        if (filenameMatch && filenameMatch[1]) {
          try {
            filename = decodeURIComponent(filenameMatch[1]) // 퍼센트 디코딩
          } catch (e) {
            console.error('Error decoding filename*:', e)
            // 디코딩 실패 시 fallback 사용
            filenameMatch = null // 아래 filename= 부분을 다시 시도하도록 함
          }
        } else {
          // filename* 형식이 약간 다를 수 있음 (따옴표 포함 등), 추가 정규식 시도
          filenameMatch = disposition.match(/filename\*=[^']+''"?([^";]+)"?/i)
          if (filenameMatch && filenameMatch[1]) {
            try {
              filename = decodeURIComponent(filenameMatch[1])
            } catch (e) {
              console.error('Error decoding filename* (alt):', e)
              filenameMatch = null
            }
          }
        }

        // filename*이 없거나 디코딩 실패 시 filename= 확인
        if (!filenameMatch || !filename || filename === 'event.ics') {
          // filename이 유효하게 설정되지 않은 경우
          filenameMatch = disposition.match(/filename="([^"]+)"/i) // 큰따옴표로 감싸진 filename
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1]
          } else {
            filenameMatch = disposition.match(/filename=([^";]+)/i) // 따옴표 없는 filename, 세미콜론 전까지
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1] // 이 경우, 서버에서 보낸 밑줄 이름이 추출될 수 있음
            }
          }
        }
      }

      // 제목이 없고 disposition 헤더도 없을 경우 대비한 최종 fallback
      if (!filename || filename === '.ics' || filename.trim() === '') {
        filename = `${editedEventData?.title || 'event'}.ics`
      }
      // 확장자가 없는 경우 추가
      if (!filename.toLowerCase().endsWith('.ics')) {
        filename += '.ics'
      }

      console.log('Final filename for download:', filename)

      // 3. Blob 생성 및 다운로드 트리거
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // 정리
      a.remove()
      window.URL.revokeObjectURL(url)

      console.log('ICS file download triggered successfully:', filename)
      setProgressStep('done') // 다운로드 완료 상태로 변경
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('Error during download:', err)
      setError(error.message || '파일 다운로드 중 오류가 발생했습니다.')
      setProgressStep('error')
    }
  }

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center text-coral-orange">
          Sked
        </h1>
        <p className="text-center text-soft-navy">
          웹페이지 링크에서 일정을 추출하여 캘린더에 쉽게 추가하세요.
        </p>

        <UrlInputForm onSubmit={handleUrlSubmit} isLoading={isLoading} />

        {progressStep !== 'idle' && (
          <ProgressIndicator
            currentStep={progressStep}
            message={error || undefined}
          />
        )}

        {isLoading && <Loader />}

        {editedEventData && progressStep !== 'error' && (
          <PreviewCard
            editedData={editedEventData}
            onDataChange={handlePreviewDataChange}
          />
        )}

        {editedEventData &&
          (progressStep === 'editing' || progressStep === 'done') && (
            <DownloadButton onClick={handleDownload} isDisabled={isLoading} />
          )}
      </div>
    </main>
  )
}
