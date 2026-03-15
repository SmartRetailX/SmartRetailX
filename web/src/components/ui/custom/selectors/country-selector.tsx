import { useMemo } from 'react';
import { Control, FieldPath } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries } from '@/constants/countries';

interface CountrySelectorProps<T extends Record<string, unknown>> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export function CountrySelector<T extends Record<string, unknown>>({
  control,
  name,
  label = 'Country',
  placeholder = 'Select country',
  required = false,
  id,
}: CountrySelectorProps<T>) {
  const countriesList = useMemo(() => {
    return countries
      .map(([code, country]) => ({
        code,
        name: country.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {!required && ' (Optional)'}
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value as string}>
            <FormControl>
              <SelectTrigger id={id}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className='max-h-[300px] overflow-y-auto'>
              {countriesList.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
