import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { useState } from 'react';

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

interface CountryMultiSelectProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function CountryMultiSelect({
  selected,
  onChange,
  placeholder = 'Select countries...',
}: CountryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = countries.filter(([code, country]) => {
    const query = searchQuery.toLowerCase();
    return (
      country.name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query) ||
      country.native.toLowerCase().includes(query)
    );
  });

  const handleSelect = (countryCode: string) => {
    const isSelected = selected.includes(countryCode);
    if (isSelected) {
      onChange(selected.filter((code) => code !== countryCode));
    } else {
      onChange([...selected, countryCode]);
    }
  };

  const handleRemove = (countryCode: string) => {
    onChange(selected.filter((code) => code !== countryCode));
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
                  {selected.length} {selected.length === 1 ? 'country' : 'countries'} selected
                </span>
              )}
            </div>
            <IconChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-full p-0' align='start'>
          <Command>
            <CommandInput
              placeholder='Search countries...'
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>No countries found.</CommandEmpty>
            <ScrollArea className='h-[300px]'>
              <CommandList>
                <CommandGroup>
                  {filteredCountries.map(([code, country]) => {
                    const isSelected = selected.includes(code);
                    return (
                      <CommandItem
                        key={code}
                        value={`${code} ${country.name}`}
                        onSelect={() => handleSelect(code)}
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
                            {code} - {country.name}
                          </div>
                          {country.native !== country.name && (
                            <div className='text-xs text-muted-foreground'>{country.native}</div>
                          )}
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

      {/* Selected countries display */}
      {selected.length > 0 && (
        <div className='flex flex-wrap gap-2 p-2 border rounded-md'>
          {selected.map((code) => {
            const country = countries.find(([c]) => c === code)?.[1];
            return (
              <Badge key={code} variant='secondary' className='gap-1'>
                {code} - {country?.name}
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
