import { useFormStatus } from 'react-dom'

import { Button, type ButtonProps } from './Button'

type FormSubmitButtonProps = Omit<ButtonProps, 'type' | 'loading' | 'disabled'> & {
  /** Additional disabled condition beyond the form's pending state */
  disabled?: boolean
}

/**
 * Submit button that reads pending state from the nearest parent `<form action={...}>`.
 * Uses React 19's `useFormStatus` — no need to pass `isPending` as a prop.
 *
 * Must be rendered inside a `<form>` that uses the `action` prop (React 19 form actions).
 *
 * @example
 * ```tsx
 * const [error, submitAction, isPending] = useActionState(async () => { ... }, null)
 *
 * <form action={submitAction}>
 *   <FormSubmitButton variant="primary">Save</FormSubmitButton>
 * </form>
 * ```
 */
export function FormSubmitButton({ disabled, children, ...props }: FormSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" loading={pending} disabled={disabled || pending} {...props}>
      {children}
    </Button>
  )
}
