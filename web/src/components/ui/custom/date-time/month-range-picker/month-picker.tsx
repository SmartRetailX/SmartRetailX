import {
  add,
  eachMonthOfInterval,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isEqual,
  isFuture,
  parse,
  startOfMonth,
  startOfToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getStartOfCurrentMonth() {
  return startOfMonth(startOfToday());
}

export interface MonthRange {
  from?: Date | null;
  to?: Date | null;
}

interface MonthRangePickerProps {
  currentRange: MonthRange;
  onRangeChange: (newRange: MonthRange) => void;

  // Allowed selection range
  minDate?: Date | null;
  maxDate?: Date | null;
}

export default function MonthRangePicker({
  currentRange,
  onRangeChange,
  minDate,
  maxDate,
}: MonthRangePickerProps) {
  const [currentYear, setCurrentYear] = React.useState(
    format(currentRange.from || new Date(), 'yyyy'),
  );
  const firstDayCurrentYear = parse(currentYear, 'yyyy', new Date());

  const months = eachMonthOfInterval({
    start: firstDayCurrentYear,
    end: endOfYear(firstDayCurrentYear),
  });

  function previousYear() {
    const firstDayNextYear = add(firstDayCurrentYear, { years: -1 });
    setCurrentYear(format(firstDayNextYear, 'yyyy'));
  }

  function nextYear() {
    const firstDayNextYear = add(firstDayCurrentYear, { years: 1 });
    setCurrentYear(format(firstDayNextYear, 'yyyy'));
  }

  // Helper function to check if a month is in the selected range
  const isMonthInRange = (month: Date): boolean => {
    if (!currentRange.from) return false;
    if (!currentRange.to) return isSameYearAndMonth(month, currentRange.from);

    return (
      (isSameYearAndMonth(month, currentRange.from) || isAfter(month, currentRange.from)) &&
      (isSameYearAndMonth(month, currentRange.to) || isBefore(month, currentRange.to))
    );
  };

  // Helper function to check if a month is the start of the range
  const isRangeStart = (month: Date): boolean => {
    return currentRange.from ? isSameYearAndMonth(month, currentRange.from) : false;
  };

  // Helper function to check if a month is the end of the range
  const isRangeEnd = (month: Date): boolean => {
    return currentRange.to ? isSameYearAndMonth(month, currentRange.to) : false;
  };

  // Helper function to compare just year and month, ignoring day and time
  const isSameYearAndMonth = (
    date1: Date | null | undefined,
    date2: Date | null | undefined,
  ): boolean => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
  };

  // Allowed range checkers
  const minMonth = minDate ? startOfMonth(minDate) : undefined;
  const maxMonth = maxDate ? startOfMonth(maxDate) : undefined;

  const isMonthDisabled = (month: Date) => {
    return (
      isFuture(month) ||
      (minMonth ? isBefore(month, minMonth) : false) ||
      (maxMonth ? isAfter(month, maxMonth) : false)
    );
  };

  // clamp a month to allowed bounds (returns startOfMonth)
  const clampToAllowed = (month: Date): Date => {
    const m = startOfMonth(month);
    if (minMonth && isBefore(m, minMonth)) return minMonth;
    if (maxMonth && isAfter(m, maxMonth)) return maxMonth;
    return m;
  };

  // Handle month selection for range picking (clamped + disabled-aware)
  const handleMonthClick = (month: Date): void => {
    // normalize to mid-month then to the start of the month to avoid timezone issues
    const clickedMid = new Date(month.getFullYear(), month.getMonth(), 15);
    const clickedMonth = startOfMonth(clickedMid);

    // ignore clicks on disabled months (future/outside bounds)
    if (isMonthDisabled(clickedMonth)) return;

    // If starting a new range
    if (!currentRange.from || (currentRange.from && currentRange.to)) {
      const clampedFrom = clampToAllowed(clickedMonth);
      onRangeChange({ from: clampedFrom, to: undefined });
      return;
    }

    // Completing the range: clamp both the existing from and the clicked month
    const fromMonth = startOfMonth(currentRange.from);
    const clampedFrom = clampToAllowed(fromMonth);
    const clampedClicked = clampToAllowed(clickedMonth);

    if (isAfter(clampedClicked, clampedFrom)) {
      onRangeChange({ from: clampedFrom, to: clampedClicked });
    } else if (isBefore(clampedClicked, clampedFrom)) {
      onRangeChange({ from: clampedClicked, to: clampedFrom });
    } else {
      // same month clicked -> single-month selection
      onRangeChange({ from: clampedFrom, to: clampedFrom });
    }
  };

  return (
    <div className='p-3'>
      <div className='flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0'>
        <div className='space-y-4'>
          <div className='relative flex items-center justify-center pt-1'>
            <div
              className='text-sm font-medium'
              aria-live='polite'
              role='presentation'
              id='month-picker'
            >
              {format(firstDayCurrentYear, 'yyyy')}
            </div>
            <div className='flex items-center space-x-1'>
              <button
                name='previous-year'
                aria-label='Go to previous year'
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                  'absolute left-1',
                )}
                type='button'
                onClick={previousYear}
              >
                <ChevronLeft className='h-4 w-4' />
              </button>
              <button
                name='next-year'
                aria-label='Go to next year'
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                  'absolute right-1 disabled:bg-slate-100',
                )}
                type='button'
                disabled={isFuture(add(firstDayCurrentYear, { years: 1 }))}
                onClick={nextYear}
              >
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
          <div className='grid w-full grid-cols-3 gap-2' role='grid' aria-labelledby='month-picker'>
            {months.map((month) => {
              const inRange = isMonthInRange(month);
              const rangeStart = isRangeStart(month);
              const rangeEnd = isRangeEnd(month);
              const isCurrentMonth = isEqual(month, getStartOfCurrentMonth());
              const disabled = isMonthDisabled(month);

              return (
                <div
                  key={month.toString()}
                  className={cn(
                    'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
                    inRange && !rangeStart && !rangeEnd && 'bg-slate-100 dark:bg-slate-800',
                    inRange &&
                      rangeStart &&
                      !rangeEnd &&
                      'rounded-l-md bg-slate-100 dark:bg-slate-800',
                    inRange &&
                      rangeEnd &&
                      !rangeStart &&
                      'rounded-r-md bg-slate-100 dark:bg-slate-800',
                    inRange && rangeStart && rangeEnd && 'rounded-md',
                  )}
                  role='presentation'
                >
                  <button
                    name='month'
                    className={cn(
                      'inline-flex h-9 w-16 items-center justify-center rounded-md p-0 text-sm font-normal ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-selected:opacity-100 dark:ring-offset-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-800',
                      // Range start or end styling
                      (rangeStart || rangeEnd) &&
                        'bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50 dark:hover:text-slate-900 dark:focus:bg-slate-50 dark:focus:text-slate-900',
                      // Current month styling (when not in range)
                      !inRange &&
                        isCurrentMonth &&
                        'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
                      // In range but not start/end
                      inRange &&
                        !rangeStart &&
                        !rangeEnd &&
                        'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
                      disabled && 'pointer-events-none opacity-50',
                    )}
                    disabled={disabled}
                    role='gridcell'
                    tabIndex={-1}
                    type='button'
                    onClick={() => handleMonthClick(month)}
                  >
                    <time dateTime={format(month, 'yyyy-MM-dd')}>{format(month, 'MMM')}</time>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
