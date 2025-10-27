import { LucideIcon } from 'lucide-react'
import React from 'react'
import { Button, type ButtonProps } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: ButtonProps['variant']
  }
  illustration?: string // Optional SVG illustration
  iconSize?: number
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  iconSize = 80,
  className = ''
}) => {
  return (
    <div className={`text-center p-12 ${className}`}>
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-6 mx-auto max-w-xs">
          <img src={illustration} alt={title} className="w-full h-auto opacity-60" />
        </div>
      ) : (
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary opacity-20 blur-3xl animate-pulse" />
          <Icon size={iconSize} className="text-text-muted mx-auto relative z-10 animate-float" />
        </div>
      )}

      {/* Title and Description */}
      <h3 className="text-2xl font-semibold text-text-primary mb-3">{title}</h3>
      <p className="text-text-secondary text-base max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action Button */}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState 