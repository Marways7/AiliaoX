/**
 * Select 下拉选择组件 - 未来感风格
 */
import { Fragment, forwardRef } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string | number | undefined
  onChange: (value: string | number) => void
  options: SelectOption[]
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  fullWidth?: boolean
  disabled?: boolean
  required?: boolean
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(({
  value,
  onChange,
  options,
  label,
  error,
  helperText,
  placeholder = '请选择',
  fullWidth = false,
  disabled = false,
  required = false,
}, ref) => {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <div ref={ref} className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={cn(
              'relative w-full cursor-pointer rounded-lg',
              'bg-background-secondary border border-border-primary',
              'px-4 py-2.5 text-left',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'focus:shadow-neon-blue',
              'transition-all duration-300',
              error && 'border-error-500 focus:ring-error-500 focus:border-error-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={cn('block truncate', !selectedOption && 'text-text-tertiary')}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className={cn(
                'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg',
                'glass-strong shadow-neon-blue',
                'py-1 text-base'
              )}
            >
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={({ active }) =>
                    cn(
                      'relative cursor-pointer select-none py-2 pl-10 pr-4',
                      'transition-colors duration-150',
                      active && 'bg-primary-500/10 text-primary-400',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className={cn('block truncate', selected && 'font-semibold')}>
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {error && (
        <span className="text-sm text-error-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </span>
      )}

      {helperText && !error && (
        <span className="text-sm text-text-tertiary">{helperText}</span>
      )}
    </div>
  )
})

Select.displayName = 'Select'
