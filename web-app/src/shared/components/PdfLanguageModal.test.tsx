import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfLanguageModal } from './PdfLanguageModal';

vi.mock('@/shared/stores/language', () => ({
  useLanguageStore: vi.fn((selector) =>
    selector({ locale: 'de', changeLocale: vi.fn() })
  ),
}));

describe('PdfLanguageModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<PdfLanguageModal {...defaultProps} />);

    // Dialog is inside aria-hidden backdrop (accessibility pattern from CLAUDE.md)
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PdfLanguageModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });

  it('defaults to German when app locale is de', () => {
    render(<PdfLanguageModal {...defaultProps} />);

    const deutschRadio = screen.getByLabelText('Deutsch');
    expect(deutschRadio).toBeChecked();
  });

  it('calls onConfirm with selected language when generate clicked', () => {
    const onConfirm = vi.fn();
    render(<PdfLanguageModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Français'));
    fireEvent.click(screen.getByRole('button', { hidden: true, name: /generate|erstellen/i }));

    expect(onConfirm).toHaveBeenCalledWith('fr');
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<PdfLanguageModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { hidden: true, name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(<PdfLanguageModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByRole('dialog', { hidden: true }).parentElement;
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(<PdfLanguageModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    render(<PdfLanguageModal {...defaultProps} isLoading />);

    expect(screen.getByRole('button', { hidden: true, name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { hidden: true, name: /generating/i })).toBeDisabled();
  });

  it('does not close on backdrop click when loading', () => {
    const onClose = vi.fn();
    render(<PdfLanguageModal {...defaultProps} onClose={onClose} isLoading />);

    const backdrop = screen.getByRole('dialog', { hidden: true }).parentElement;
    fireEvent.click(backdrop!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on Escape when loading', () => {
    const onClose = vi.fn();
    render(<PdfLanguageModal {...defaultProps} onClose={onClose} isLoading />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
