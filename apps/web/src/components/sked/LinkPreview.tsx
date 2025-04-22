'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// Metadata interface matching the backend response
export interface LinkMetadata {
  title?: string
  description?: string
  image?: string
  url?: string
  siteName?: string
  type?: string
}

interface LinkPreviewProps {
  url: string
  className?: string
  onLoad?: () => void // Optional callback when loading finishes (success or error)
  onError?: (error: string) => void // Optional callback specifically for errors
}

export function LinkPreview({
  url,
  className = '',
  onLoad,
  onError,
}: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setError('미리보기를 생성할 URL이 없습니다.')
      setIsLoading(false)
      onLoad?.()
      onError?.('미리보기를 생성할 URL이 없습니다.')
      return
    }

    let isMounted = true // Avoid state updates on unmounted component
    const controller = new AbortController() // Abort fetch if component unmounts or URL changes

    const fetchMetadata = async () => {
      setIsLoading(true)
      setError(null)
      setMetadata(null) // Clear previous metadata

      try {
        // Call the local Next.js API proxy route
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: controller.signal, // Attach abort signal
        })

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ details: '응답 파싱 오류' }))
          throw new Error(
            errorData.details ||
              `메타데이터를 가져오지 못했습니다 (${response.status})`
          )
        }

        const data: LinkMetadata = await response.json()

        if (isMounted) {
          setMetadata(data)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Metadata fetch aborted')
          return // Ignore abort errors
        }
        const errorMessage = err instanceof Error ? err.message : String(err)
        if (isMounted) {
          setError(errorMessage)
          onError?.(errorMessage)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
          onLoad?.()
        }
      }
    }

    fetchMetadata()

    // Cleanup function
    return () => {
      isMounted = false
      controller.abort() // Abort fetch on unmount or URL change
    }
  }, [url, onLoad, onError]) // Rerun effect if URL or callbacks change

  if (isLoading) {
    return (
      <div
        className={`animate-pulse rounded-lg border border-gray-200 bg-gray-100 p-4 shadow-sm ${className}`}
        aria-busy="true"
        aria-label="링크 미리보기 로딩 중"
      >
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 h-24 bg-gray-300 rounded mb-2 md:mb-0 md:mr-4"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-full"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state only if there's an error and no metadata was successfully loaded before
  // Or if metadata is explicitly empty (backend returned nothing useful)
  const hasContent =
    metadata && (metadata.title || metadata.description || metadata.image)
  if (error && !hasContent) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm ${className}`}
        role="alert"
      >
        <p className="text-sm text-red-700">
          <span className="font-medium">미리보기 오류:</span> {error}
        </p>
      </div>
    )
  }

  // If no error, but no content either, render nothing or a minimal fallback
  if (!hasContent) {
    // Optionally return a minimal representation or just null
    return (
      <div className={`rounded-lg border p-4 shadow-sm ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-coral-orange hover:underline break-all"
        >
          {url}
        </a>
        <p className="text-xs text-gray-500 mt-1">
          미리보기를 생성할 수 없습니다.
        </p>
      </div>
    )
    // return null;
  }

  // Render the preview card with available metadata
  return (
    <a
      href={metadata.url || url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
      aria-label={`링크 미리보기: ${metadata.title || '제목 없음'}`}
    >
      <div className="flex flex-col md:flex-row bg-white">
        {metadata.image && (
          <div className="w-full md:w-1/3 h-40 md:h-auto relative flex-shrink-0">
            {/* Using simple img tag for external URLs, Next/Image might require configuration */}
            <img
              src={metadata.image}
              alt={metadata.title || '링크 미리보기 이미지'}
              className="w-full h-full object-cover"
              loading="lazy" // Lazy load images
              onError={(e) => (e.currentTarget.style.display = 'none')} // Hide image on error
            />
          </div>
        )}
        <div className="p-4 flex-1 min-w-0">
          {' '}
          {/* Added min-w-0 for text truncation */}
          {metadata.title && (
            <h3
              className="font-semibold text-soft-navy truncate"
              title={metadata.title}
            >
              {' '}
              {/* Added truncate */}
              {metadata.title}
            </h3>
          )}
          {metadata.description && (
            <p
              className="text-sm text-gray-600 mt-1 line-clamp-2"
              title={metadata.description}
            >
              {metadata.description}
            </p>
          )}
          <div className="mt-2 flex items-center text-xs text-gray-500">
            {metadata.siteName && (
              <span className="mr-2 truncate" title={metadata.siteName}>
                {metadata.siteName}
              </span>
            )}
            <span
              className="text-coral-orange truncate"
              title={metadata.url || url}
            >
              {metadata.url
                ? new URL(metadata.url).hostname.replace(/^www\./, '')
                : url}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}
