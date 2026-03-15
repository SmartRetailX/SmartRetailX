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

interface CurrencySelectorProps<T extends Record<string, unknown>> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

// Extract unique currencies from countries data
const extractCurrenciesFromCountries = () => {
  const currencySet = new Set<string>();
  const currencyInfo: Record<string, { name: string; countries: string[] }> = {};

  // Common currency names mapping
  const currencyNames: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    SEK: 'Swedish Krona',
    NZD: 'New Zealand Dollar',
    MXN: 'Mexican Peso',
    SGD: 'Singapore Dollar',
    HKD: 'Hong Kong Dollar',
    NOK: 'Norwegian Krone',
    ZAR: 'South African Rand',
    TRY: 'Turkish Lira',
    BRL: 'Brazilian Real',
    INR: 'Indian Rupee',
    KRW: 'South Korean Won',
    PLN: 'Polish Zloty',
    ILS: 'Israeli Shekel',
    DKK: 'Danish Krone',
    CZK: 'Czech Koruna',
    HUF: 'Hungarian Forint',
    RUB: 'Russian Ruble',
    THB: 'Thai Baht',
    MYR: 'Malaysian Ringgit',
    PHP: 'Philippine Peso',
    IDR: 'Indonesian Rupiah',
    CLP: 'Chilean Peso',
    AED: 'UAE Dirham',
    SAR: 'Saudi Riyal',
    EGP: 'Egyptian Pound',
    NGN: 'Nigerian Naira',
    KES: 'Kenyan Shilling',
    GHS: 'Ghanaian Cedi',
    MAD: 'Moroccan Dirham',
    TND: 'Tunisian Dinar',
    ETB: 'Ethiopian Birr',
    UGX: 'Ugandan Shilling',
    LKR: 'Sri Lankan Rupee',
  };

  countries.forEach(([, country]) => {
    country.currency.forEach((currencyCode) => {
      currencySet.add(currencyCode);
      if (!currencyInfo[currencyCode]) {
        currencyInfo[currencyCode] = {
          name: currencyNames[currencyCode] || currencyCode,
          countries: [],
        };
      }
      currencyInfo[currencyCode].countries.push(country.name);
    });
  });

  return Array.from(currencySet)
    .map((code) => ({
      code,
      name: currencyInfo[code].name,
      countries: currencyInfo[code].countries,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export function CurrencySelector<T extends Record<string, unknown>>({
  control,
  name,
  label = 'Currency',
  placeholder = 'Select currency',
  required = false,
  id,
}: CurrencySelectorProps<T>) {
  const currenciesList = useMemo(() => {
    return extractCurrenciesFromCountries();
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
              {currenciesList.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.name} ({currency.code})
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
