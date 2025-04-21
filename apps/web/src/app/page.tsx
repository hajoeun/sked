'use client'

import { useState } from 'react'
import { UrlInputForm } from '@/components/sked/UrlInputForm'
import {
  ProgressIndicator,
  ProgressStep,
} from '@/components/sked/ProgressIndicator'
import { PreviewCard, EventData } from '@/components/sked/PreviewCard'
import { DownloadButton } from '@/components/sked/DownloadButton'

// 기본 빈 이벤트 데이터
const initialEventData: EventData = {
  title: '',
  description: '',
  date: '', // YYYY-MM-DD
  time: '', // HH:MM
  location: '',
}

export default function HomePage() {
  const [url, setUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [progressStep, setProgressStep] = useState<ProgressStep>('idle')
  const [scrapedText, setScrapedText] = useState<string | null>(null)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [editedEventData, setEditedEventData] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // URL 입력 폼 제출 핸들러
  const handleUrlSubmit = async ({ url }: { url: string }) => {
    console.log('Submitting URL:', url)
    setUrl(url)
    setIsLoading(true)
    setProgressStep('scraping')
    setError(null)
    setEventData(null)
    setEditedEventData(null)
    setScrapedText(null)

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
      setScrapedText(textToParse)
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

      setEventData(parsedData)
      setEditedEventData(parsedData) // 초기 편집 데이터 설정
      setProgressStep('editing') // 편집 단계로 변경
    } catch (err: any) {
      console.error('Error during process:', err)
      setError(err.message || 'An unexpected error occurred.')
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

    console.log('Initiating ICS download for:', editedEventData)
    setIsLoading(true)
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
        body: JSON.stringify(editedEventData),
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
      let filename = `${editedEventData.title || 'event'}.ics` // 기본 파일명
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"])(.*?)\2|[^;\n]*)/
        const matches = filenameRegex.exec(disposition)
        if (matches != null && matches[3]) {
          filename = matches[3]
        }
      }

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
    } catch (err: any) {
      console.error('Error during download:', err)
      setError(err.message || '파일 다운로드 중 오류가 발생했습니다.')
      setProgressStep('error')
    } finally {
      setIsLoading(false)
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

        <ProgressIndicator
          currentStep={progressStep}
          message={error || undefined}
        />

        {editedEventData && progressStep !== 'error' && (
          <PreviewCard
            initialData={eventData!} // eventData는 이 시점에 null이 아님
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
