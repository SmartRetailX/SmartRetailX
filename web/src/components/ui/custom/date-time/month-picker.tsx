import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Month = {
  number: number;
  name: string;
};

const MONTHS: Month[][] = [
  [
    { number: 0, name: 'Jan' },
    { number: 1, name: 'Feb' },
    { number: 2, name: 'Mar' },
    { number: 3, name: 'Apr' },
  ],
  [
    { number: 4, name: 'May' },
    { number: 5, name: 'Jun' },
    { number: 6, name: 'Jul' },
    { number: 7, name: 'Aug' },
  ],
  [
    { number: 8, name: 'Sep' },
    { number: 9, name: 'Oct' },
    { number: 10, name: 'Nov' },
    { number: 11, name: 'Dec' },
  ],
];

type SelectedMonth = {
  year: number;
  month: number;
};

type MonthCalProps = {
  selectedMonths?: SelectedMonth[];
  onMonthSelect?: (months: SelectedMonth[]) => void;
  onYearForward?: () => void;
  onYearBackward?: () => void;
  callbacks?: {
    yearLabel?: (year: number) => string;
    monthLabel?: (month: Month) => string;
  };
  variant?: {
    calendar?: {
      main?: ButtonVariant;
      selected?: ButtonVariant;
    };
    chevrons?: ButtonVariant;
  };
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
};

type ButtonVariant =
  | 'default'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'destructive'
  | 'secondary'
  | null
  | undefined;

export function MonthPicker({
  onMonthSelect,
  selectedMonths,
  minDate,
  maxDate,
  disabledDates,
  callbacks,
  onYearBackward,
  onYearForward,
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & MonthCalProps) {
  return (
    <div className={cn('min-w-50 w-70 p-3', className)} {...props}>
      <div className='flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0'>
        <div className='space-y-4 w-full'>
          <MonthCal
            onMonthSelect={onMonthSelect}
            callbacks={callbacks}
            selectedMonths={selectedMonths}
            onYearBackward={onYearBackward}
            onYearForward={onYearForward}
            variant={variant}
            minDate={minDate}
            maxDate={maxDate}
            disabledDates={disabledDates}
          ></MonthCal>
        </div>
      </div>
    </div>
  );
}

function MonthCal({
  selectedMonths = [],
  onMonthSelect,
  callbacks,
  variant,
  minDate,
  maxDate,
  disabledDates,
  onYearBackward,
  onYearForward,
}: MonthCalProps & { selectedMonths?: { year: number; month: number }[] }) {
  const isSelected = (month: number, year: number) => {
    if (!selectedMonths || selectedMonths.length === 0) return false;

    // Check if month is explicitly selected
    const isExplicitlySelected = selectedMonths.some((m) => m.month === month && m.year === year);
    if (isExplicitlySelected) return true;

    // If we have 2 selected months, check if current month is in range
    if (selectedMonths.length === 2) {
      const sorted = [...selectedMonths].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const start = sorted[0];
      const end = sorted[1];

      // Convert to comparable values (year * 12 + month)
      const currentValue = year * 12 + month;
      const startValue = start.year * 12 + start.month;
      const endValue = end.year * 12 + end.month;

      return currentValue >= startValue && currentValue <= endValue;
    }

    return false;
  };

  const toggleMonth = (month: number, year: number) => {
    if (!onMonthSelect) return;

    const exists = selectedMonths?.some((m) => m.month === month && m.year === year);

    const updated = exists
      ? selectedMonths!.filter((m) => !(m.month === month && m.year === year))
      : [...(selectedMonths ?? []), { month, year }];

    onMonthSelect(updated);
  };

  const [menuYear, setMenuYear] = React.useState<number>(new Date().getFullYear());

  if (minDate && maxDate && minDate > maxDate) minDate = maxDate;

  const disabledDatesMapped = disabledDates?.map((d) => {
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <>
      <div className='flex justify-center pt-1 relative items-center'>
        <div className='text-sm font-medium'>
          {callbacks?.yearLabel ? callbacks?.yearLabel(menuYear) : menuYear}
        </div>
        <div className='space-x-1 flex items-center'>
          <button
            onClick={() => {
              setMenuYear(menuYear - 1);
              if (onYearBackward) onYearBackward();
            }}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? 'outline' }),
              'inline-flex items-center justify-center h-7 w-7 p-0 absolute left-1',
            )}
          >
            <ChevronLeft className='opacity-50 h-4 w-4' />
          </button>
          <button
            onClick={() => {
              setMenuYear(menuYear + 1);
              if (onYearForward) onYearForward();
            }}
            className={cn(
              buttonVariants({ variant: variant?.chevrons ?? 'outline' }),
              'inline-flex items-center justify-center h-7 w-7 p-0 absolute right-1',
            )}
          >
            <ChevronRight className='opacity-50 h-4 w-4' />
          </button>
        </div>
      </div>
      <table className='w-full border-collapse space-y-1'>
        <tbody>
          {MONTHS.map((monthRow, a) => {
            return (
              <tr key={'row-' + a} className='flex w-full mt-2'>
                {monthRow.map((m) => {
                  return (
                    <td
                      key={m.number}
                      className='h-10 w-1/4 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20'
                    >
                      <button
                        onClick={() => toggleMonth(m.number, menuYear)}
                        disabled={
                          (maxDate
                            ? menuYear > maxDate?.getFullYear() ||
                              (menuYear == maxDate?.getFullYear() && m.number > maxDate.getMonth())
                            : false) ||
                          (minDate
                            ? menuYear < minDate?.getFullYear() ||
                              (menuYear == minDate?.getFullYear() && m.number < minDate.getMonth())
                            : false) ||
                          (disabledDatesMapped
                            ? disabledDatesMapped?.some(
                                (d) => d.year == menuYear && d.month == m.number,
                              )
                            : false)
                        }
                        className={cn(
                          buttonVariants({
                            variant: isSelected(m.number, menuYear)
                              ? (variant?.calendar?.selected ?? 'default')
                              : (variant?.calendar?.main ?? 'ghost'),
                          }),
                          'h-full w-full p-0 font-normal aria-selected:opacity-100',
                        )}
                      >
                        {callbacks?.monthLabel ? callbacks.monthLabel(m) : m.name}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
