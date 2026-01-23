/**
 * CropScreen Component
 *
 * Wrapper that uses the web-app's ImageCropEditor component.
 * This demonstrates component reuse between the PoC and main app.
 */

import { useMemo } from 'react'

import { ImageCropEditor } from '@/features/validation/components/ImageCropEditor'
import { useAppStore } from '@/stores/appStore'

import type { ScoresheetType } from '@/features/ocr/utils/scoresheet-detector'

interface CropScreenProps {
  /** Whether this is a roster-only crop from full manuscript */
  isRosterCrop?: boolean
}

export function CropScreen({ isRosterCrop = false }: CropScreenProps) {
  const capturedImage = useAppStore((s) => s.capturedImage)
  const sheetType = useAppStore((s) => s.sheetType)
  const captureMode = useAppStore((s) => s.captureMode)
  const setCroppedImage = useAppStore((s) => s.setCroppedImage)
  const goToProcessing = useAppStore((s) => s.goToProcessing)
  const goToRosterCrop = useAppStore((s) => s.goToRosterCrop)
  const goBack = useAppStore((s) => s.goBack)

  // Convert PoC sheet type to web-app's ScoresheetType
  const scoresheetType: ScoresheetType = useMemo(() => {
    if (isRosterCrop) {
      return 'manuscript'
    }
    return sheetType === 'electronic' ? 'electronic' : 'manuscript'
  }, [sheetType, isRosterCrop])

  // Handle crop confirmation
  const handleConfirm = (croppedBlob: Blob) => {
    setCroppedImage(croppedBlob)

    // If this was full manuscript capture, go to roster crop next
    // Otherwise go directly to processing
    if (sheetType === 'manuscript' && captureMode === 'full' && !isRosterCrop) {
      goToRosterCrop()
    } else {
      goToProcessing()
    }
  }

  // Handle cancel
  const handleCancel = () => {
    goBack()
  }

  // Show message if no image
  if (!capturedImage) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-slate-600">No image to edit</p>
      </div>
    )
  }

  return (
    <ImageCropEditor
      imageBlob={capturedImage}
      scoresheetType={scoresheetType}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}
