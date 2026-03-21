import { useState, useCallback } from 'react'

import { Button } from '@/shared/components/Button'
import { CheckCircle, Plus } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { NonConformantSignatures } from '@/shared/utils/pdf-form-filler'

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
  showAwayCoach: boolean
  onToggleAwayCoach: () => void
}

export function SignatureCollectionStep({
  firstRefereeName,
  secondRefereeName,
  signatures,
  onSignaturesChange,
  showAwayCoach,
  onToggleAwayCoach,
}: SignatureCollectionStepProps) {
  const { t, tInterpolate } = useTranslation()
  const [activeSigner, setActiveSigner] = useState<SignerRole | null>(null)
  const [homeCoachName, setHomeCoachName] = useState(signatures.homeTeamCoach?.name ?? '')
  const [awayCoachName, setAwayCoachName] = useState(signatures.awayTeamCoach?.name ?? '')

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
      label: t('pdf.wizard.nonConformant.homeCoachLabel'),
      needsNameInput: true,
    },
  ]

  if (showAwayCoach) {
    signers.push({
      role: 'awayTeamCoach',
      label: t('pdf.wizard.nonConformant.awayCoachLabel'),
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

  const completedCount = signers.filter((s) => getSignatureDataUrl(s.role)).length
  const totalRequired = signers.length

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

            return (
              <div
                key={signer.role}
                className={`rounded-lg border p-3 transition-colors ${
                  hasSigned
                    ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/20'
                    : 'border-border-default dark:border-border-default-dark'
                }`}
              >
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
                  {!hasSigned && (
                    <Button
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => setActiveSigner(signer.role)}
                      disabled={
                        signer.needsNameInput &&
                        (signer.role === 'homeTeamCoach'
                          ? !homeCoachName.trim()
                          : !awayCoachName.trim())
                      }
                    >
                      {t('pdf.wizard.nonConformant.tapToSign')}
                    </Button>
                  )}
                </div>

                {/* Name input for coaches */}
                {signer.needsNameInput && !hasSigned && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={signer.role === 'homeTeamCoach' ? homeCoachName : awayCoachName}
                      onChange={(e) =>
                        signer.role === 'homeTeamCoach'
                          ? setHomeCoachName(e.target.value)
                          : setAwayCoachName(e.target.value)
                      }
                      placeholder={t('pdf.wizard.nonConformant.coachNamePlaceholder')}
                      className="w-full rounded-md border border-border-default dark:border-border-default-dark bg-surface-primary dark:bg-surface-primary-dark text-text-primary dark:text-text-primary-dark text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-text-muted dark:placeholder:text-text-muted-dark"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add away team coach button */}
        {!showAwayCoach && (
          <button
            type="button"
            onClick={onToggleAwayCoach}
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
