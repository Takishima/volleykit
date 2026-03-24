import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { TwintPaymentModal } from './TwintPaymentModal'

vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function renderModal(props: Partial<React.ComponentProps<typeof TwintPaymentModal>> = {}) {
  return render(
    <TwintPaymentModal
      isOpen={true}
      onClose={vi.fn()}
      firstName="Jean"
      lastName="Dupont"
      mobilePhone="+41791234567"
      {...props}
    />
  )
}

describe('TwintPaymentModal', () => {
  it('renders first and last name', () => {
    renderModal()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('formats and renders the phone number', () => {
    renderModal({ mobilePhone: '+41791234567' })
    expect(screen.getByText('+41 79 123 45 67')).toBeInTheDocument()
  })

  it('formats Swiss local number to international format', () => {
    renderModal({ mobilePhone: '0791234567' })
    expect(screen.getByText('+41 79 123 45 67')).toBeInTheDocument()
  })

  it('shows fallback message when phone is null', () => {
    renderModal({ mobilePhone: null })
    expect(screen.getByText('compensations.twintNoPhone')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Jean Dupont')).not.toBeInTheDocument()
  })
})
