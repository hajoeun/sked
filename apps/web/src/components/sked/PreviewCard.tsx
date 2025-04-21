'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

// 일정 데이터 타입 정의
export interface EventData {
  title: string
  description: string
  date: string // YYYY-MM-DD
  time: string // HH:MM (24시간 형식)
  location: string
}

interface PreviewCardProps {
  initialData: EventData
  editedData: EventData
  onDataChange: (field: keyof EventData, value: string) => void
  className?: string
}

export function PreviewCard({
  initialData,
  editedData,
  onDataChange,
  className,
}: PreviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    onDataChange(name as keyof EventData, value)
  }

  const toggleEdit = () => setIsEditing(!isEditing)

  // 날짜 형식 검증 (간단한 형태)
  const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(editedData.date)
  // 시간 형식 검증 (간단한 형태)
  const isTimeValid = /^\d{2}:\d{2}$/.test(editedData.time)

  return (
    <Card
      className={cn('w-full bg-cream-white border-soft-navy/20', className)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg text-soft-navy">
            추출된 일정 정보
          </CardTitle>
          <CardDescription className="text-sm text-soft-navy/80">
            {isEditing
              ? '내용을 수정하고 저장하세요.'
              : '내용 확인 후 필요시 수정하세요.'}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleEdit}
          className="text-soft-navy hover:bg-soft-navy/10"
        >
          {isEditing ? (
            <Save className="h-4 w-4" />
          ) : (
            <Edit className="h-4 w-4" />
          )}
          <span className="sr-only">{isEditing ? '저장' : '편집'}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-soft-navy">
              제목
            </Label>
            <Input
              id="title"
              name="title"
              value={editedData.title}
              onChange={handleInputChange}
              readOnly={!isEditing}
              className={cn(
                'bg-white/50 read-only:bg-gray-100/50 read-only:cursor-default',
                !isEditing && 'border-none'
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-soft-navy">
              장소
            </Label>
            <Input
              id="location"
              name="location"
              value={editedData.location}
              onChange={handleInputChange}
              readOnly={!isEditing}
              className={cn(
                'bg-white/50 read-only:bg-gray-100/50 read-only:cursor-default',
                !isEditing && 'border-none'
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-soft-navy">
              날짜 (YYYY-MM-DD)
            </Label>
            <Input
              id="date"
              name="date"
              value={editedData.date}
              onChange={handleInputChange}
              readOnly={!isEditing}
              className={cn(
                'bg-white/50 read-only:bg-gray-100/50 read-only:cursor-default',
                !isDateValid && isEditing && 'border-red-500',
                !isEditing && 'border-none'
              )}
            />
            {!isDateValid && isEditing && (
              <p className="text-xs text-red-600">
                YYYY-MM-DD 형식을 확인하세요.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-soft-navy">
              시간 (HH:MM)
            </Label>
            <Input
              id="time"
              name="time"
              value={editedData.time}
              onChange={handleInputChange}
              readOnly={!isEditing}
              className={cn(
                'bg-white/50 read-only:bg-gray-100/50 read-only:cursor-default',
                !isTimeValid && isEditing && 'border-red-500',
                !isEditing && 'border-none'
              )}
            />
            {!isTimeValid && isEditing && (
              <p className="text-xs text-red-600">
                HH:MM (24시간) 형식을 확인하세요.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-soft-navy">
            설명
          </Label>
          <Textarea
            id="description"
            name="description"
            value={editedData.description}
            onChange={handleInputChange}
            readOnly={!isEditing}
            className={cn(
              'bg-white/50 read-only:bg-gray-100/50 read-only:cursor-default min-h-[80px]',
              !isEditing && 'border-none'
            )}
          />
        </div>
      </CardContent>
      {/* CardFooter는 필요시 추가 */}
      {/* <CardFooter className="flex justify-end">
        {isEditing && (
          <Button onClick={toggleEdit} className="bg-coral-orange hover:bg-coral-orange/90">
            <Save className="mr-2 h-4 w-4" /> 저장
          </Button>
        )}
      </CardFooter> */}
    </Card>
  )
}
