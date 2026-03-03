import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AttributeChipProps {
  attr: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}

export function AttributeChip({ attr, selected, disabled, onClick }: AttributeChipProps) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-14 h-14 text-xl font-bold transition-all',
        selected && 'ring-2 ring-offset-2 ring-primary'
      )}
    >
      {attr}
    </Button>
  )
}
