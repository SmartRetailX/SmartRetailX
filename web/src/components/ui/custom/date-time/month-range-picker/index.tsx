import { IconCalendarWeekFilled, IconCheck } from '@tabler/icons-react';
import { format, isAfter, isBefore, isFuture, startOfMonth } from 'date-fns';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import useDateRangeStore, { useDateRange } from '@/store/date-range.store';

import MonthRangePicker, { type MonthRange } from './month-picker';

export interface MonthRangePickerDialogProps {
  store?: boolean; // If true, uses store functions to set date range
  /** Click handler for applying the updates from MonthRangePicker. */
  onUpdate?: (values: { range: MonthRange }) => void;
  /** Option for locale */
  locale?: string;
  /** Show preset buttons */
  showPresets?: boolean;
  /** Custom class name */
  className?: string;
  /** Minimum selectable date */
  minDate?: Date | null;
  /** Maximum selectable date */
  maxDate?: Date | null;
  /** Custom presets to add to the default presets */
  customPresets?: Preset[];
}

const formatMonth = (date: Date): string => {
  return format(date, 'MMM yyyy');
};

export interface Preset {
  name: string;
  label: string;
  action: (setLocalRange: React.Dispatch<React.SetStateAction<MonthRange>>) => void;
}

/** The MonthRangePickerDialog component for selecting month ranges */
export const MonthRangePickerDialog: FC<MonthRangePickerDialogProps> = ({
  store = false,
  onUpdate,
  showPresets = true,
  className,
  minDate,
  maxDate,
  customPresets = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined);

  // Get store functions and current date range
  const storeFunctions = useDateRangeStore();
  const globalDateRange = useDateRange();

  // Use global date range as local range
  const [localRange, setLocalRange] = useState<MonthRange>({
    from: store ? globalDateRange.from : undefined,
    to: store ? globalDateRange.to : undefined,
  });

  // Refs to store the values when the picker is opened
  const openedRangeRef = useRef<MonthRange | undefined>(undefined);
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false,
  );

  // Update local range when global date range changes (from store presets)
  useEffect(() => {
    if (store) {
      setLocalRange({
        from: globalDateRange.from,
        to: globalDateRange.to,
      });
    }
  }, [globalDateRange, store]);

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Helper functions to handle min/max date constraints
  const clampToAllowed = (date: Date): Date => {
    const month = startOfMonth(date);
    const minMonth = minDate ? startOfMonth(minDate) : undefined;
    const maxMonth = maxDate ? startOfMonth(maxDate) : undefined;

    if (minMonth && isBefore(month, minMonth)) return minMonth;
    if (maxMonth && isAfter(month, maxMonth)) return maxMonth;
    return month;
  };

  const isMonthDisabled = (date: Date): boolean => {
    const month = startOfMonth(date);
    const minMonth = minDate ? startOfMonth(minDate) : undefined;
    const maxMonth = maxDate ? startOfMonth(maxDate) : undefined;

    return (
      isFuture(month) ||
      (minMonth ? isBefore(month, minMonth) : false) ||
      (maxMonth ? isAfter(month, maxMonth) : false)
    );
  };

  const clampRange = (range: MonthRange): MonthRange => {
    if (!range.from) return range;

    const clampedFrom = clampToAllowed(range.from);
    const clampedTo = range.to ? clampToAllowed(range.to) : undefined;

    // If both dates are disabled, return empty range
    if (isMonthDisabled(range.from) && (!range.to || isMonthDisabled(range.to))) {
      return { from: undefined, to: undefined };
    }

    return { from: clampedFrom, to: clampedTo };
  };

  // Define presets for month ranges using store functions
  const PRESETS: Preset[] = useMemo(() => {
    const basePresets = [
      {
        name: 'lastMonth',
        label: 'Last Month',
        action: (setLocalRangeCb: React.Dispatch<React.SetStateAction<MonthRange>>) => {
          const now = new Date();
          // Set to 15th day of previous month to avoid timezone issues
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
          const range = clampRange({ from: lastMonth, to: lastMonth });
          if (store) {
            storeFunctions.setLastMonth();
          } else {
            setLocalRangeCb(range);
          }
        },
      },
      {
        name: 'last3Months',
        label: 'Last 3 Months',
        action: (setLocalRangeCb: React.Dispatch<React.SetStateAction<MonthRange>>) => {
          const now = new Date();
          // Set to 15th day of month to avoid timezone issues
          const from = new Date(now.getFullYear(), now.getMonth() - 3, 15);
          const to = new Date(now.getFullYear(), now.getMonth(), 15);
          const range = clampRange({ from, to });
          if (store) {
            storeFunctions.setLastMonths(3);
          } else {
            setLocalRangeCb(range);
          }
        },
      },
      {
        name: 'last6Months',
        label: 'Last 6 Months',
        action: (setLocalRangeCb: React.Dispatch<React.SetStateAction<MonthRange>>) => {
          const now = new Date();
          // Set to 15th day of month to avoid timezone issues
          const from = new Date(now.getFullYear(), now.getMonth() - 6, 15);
          const to = new Date(now.getFullYear(), now.getMonth(), 15);
          const range = clampRange({ from, to });
          if (store) {
            storeFunctions.setLastMonths(6);
          } else {
            setLocalRangeCb(range);
          }
        },
      },
      {
        name: 'last12Months',
        label: 'Last 12 Months',
        action: (setLocalRangeCb: React.Dispatch<React.SetStateAction<MonthRange>>) => {
          const now = new Date();
          // Set to 15th day of month to avoid timezone issues
          const from = new Date(now.getFullYear(), now.getMonth() - 12, 15);
          const to = new Date(now.getFullYear(), now.getMonth(), 15);
          const range = clampRange({ from, to });
          if (store) {
            storeFunctions.setLastMonths(12);
          } else {
            setLocalRangeCb(range);
          }
        },
      },
    ];
    return [...customPresets, ...basePresets];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, storeFunctions, customPresets, minDate, maxDate]);

  const setPreset = (presetName: string): void => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (preset) {
      preset.action(setLocalRange); // This will update the local range
      setSelectedPreset(presetName);
    }
  };

  // Helper function to check if two month ranges are equal
  const areRangesEqual = (a?: MonthRange, b?: MonthRange): boolean => {
    if (!a || !b) return a === b;

    // Helper function to compare just year and month
    const isSameYearAndMonth = (
      date1: Date | null | undefined,
      date2: Date | null | undefined,
    ): boolean => {
      if (!date1 || !date2) return false;
      return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
    };

    return isSameYearAndMonth(a.from, b.from) && isSameYearAndMonth(a.to, b.to);
  };

  // Update openedRangeRef only when dialog opens
  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = { ...localRange };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen

  const resetValues = (): void => {
    setLocalRange(openedRangeRef.current || { from: globalDateRange.from, to: globalDateRange.to });
    setSelectedPreset(undefined);
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

  const handleUpdate = () => {
    setIsOpen(false);
    if (!areRangesEqual(localRange, openedRangeRef.current)) {
      if (store) {
        // Update the global store with the new range
        storeFunctions.setDateRange({
          from: localRange.from ?? undefined,
          to: localRange.to ?? undefined,
        });
      }
      setSelectedPreset(undefined);
      onUpdate?.({ range: localRange });
    }
  };

  const getDisplayText = (): React.ReactNode => {
    if (!localRange.from) return <IconCalendarWeekFilled className='h-4 w-4' />;

    if (!localRange.to) {
      return formatMonth(localRange.from);
    }

    // Compare only year and month, ignoring day and time
    const isSameYearAndMonth = (date1: Date, date2: Date): boolean => {
      return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
    };

    if (isSameYearAndMonth(localRange.from, localRange.to)) {
      return formatMonth(localRange.from);
    }

    return `${formatMonth(localRange.from)} - ${formatMonth(localRange.to)}`;
  };

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
        <Button
          variant='outline'
          className={cn(
            'h-8 text-xs font-medium text-muted-foreground',
            className,
            !localRange.from && 'w-8',
          )}
          // size={'icon'}
          title='Select Month Range'
        >
          <div className='text-right'>
            <div className='text-xs font-medium text-muted-foreground'>
              <div>{getDisplayText()}</div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent
        className='w-auto min-w-[500px] max-w-[95vw] max-h-[90vh] p-0 overflow-hidden'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className='p-4 pb-0'>
          <DialogTitle>Select Month Range</DialogTitle>
        </DialogHeader>

        <div className='p-4 pb-0 max-w-[90vw] overflow-auto'>
          <div className='flex gap-4 w-fit'>
            <div className='flex flex-col'>
              {isSmallScreen && showPresets && (
                <div className='w-[280px] mx-auto mb-4'>
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

              <MonthRangePicker
                currentRange={localRange}
                onRangeChange={setLocalRange}
                minDate={minDate}
                maxDate={maxDate}
              />
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

MonthRangePickerDialog.displayName = 'MonthRangePickerDialog';
