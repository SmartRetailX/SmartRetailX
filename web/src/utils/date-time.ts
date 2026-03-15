import { format } from 'date-fns';

export const formatDate = (
  date: Date | string | undefined | null,
  formatString: string = 'dd/MM/yyyy',
): string => {
  if (!date || date === null) return 'N/A';

  // Check if date is a string and convert it to a Date object
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return format(date, formatString);
};

export const formatDateTime = (date: Date | string, formatString: string = 'dd/MM/yyyy HH:mm') => {
  // Check if date is a string and convert it to a Date object
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return format(date, formatString);
};
