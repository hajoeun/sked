'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// 진행 단계 타입 정의
export type ProgressStep =
  | 'idle'
  | 'scraping'
  | 'parsing'
  | 'done'
  | 'error'
  | 'editing'

interface ProgressIndicatorProps {
  currentStep: ProgressStep
  message?: string
  className?: string
}

// 단계별 메시지 및 진행률 정의
const stepInfo: Record<ProgressStep, { message: string; value: number }> = {
  idle: { message: '', value: 0 },
  scraping: { message: '웹 페이지 분석 중...', value: 30 },
  parsing: { message: '일정 정보 추출 중...', value: 70 },
  editing: { message: '일정 정보를 확인하고 수정하세요.', value: 100 },
  done: { message: '일정 준비 완료! .ics 파일을 다운로드하세요.', value: 100 },
  error: { message: '오류가 발생했습니다.', value: 0 }, // 오류 시 진행률 0 또는 별도 표시
}

export function ProgressIndicator({
  currentStep,
  message,
  className,
}: ProgressIndicatorProps) {
  const info = stepInfo[currentStep]
  const displayMessage = message || info.message

  // idle 상태에서는 아무것도 표시하지 않음
  if (currentStep === 'idle') {
    return null
  }

  return (
    <div className={cn('w-full space-y-2 text-center', className)}>
      <p className="text-sm text-soft-navy">{displayMessage}</p>
      {(currentStep === 'scraping' || currentStep === 'parsing') && (
        <Progress
          value={info.value}
          className="w-full h-2 [&>*]:bg-coral-orange"
        />
      )}
      {currentStep === 'error' && (
        <p className="text-sm text-red-600">
          {message || '다시 시도해주세요.'}
        </p>
      )}
    </div>
  )
}
