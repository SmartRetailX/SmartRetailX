import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { type FC, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { DateInput } from './date-input';

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DateRangePickerProps {
  /** The current date range */
  dateRange: DateRange;
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange }) => void;
  /** Option for locale */
  locale?: string;
  /** Show preset buttons */
  showPresets?: boolean;
  /** Custom class name */
  className?: string;
}

const formatDate = (date: Date, locale: string = 'en-us'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface Preset {
  name: string;
  label: string;
  action: () => void;
}

/** The DateRangePicker component for standalone date range selection */
export const DateRangePicker: FC<DateRangePickerProps> = ({
  dateRange,
  onUpdate,
  locale = 'en-US',
  showPresets = true,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Local state for the picker
  const [localRange, setLocalRange] = useState<DateRange>(dateRange);
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined);

  // Refs to store the values when the picker is opened
  const openedRangeRef = useRef<DateRange | undefined>(undefined);

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false,
  );

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update local state when dateRange prop changes
  useEffect(() => {
    setLocalRange(dateRange);
  }, [dateRange]);

  // Helper functions for preset calculations
  const setLastMonths = (months: number) => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    setLocalRange({ from, to });
  };

  const setSpecificYear = (year: number) => {
    const from = new Date(year, 0, 1); // January 1st
    const to = new Date(year, 11, 31); // December 31st
    setLocalRange({ from, to });
  };

  // Define presets with local actions
  const currentYear = new Date().getFullYear();
  const PRESETS: Preset[] = [
    { name: 'last3months', label: 'Last 3 Months', action: () => setLastMonths(3) },
    { name: 'last6months', label: 'Last 6 Months', action: () => setLastMonths(6) },
    { name: 'last12months', label: 'Last 12 Months', action: () => setLastMonths(12) },
    {
      name: `${currentYear - 1}`,
      label: `${currentYear - 1}`,
      action: () => setSpecificYear(currentYear - 1),
    },
    {
      name: `${currentYear - 2}`,
      label: `${currentYear - 2}`,
      action: () => setSpecificYear(currentYear - 2),
    },
  ];

  const setPreset = (presetName: string): void => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (preset) {
      preset.action();
      setSelectedPreset(presetName);
    }
  };

  const resetValues = (): void => {
    setLocalRange(openedRangeRef.current || dateRange);
  };

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }) => (
    <Button
      className={cn('justify-start text-xs h-8 px-2', isSelected && 'pointer-events-none')}
      variant='ghost'
      size='sm'
      onClick={() => setPreset(preset)}
    >
      <>
        <span className={cn('pr-1 opacity-0', isSelected && 'opacity-70')}>
          <IconCheck width={14} height={14} />
        </span>
        {label}
      </>
    </Button>
  );

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b;
    return a.from?.getTime() === b.from?.getTime() && a.to?.getTime() === b.to?.getTime();
  };

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = dateRange;
      setLocalRange(dateRange);
    }
  }, [isOpen, dateRange]);

  const handleUpdate = () => {
    setIsOpen(false);
    if (!areRangesEqual(localRange, openedRangeRef.current)) {
      onUpdate?.({ range: localRange });
    }
  };

  // Convert DateRange to Calendar-compatible format
  const calendarSelected =
    localRange.from && localRange.to
      ? {
          from: localRange.from,
          to: localRange.to,
        }
      : undefined;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues();
        }
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button size={'lg'} variant='outline' className={className}>
          <div className='text-right'>
            <div className='py-1'>
              <div>
                {localRange.from ? formatDate(localRange.from, locale) : 'Select date'}
                {localRange.to && localRange.to !== localRange.from
                  ? ` - ${formatDate(localRange.to, locale)}`
                  : ''}
              </div>
            </div>
          </div>
          <div className='pl-1 opacity-60 -mr-2 scale-125'>
            {isOpen ? <IconChevronUp width={24} /> : <IconChevronDown width={24} />}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent
        className='w-auto min-w-[670px] max-w-[95vw] max-h-[90vh] p-0 overflow-hidden'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className='p-4 pb-0'>
          <DialogTitle>Select Date Range</DialogTitle>
        </DialogHeader>

        <div className='p-4 pb-0 max-w-[90vw] overflow-auto'>
          <div className='flex gap-4 w-fit'>
            <div className='flex flex-col'>
              <div className='flex flex-col lg:flex-row gap-2 px-1 justify-end items-center lg:items-start pb-4 lg:pb-0'>
                <div className='flex flex-col gap-2'>
                  <div className='flex gap-2'>
                    <DateInput
                      value={localRange.from}
                      onChange={(date: Date) => {
                        const toDate =
                          localRange.to == null || date > localRange.to ? date : localRange.to;
                        setLocalRange((prevRange) => ({
                          ...prevRange,
                          from: date,
                          to: toDate,
                        }));
                      }}
                    />
                    <div className='py-1'>-</div>
                    <DateInput
                      value={localRange.to}
                      onChange={(date: Date) => {
                        const fromDate =
                          localRange.from && date < localRange.from ? date : localRange.from;
                        setLocalRange((prevRange) => ({
                          ...prevRange,
                          from: fromDate,
                          to: date,
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {isSmallScreen && showPresets && (
                <div className='w-[180px] mx-auto mb-2'>
                  <div className='text-xs font-medium text-muted-foreground mb-2'>Quick Select</div>
                  <div className='grid grid-cols-2 gap-1 max-h-32 overflow-y-auto'>
                    {PRESETS.map((presetItem: Preset, index: number) => (
                      <Button
                        key={`${presetItem.name}-${index}`}
                        className={cn(
                          'justify-start text-xs h-7 px-2 text-left',
                          selectedPreset === presetItem.name && 'pointer-events-none bg-accent',
                        )}
                        variant='ghost'
                        size='sm'
                        onClick={() => setPreset(presetItem.name)}
                      >
                        <span
                          className={cn(
                            'pr-1 opacity-0',
                            selectedPreset === presetItem.name && 'opacity-70',
                          )}
                        >
                          <IconCheck width={12} height={12} />
                        </span>
                        {presetItem.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className='overflow-auto max-h-[50vh]'>
                <Calendar
                  mode='range'
                  onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                    if (value?.from != null) {
                      setLocalRange({ from: value.from, to: value?.to });
                    }
                  }}
                  selected={calendarSelected}
                  numberOfMonths={isSmallScreen ? 1 : 2}
                  defaultMonth={
                    new Date(new Date().setMonth(new Date().getMonth() - (isSmallScreen ? 0 : 1)))
                  }
                  className='rounded-md border-0'
                />
              </div>
            </div>

            {!isSmallScreen && showPresets && (
              <div className='flex flex-col gap-1 pl-4 border-l min-w-[140px] max-w-[140px]'>
                <div className='text-xs font-medium text-muted-foreground mb-1'>Quick Select</div>
                {PRESETS.map((presetItem: Preset, index: number) => (
                  <PresetButton
                    key={`${presetItem.name}-${index}`}
                    preset={presetItem.name}
                    label={presetItem.label}
                    isSelected={selectedPreset === presetItem.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='flex justify-end gap-2 p-4 border-t'>
          <Button
            onClick={() => {
              setIsOpen(false);
              resetValues();
            }}
            variant='ghost'
            size='sm'
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} size='sm'>
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

DateRangePicker.displayName = 'DateRangePicker';
