import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { countries } from '@/constants/countries';
import { cn } from '@/lib/utils';

interface CurrencyMultiSelectProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

// Extract unique currencies from countries data
const extractCurrencies = () => {
  const currencySet = new Set<string>();
  const currencyInfo: Record<string, { name: string; countries: string[] }> = {};

  const currencyNames: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    KRW: 'South Korean Won',
    BRL: 'Brazilian Real',
    MXN: 'Mexican Peso',
    ZAR: 'South African Rand',
    RUB: 'Russian Ruble',
    SGD: 'Singapore Dollar',
    HKD: 'Hong Kong Dollar',
    NOK: 'Norwegian Krone',
    SEK: 'Swedish Krona',
    DKK: 'Danish Krone',
    NZD: 'New Zealand Dollar',
    THB: 'Thai Baht',
    MYR: 'Malaysian Ringgit',
    IDR: 'Indonesian Rupiah',
    PHP: 'Philippine Peso',
    PLN: 'Polish Złoty',
    AED: 'UAE Dirham',
    SAR: 'Saudi Riyal',
    EGP: 'Egyptian Pound',
    NGN: 'Nigerian Naira',
    KES: 'Kenyan Shilling',
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

export function CurrencyMultiSelect({
  selected,
  onChange,
  placeholder = 'Select currencies...',
}: CurrencyMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currencies = useMemo(() => extractCurrencies(), []);

  const filteredCurrencies = currencies.filter((currency) => {
    const query = searchQuery.toLowerCase();
    return (
      currency.name.toLowerCase().includes(query) ||
      currency.code.toLowerCase().includes(query) ||
      currency.countries.some((c) => c.toLowerCase().includes(query))
    );
  });

  const handleSelect = (currencyCode: string) => {
    const isSelected = selected.includes(currencyCode);
    if (isSelected) {
      onChange(selected.filter((code) => code !== currencyCode));
    } else {
      onChange([...selected, currencyCode]);
    }
  };

  const handleRemove = (currencyCode: string) => {
    onChange(selected.filter((code) => code !== currencyCode));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className='space-y-2'>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='w-full justify-between h-auto min-h-10'
          >
            <div className='flex flex-wrap gap-1 flex-1'>
              {selected.length === 0 ? (
                <span className='text-muted-foreground'>{placeholder}</span>
              ) : (
                <span className='text-sm'>
                  {selected.length} {selected.length === 1 ? 'currency' : 'currencies'} selected
                </span>
              )}
            </div>
            <IconChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-full p-0' align='start'>
          <Command>
            <CommandInput
              placeholder='Search currencies...'
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>No currencies found.</CommandEmpty>
            <ScrollArea className='h-[300px]'>
              <CommandList>
                <CommandGroup>
                  {filteredCurrencies.map((currency) => {
                    const isSelected = selected.includes(currency.code);
                    return (
                      <CommandItem
                        key={currency.code}
                        value={`${currency.code} ${currency.name}`}
                        onSelect={() => handleSelect(currency.code)}
                      >
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible',
                          )}
                        >
                          <IconCheck className='h-4 w-4' />
                        </div>
                        <div className='flex-1'>
                          <div className='font-medium'>
                            {currency.code} - {currency.name}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {currency.countries.slice(0, 3).join(', ')}
                            {currency.countries.length > 3 && ` +${currency.countries.length - 3}`}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected currencies display */}
      {selected.length > 0 && (
        <div className='flex flex-wrap gap-2 p-2 border rounded-md'>
          {selected.map((code) => {
            const currency = currencies.find((c) => c.code === code);
            return (
              <Badge key={code} variant='secondary' className='gap-1'>
                {code} - {currency?.name}
                <button
                  type='button'
                  onClick={() => handleRemove(code)}
                  className='ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2'
                >
                  <IconX className='h-3 w-3' />
                </button>
              </Badge>
            );
          })}
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleClearAll}
            className='h-6 px-2 text-xs'
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
