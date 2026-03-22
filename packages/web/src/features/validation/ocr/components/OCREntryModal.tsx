import { useState, useCallback, useEffect, useRef } from 'react'

import { X } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import {
  useOCRScoresheet,
  compareRosters,
  useEasterEggDetection,
  EasterEggModal,
} from '@/features/ocr'
import type { ParsedGameSheet, ParsedOfficial, OCRResult } from '@/features/ocr'
import type { ScoresheetType } from '@/features/ocr/utils/scoresheet-detector'
import type { RosterPlayer } from '@/features/validation/roster/hooks/useNominationList'

import { OCRCaptureModal } from './OCRCaptureModal'
import { OCRErrorStep } from './OCRErrorStep'
import { OCRIntroStep } from './OCRIntroStep'
import { OCRProcessingStep } from './OCRProcessingStep'
import { OCRResultsStep } from './OCRResultsStep'

import type { TeamComparison } from './OCRResultsStep'

type OCREntryStep = 'intro' | 'capture' | 'processing' | 'results' | 'error'

/** Coach info for comparison */
export interface CoachForComparison {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  role: 'head' | 'firstAssistant' | 'secondAssistant'
}

interface OCREntryModalProps {
  isOpen: boolean
  /** Home team name for display */
  homeTeamName: string
  /** Away team name for display */
  awayTeamName: string
  /** Home roster players for comparison */
  homeRosterPlayers: RosterPlayer[]
  /** Away roster players for comparison */
  awayRosterPlayers: RosterPlayer[]
  /** Home roster coaches for comparison */
  homeRosterCoaches: CoachForComparison[]
  /** Away roster coaches for comparison */
  awayRosterCoaches: CoachForComparison[]
  /** Callback when user skips OCR */
  onSkip: () => void
  /** Callback when user completes OCR, optionally passing the captured image blob */
  onComplete: (capturedImageBlob?: Blob) => void
  /** Callback to close */
  onClose: () => void
}

/**
 * Convert ParsedOfficial to a format compatible with compareRosters
 */
function officialsToPlayers(officials: ParsedOfficial[]) {
  return officials.map((official) => ({
    shirtNumber: null,
    lastName: official.lastName,
    firstName: official.firstName,
    displayName: official.displayName,
    rawName: official.rawName,
    licenseStatus: '',
  }))
}

/**
 * Convert CoachForComparison to RosterPlayerForComparison format
 */
function coachesToRosterFormat(coaches: CoachForComparison[]) {
  return coaches.map((coach) => ({
    id: coach.id,
    displayName: coach.displayName,
    firstName: coach.firstName,
    lastName: coach.lastName,
  }))
}

/**
 * Full-screen OCR entry modal that appears before the validation wizard.
 * Shows comparison results for both teams (players and coaches).
 */
export function OCREntryModal({
  isOpen,
  homeTeamName,
  awayTeamName,
  homeRosterPlayers,
  awayRosterPlayers,
  homeRosterCoaches,
  awayRosterCoaches,
  onSkip,
  onComplete,
  onClose,
}: OCREntryModalProps) {
  const { t } = useTranslation()
  const { processImage, progress, error, reset, ocrResult: hookOcrResult } = useOCRScoresheet()
  const { easterEgg, checkForEasterEggs, dismissEasterEgg } = useEasterEggDetection()

  const [step, setStep] = useState<OCREntryStep>('intro')
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [scoresheetType, setScoresheetType] = useState<ScoresheetType>('electronic')

  // Comparison results for both teams
  const [homeComparison, setHomeComparison] = useState<TeamComparison | null>(null)
  const [awayComparison, setAwayComparison] = useState<TeamComparison | null>(null)

  // Raw OCR data for debugging/transparency
  const [rawOcrData, setRawOcrData] = useState<ParsedGameSheet | null>(null)

  // Stored OCR result with bounding boxes
  const [storedOcrResult, setStoredOcrResult] = useState<OCRResult | null>(null)

  // Image URL for displaying the captured scoresheet
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)

  // Store the captured image blob to pass to validation state
  const capturedBlobRef = useRef<Blob | null>(null)

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['home-players', 'away-players'])
  )

  // Guard against rapid double-clicks
  const isProcessingRef = useRef(false)

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || showCaptureModal) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showCaptureModal, onClose])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('intro')
      setScoresheetType('electronic')
      setHomeComparison(null)
      setAwayComparison(null)
      setRawOcrData(null)
      setStoredOcrResult(null)
      // Revoke previous image URL to prevent memory leaks
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl)
      }
      setCapturedImageUrl(null)
      setExpandedSections(new Set(['home-players', 'away-players']))
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capturedImageUrl changes during reset
  }, [isOpen, reset])

  // Clean up image URL on unmount
  useEffect(() => {
    return () => {
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl)
      }
    }
  }, [capturedImageUrl])

  // Sync OCR result from hook when it updates
  useEffect(() => {
    if (hookOcrResult) {
      setStoredOcrResult(hookOcrResult)
    }
  }, [hookOcrResult])

  // Match OCR team to home/away based on team names
  const matchOCRTeams = useCallback(
    (parsed: ParsedGameSheet) => {
      const teamANameLower = parsed.teamA.name.toLowerCase()
      const teamBNameLower = parsed.teamB.name.toLowerCase()
      const homeNameLower = homeTeamName.toLowerCase()
      const awayNameLower = awayTeamName.toLowerCase()

      // Check if teamA matches home or away
      const teamAMatchesHome =
        teamANameLower.includes(homeNameLower) || homeNameLower.includes(teamANameLower)
      const teamAMatchesAway =
        teamANameLower.includes(awayNameLower) || awayNameLower.includes(teamANameLower)
      const teamBMatchesHome =
        teamBNameLower.includes(homeNameLower) || homeNameLower.includes(teamBNameLower)
      const teamBMatchesAway =
        teamBNameLower.includes(awayNameLower) || awayNameLower.includes(teamBNameLower)

      // Determine which OCR team is home and which is away
      if (teamAMatchesHome && !teamAMatchesAway) {
        return { homeOCR: parsed.teamA, awayOCR: parsed.teamB }
      }
      if (teamAMatchesAway && !teamAMatchesHome) {
        return { homeOCR: parsed.teamB, awayOCR: parsed.teamA }
      }
      if (teamBMatchesHome && !teamBMatchesAway) {
        return { homeOCR: parsed.teamB, awayOCR: parsed.teamA }
      }
      if (teamBMatchesAway && !teamBMatchesHome) {
        return { homeOCR: parsed.teamA, awayOCR: parsed.teamB }
      }

      // Default: teamA = home, teamB = away (column order on scoresheet)
      return { homeOCR: parsed.teamA, awayOCR: parsed.teamB }
    },
    [homeTeamName, awayTeamName]
  )

  // Handle image selection
  const handleImageSelected = useCallback(
    async (blob: Blob) => {
      if (isProcessingRef.current) return
      isProcessingRef.current = true

      setShowCaptureModal(false)
      setStep('processing')

      // Create object URL for displaying the image with bounding boxes
      const imageUrl = URL.createObjectURL(blob)
      setCapturedImageUrl(imageUrl)
      capturedBlobRef.current = blob

      try {
        const parsed = await processImage(blob, scoresheetType)
        if (parsed) {
          // Store raw OCR data for debugging/transparency
          setRawOcrData(parsed)

          // Store OCR result with bounding boxes (from hook state)
          // Note: We'll get this from the hook after processing completes

          const { homeOCR, awayOCR } = matchOCRTeams(parsed)

          // Check if we have any players
          if (homeOCR.players.length === 0 && awayOCR.players.length === 0) {
            setStep('error')
            return
          }

          // Compare home team players
          const homePlayerResults = compareRosters(
            homeOCR.players,
            homeRosterPlayers.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              firstName: p.firstName,
              lastName: p.lastName,
            }))
          )

          // Compare home team coaches
          const homeCoachResults = compareRosters(
            officialsToPlayers(homeOCR.officials),
            coachesToRosterFormat(homeRosterCoaches)
          )

          // Compare away team players
          const awayPlayerResults = compareRosters(
            awayOCR.players,
            awayRosterPlayers.map((p) => ({
              id: p.id,
              displayName: p.displayName,
              firstName: p.firstName,
              lastName: p.lastName,
            }))
          )

          // Compare away team coaches
          const awayCoachResults = compareRosters(
            officialsToPlayers(awayOCR.officials),
            coachesToRosterFormat(awayRosterCoaches)
          )

          setHomeComparison({
            teamName: homeTeamName,
            ocrTeamName: homeOCR.name,
            playerResults: homePlayerResults,
            coachResults: homeCoachResults,
          })

          setAwayComparison({
            teamName: awayTeamName,
            ocrTeamName: awayOCR.name,
            playerResults: awayPlayerResults,
            coachResults: awayCoachResults,
          })

          // Check for Easter egg conditions
          checkForEasterEggs(parsed)

          setStep('results')
        } else {
          setStep('error')
        }
      } catch {
        setStep('error')
      } finally {
        isProcessingRef.current = false
      }
    },
    [
      processImage,
      scoresheetType,
      matchOCRTeams,
      homeTeamName,
      awayTeamName,
      homeRosterPlayers,
      awayRosterPlayers,
      homeRosterCoaches,
      awayRosterCoaches,
      checkForEasterEggs,
    ]
  )

  // Handle retry
  const handleRetry = useCallback(() => {
    reset()
    setHomeComparison(null)
    setAwayComparison(null)
    setRawOcrData(null)
    setStoredOcrResult(null)
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl)
    }
    setCapturedImageUrl(null)
    capturedBlobRef.current = null
    setStep('capture')
    setShowCaptureModal(true)
  }, [reset, capturedImageUrl])

  // Start scanning with a specific type
  const handleStartScan = useCallback((type: ScoresheetType) => {
    setScoresheetType(type)
    setStep('capture')
    setShowCaptureModal(true)
  }, [])

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-gray-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-entry-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 id="ocr-entry-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('validation.ocr.scanScoresheet')}
          </h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 'intro' && <OCRIntroStep onStartScan={handleStartScan} onSkip={onSkip} />}

        {step === 'processing' && <OCRProcessingStep progress={progress} />}

        {step === 'results' && (
          <OCRResultsStep
            homeComparison={homeComparison}
            awayComparison={awayComparison}
            rawOcrData={rawOcrData}
            storedOcrResult={storedOcrResult}
            capturedImageUrl={capturedImageUrl}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
          />
        )}

        {step === 'error' && <OCRErrorStep errorMessage={error?.message} onRetry={handleRetry} />}
      </div>

      {/* Footer - only in results step */}
      {step === 'results' && (
        <div className="flex gap-3 px-4 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleRetry}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('validation.ocr.retryCapture')}
          </button>
          <button
            type="button"
            onClick={() => onComplete(capturedBlobRef.current ?? undefined)}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            {t('validation.ocr.continueToValidation')}
          </button>
        </div>
      )}

      {/* Capture modal */}
      <OCRCaptureModal
        isOpen={showCaptureModal}
        scoresheetType={scoresheetType}
        onClose={() => {
          setShowCaptureModal(false)
          if (step === 'capture') {
            setStep('intro')
          }
        }}
        onImageSelected={handleImageSelected}
      />

      {/* Easter egg modal */}
      {easterEgg.type && (
        <EasterEggModal
          isOpen={easterEgg.isOpen}
          type={easterEgg.type}
          onClose={dismissEasterEgg}
        />
      )}
    </div>
  )
}
