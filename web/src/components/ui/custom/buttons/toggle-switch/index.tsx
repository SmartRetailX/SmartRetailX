import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function ToggleSwitch({
  label,
  onToggle,
  checked = false,
}: {
  label?: string;
  onToggle?: (enabled: boolean) => void;
  checked?: boolean;
}) {
  return (
    <div className='flex items-center space-x-2'>
      <Switch id='airplane-mode' onCheckedChange={onToggle} checked={checked} />
      {label && <Label htmlFor='airplane-mode'>{label}</Label>}
    </div>
  );
}
