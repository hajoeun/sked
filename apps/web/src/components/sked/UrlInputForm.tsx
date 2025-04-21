'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// Zod 스키마 정의
const formSchema = z.object({
  url: z.string().url({ message: '유효한 URL을 입력해주세요.' }),
})

// ✨ 스키마에서 타입을 명시적으로 추론하여 별칭으로 정의
type UrlFormValues = z.infer<typeof formSchema>

// 컴포넌트 Props 정의
interface UrlInputFormProps {
  onSubmit: (values: UrlFormValues) => void // ✨ 명시적 타입 사용
  isLoading?: boolean // 로딩 상태 표시 여부
}

export function UrlInputForm({
  onSubmit,
  isLoading = false,
}: UrlInputFormProps) {
  // ✨ zodResolver 결과를 변수에 할당
  const resolver = zodResolver(formSchema)

  // react-hook-form 설정
  const form = useForm<UrlFormValues>({
    resolver: resolver, // ✨ 할당된 변수 사용
    defaultValues: {
      url: '',
    },
  })

  // 폼 제출 핸들러
  function handleFormSubmit(values: UrlFormValues) {
    // ✨ 명시적 타입 사용
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>일정 링크 URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/invitation"
                  {...field}
                  disabled={isLoading} // 로딩 중일 때 비활성화
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-coral-orange hover:bg-coral-orange/90"
          disabled={isLoading} // 로딩 중일 때 비활성화
        >
          {isLoading ? '분석 중...' : '일정 만들기'}
        </Button>
      </form>
    </Form>
  )
}
