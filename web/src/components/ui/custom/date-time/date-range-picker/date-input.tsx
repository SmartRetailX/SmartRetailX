import { addDays, addMonths, addYears, isValid, subDays, subMonths, subYears } from 'date-fns';
import React, { useEffect, useRef } from 'react';

interface DateInputProps {
  value?: Date;
  onChange: (date: Date) => void;
}

interface DateParts {
  day: number;
  month: number;
  year: number;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange }) => {
  const currentDate = value || new Date();

  const [date, setDate] = React.useState<DateParts>(() => ({
    day: currentDate.getDate(),
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  }));

  const monthRef = useRef<HTMLInputElement | null>(null);
  const dayRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const d = value || new Date();
    setDate({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }, [value]);

  const createDateFromParts = (parts: DateParts): Date => {
    return new Date(parts.year, parts.month - 1, parts.day);
  };

  const validateDate = (field: keyof DateParts, value: number): boolean => {
    if (
      (field === 'day' && (value < 1 || value > 31)) ||
      (field === 'month' && (value < 1 || value > 12)) ||
      (field === 'year' && (value < 1000 || value > 9999))
    ) {
      return false;
    }

    const newDate = { ...date, [field]: value };
    const testDate = createDateFromParts(newDate);

    // Use date-fns isValid to check if the date is valid
    return (
      isValid(testDate) &&
      testDate.getDate() === newDate.day &&
      testDate.getMonth() + 1 === newDate.month &&
      testDate.getFullYear() === newDate.year
    );
  };

  const handleInputChange =
    (field: keyof DateParts) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value ? Number(e.target.value) : '';
      const isValidValue = typeof newValue === 'number' && validateDate(field, newValue);

      const newDate = { ...date, [field]: newValue };
      setDate(newDate);

      if (isValidValue) {
        onChange(createDateFromParts(newDate));
      }
    };

  const initialDate = useRef<DateParts>(date);

  const handleBlur =
    (field: keyof DateParts) =>
    (e: React.FocusEvent<HTMLInputElement>): void => {
      if (!e.target.value) {
        setDate(initialDate.current);
        return;
      }

      const newValue = Number(e.target.value);
      const isValidValue = validateDate(field, newValue);

      if (!isValidValue) {
        setDate(initialDate.current);
      } else {
        initialDate.current = { ...date, [field]: newValue };
      }
    };

  const handleKeyDown = (field: keyof DateParts) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow command (or control) combinations
    if (e.metaKey || e.ctrlKey) {
      return;
    }

    // Prevent non-numeric characters, excluding allowed keys
    if (
      !/^[0-9]$/.test(e.key) &&
      ![
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Delete',
        'Tab',
        'Backspace',
        'Enter',
      ].includes(e.key)
    ) {
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentDateObj = createDateFromParts(date);
      let newDateObj: Date;

      if (field === 'day') {
        newDateObj = addDays(currentDateObj, 1);
      } else if (field === 'month') {
        newDateObj = addMonths(currentDateObj, 1);
      } else {
        newDateObj = addYears(currentDateObj, 1);
      }

      const newDate = {
        day: newDateObj.getDate(),
        month: newDateObj.getMonth() + 1,
        year: newDateObj.getFullYear(),
      };

      setDate(newDate);
      onChange(newDateObj);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentDateObj = createDateFromParts(date);
      let newDateObj: Date;

      if (field === 'day') {
        newDateObj = subDays(currentDateObj, 1);
      } else if (field === 'month') {
        newDateObj = subMonths(currentDateObj, 1);
      } else {
        newDateObj = subYears(currentDateObj, 1);
      }

      const newDate = {
        day: newDateObj.getDate(),
        month: newDateObj.getMonth() + 1,
        year: newDateObj.getFullYear(),
      };

      setDate(newDate);
      onChange(newDateObj);
    }

    // Navigation between fields
    if (e.key === 'ArrowRight') {
      if (
        e.currentTarget.selectionStart === e.currentTarget.value.length ||
        (e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === e.currentTarget.value.length)
      ) {
        e.preventDefault();
        if (field === 'month') dayRef.current?.focus();
        if (field === 'day') yearRef.current?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      if (
        e.currentTarget.selectionStart === 0 ||
        (e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === e.currentTarget.value.length)
      ) {
        e.preventDefault();
        if (field === 'day') monthRef.current?.focus();
        if (field === 'year') dayRef.current?.focus();
      }
    }
  };

  return (
    <div className='flex border rounded-lg items-center text-sm px-1'>
      <input
        type='text'
        ref={monthRef}
        max={12}
        maxLength={2}
        value={date.month.toString()}
        onChange={handleInputChange('month')}
        onKeyDown={handleKeyDown('month')}
        onFocus={(e) => {
          if (window.innerWidth > 1024) {
            e.target.select();
          }
        }}
        onBlur={handleBlur('month')}
        className='p-0 outline-none w-6 border-none text-center'
        placeholder='M'
      />
      <span className='opacity-20 -mx-px'>/</span>
      <input
        type='text'
        ref={dayRef}
        max={31}
        maxLength={2}
        value={date.day.toString()}
        onChange={handleInputChange('day')}
        onKeyDown={handleKeyDown('day')}
        onFocus={(e) => {
          if (window.innerWidth > 1024) {
            e.target.select();
          }
        }}
        onBlur={handleBlur('day')}
        className='p-0 outline-none w-7 border-none text-center'
        placeholder='D'
      />
      <span className='opacity-20 -mx-px'>/</span>
      <input
        type='text'
        ref={yearRef}
        max={9999}
        maxLength={4}
        value={date.year.toString()}
        onChange={handleInputChange('year')}
        onKeyDown={handleKeyDown('year')}
        onFocus={(e) => {
          if (window.innerWidth > 1024) {
            e.target.select();
          }
        }}
        onBlur={handleBlur('year')}
        className='p-0 outline-none w-12 border-none text-center'
        placeholder='YYYY'
      />
    </div>
  );
};

DateInput.displayName = 'DateInput';

export { DateInput };
