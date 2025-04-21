'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DownloadButtonProps {
  onClick: () => void
  isDisabled?: boolean
  className?: string
}

export function DownloadButton({
  onClick,
  isDisabled = false,
  className,
}: DownloadButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'w-full bg-coral-orange hover:bg-coral-orange/90',
        className
      )}
    >
      <Download className="mr-2 h-4 w-4" />
      .ics 파일 다운로드
    </Button>
  )
}
