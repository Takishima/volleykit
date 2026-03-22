import { useState, useCallback } from 'react'

import { Button } from '@/common/components/Button'
import { CheckCircle, Plus, X } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { NonConformantSignatures } from '@/common/utils/pdf-form-filler'

import { SignatureCanvas } from './SignatureCanvas'

type SignerRole = 'firstReferee' | 'secondReferee' | 'homeTeamCoach' | 'awayTeamCoach'

interface SignerInfo {
  role: SignerRole
  label: string
  name?: string
  needsNameInput: boolean
}

interface SignatureCollectionStepProps {
  firstRefereeName?: string
  secondRefereeName?: string
  signatures: NonConformantSignatures
  onSignaturesChange: (signatures: NonConformantSignatures) => void
  homeCoachName: string
  onHomeCoachNameChange: (name: string) => void
  awayCoachName: string
  onAwayCoachNameChange: (name: string) => void
  showAwayCoach: boolean
  onToggleAwayCoach: (show: boolean) => void
}

export function SignatureCollectionStep({
  firstRefereeName,
  secondRefereeName,
  signatures,
  onSignaturesChange,
  homeCoachName,
  onHomeCoachNameChange,
  awayCoachName,
  onAwayCoachNameChange,
  showAwayCoach,
  onToggleAwayCoach,
}: SignatureCollectionStepProps) {
  const { t, tInterpolate } = useTranslation()
  const [activeSigner, setActiveSigner] = useState<SignerRole | null>(null)

  const signers: SignerInfo[] = [
    {
      role: 'firstReferee',
      label: `${t('pdf.wizard.nonConformant.firstRefereeLabel')}: ${firstRefereeName ?? ''}`.trim(),
      name: firstRefereeName,
      needsNameInput: false,
    },
    {
      role: 'secondReferee',
      label:
        `${t('pdf.wizard.nonConformant.secondRefereeLabel')}: ${secondRefereeName ?? ''}`.trim(),
      name: secondRefereeName,
      needsNameInput: false,
    },
    {
      role: 'homeTeamCoach',
      label: `${t('pdf.wizard.nonConformant.homeCoachLabel')} (${t('pdf.wizard.nonConformant.coachOptional')})`,
      needsNameInput: true,
    },
  ]

  if (showAwayCoach) {
    signers.push({
      role: 'awayTeamCoach',
      label: `${t('pdf.wizard.nonConformant.awayCoachLabel')} (${t('pdf.wizard.nonConformant.coachOptional')})`,
      needsNameInput: true,
    })
  }

  const getSignatureDataUrl = (role: SignerRole): string | undefined => {
    switch (role) {
      case 'firstReferee':
        return signatures.firstReferee
      case 'secondReferee':
        return signatures.secondReferee
      case 'homeTeamCoach':
        return signatures.homeTeamCoach?.signature
      case 'awayTeamCoach':
        return signatures.awayTeamCoach?.signature
    }
  }

  const requiredSigners = signers.filter((s) => !s.needsNameInput)
  const completedCount = requiredSigners.filter((s) => getSignatureDataUrl(s.role)).length
  const totalRequired = requiredSigners.length

  const handleSignatureComplete = useCallback(
    (dataUrl: string) => {
      if (!activeSigner) return

      const updated = { ...signatures }
      switch (activeSigner) {
        case 'firstReferee':
          updated.firstReferee = dataUrl
          break
        case 'secondReferee':
          updated.secondReferee = dataUrl
          break
        case 'homeTeamCoach':
          updated.homeTeamCoach = { name: homeCoachName, signature: dataUrl }
          break
        case 'awayTeamCoach':
          updated.awayTeamCoach = { name: awayCoachName, signature: dataUrl }
          break
      }
      onSignaturesChange(updated)
      setActiveSigner(null)
    },
    [activeSigner, signatures, onSignaturesChange, homeCoachName, awayCoachName]
  )

  const handleSignatureCancel = useCallback(() => {
    setActiveSigner(null)
  }, [])

  const handleReSign = useCallback(
    (role: SignerRole) => {
      const updated = { ...signatures }
      switch (role) {
        case 'firstReferee':
          delete updated.firstReferee
          break
        case 'secondReferee':
          delete updated.secondReferee
          break
        case 'homeTeamCoach':
          delete updated.homeTeamCoach
          break
        case 'awayTeamCoach':
          delete updated.awayTeamCoach
          break
      }
      onSignaturesChange(updated)
      setActiveSigner(role)
    },
    [signatures, onSignaturesChange]
  )

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t('pdf.wizard.nonConformant.signaturesTitle')}
          </p>
          <span className="text-xs text-text-muted dark:text-text-muted-dark">
            {tInterpolate('pdf.wizard.nonConformant.signaturesProgress', {
              count: completedCount,
              total: totalRequired,
            })}
          </span>
        </div>

        <div className="space-y-2">
          {signers.map((signer) => {
            const hasSigned = !!getSignatureDataUrl(signer.role)
            const coachName = signer.role === 'homeTeamCoach' ? homeCoachName : awayCoachName
            const isCoachNameEmpty = signer.needsNameInput && !coachName.trim()

            return (
              <div
                key={signer.role}
                className={`rounded-lg border p-3 transition-colors ${
                  hasSigned
                    ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/20'
                    : 'border-border-default dark:border-border-default-dark'
                }`}
              >
                {/* Name input for coaches — always editable */}
                {signer.needsNameInput && (
                  <div className="mb-2">
                    <input
                      type="text"
                      value={coachName}
                      onChange={(e) =>
                        signer.role === 'homeTeamCoach'
                          ? onHomeCoachNameChange(e.target.value)
                          : onAwayCoachNameChange(e.target.value)
                      }
                      placeholder={t('pdf.wizard.nonConformant.coachNamePlaceholder')}
                      className="w-full rounded-md border border-border-default dark:border-border-default-dark bg-surface-primary dark:bg-surface-primary-dark text-text-primary dark:text-text-primary-dark text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-text-muted dark:placeholder:text-text-muted-dark"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {hasSigned ? (
                      <CheckCircle
                        className="w-4 h-4 text-success-500 flex-shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full border-2 border-border-default dark:border-border-default-dark flex-shrink-0" />
                    )}
                    <span className="text-sm text-text-primary dark:text-text-primary-dark truncate">
                      {signer.label}
                    </span>
                  </div>
                  {hasSigned ? (
                    <Button
                      variant="ghost"
                      className="text-xs px-2 py-1"
                      onClick={() => handleReSign(signer.role)}
                    >
                      {t('pdf.wizard.nonConformant.reSign')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => setActiveSigner(signer.role)}
                      disabled={isCoachNameEmpty}
                    >
                      {t('pdf.wizard.nonConformant.tapToSign')}
                    </Button>
                  )}
                </div>

                {/* Signature thumbnail preview */}
                {hasSigned && (
                  <div className="mt-2 rounded border border-border-default dark:border-border-default-dark bg-white p-1">
                    <img
                      src={getSignatureDataUrl(signer.role)}
                      alt={t('pdf.wizard.signature.title')}
                      className="h-10 w-auto mx-auto object-contain"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Toggle away team coach */}
        {showAwayCoach ? (
          <button
            type="button"
            onClick={() => onToggleAwayCoach(false)}
            className="flex items-center gap-1.5 text-sm text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            {t('pdf.wizard.nonConformant.removeCoach')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleAwayCoach(true)}
            className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('pdf.wizard.nonConformant.addCoach')}
          </button>
        )}
      </div>

      {activeSigner && (
        <SignatureCanvas onComplete={handleSignatureComplete} onCancel={handleSignatureCancel} />
      )}
    </>
  )
}
