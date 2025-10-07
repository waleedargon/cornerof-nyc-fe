'use client';

import React, { useState, useEffect } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { ChevronDown, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { countries, type Country, getCountryByIsoCode } from '@/lib/countries';

import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { Button } from '@/components/ui/button';

interface InternationalPhoneInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  placeholder?: string;
  className?: string;
  defaultCountry?: string; // ISO code like 'US', 'GB', etc.
}

export function InternationalPhoneInput<TFieldValues extends FieldValues>({ 
  name, 
  control, 
  label, 
  placeholder,
  className,
  defaultCountry = 'US'
}: InternationalPhoneInputProps<TFieldValues>) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    getCountryByIsoCode(defaultCountry) || countries[0]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter countries based on search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.isoCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format phone number for display
  const formatPhoneForDisplay = (value: string, country: Country): string => {
    if (!value) return '';
    
    try {
      // Remove any existing country code and format
      const cleanValue = value.replace(/^\+/, '').replace(/\D/g, '');
      
      // If the value already starts with the country code, use it as is
      if (cleanValue.startsWith(country.dialCode)) {
        const phoneNumber = parsePhoneNumber(`+${cleanValue}`);
        return phoneNumber ? phoneNumber.formatNational() : cleanValue;
      }
      
      // Otherwise, add the country code and format
      const fullNumber = `+${country.dialCode}${cleanValue}`;
      const phoneNumber = parsePhoneNumber(fullNumber);
      return phoneNumber ? phoneNumber.formatNational() : cleanValue;
    } catch (error) {
      return value;
    }
  };

  // Convert display format to E164
  const toE164 = (displayValue: string, country: Country): string => {
    if (!displayValue) return '';
    
    try {
      const cleanValue = displayValue.replace(/\D/g, '');
      
      // If already includes country code
      if (cleanValue.startsWith(country.dialCode)) {
        return `+${cleanValue}`;
      }
      
      // Add country code
      const fullNumber = `+${country.dialCode}${cleanValue}`;
      const phoneNumber = parsePhoneNumber(fullNumber);
      return phoneNumber ? phoneNumber.format('E.164') : fullNumber;
    } catch (error) {
      return displayValue;
    }
  };

  // Extract national number from E164
  const fromE164 = (e164Value: string): string => {
    if (!e164Value) return '';
    
    try {
      const phoneNumber = parsePhoneNumber(e164Value);
      if (phoneNumber) {
        // Update selected country based on the phone number
        const countryFromNumber = countries.find(c => c.isoCode === phoneNumber.country);
        if (countryFromNumber && countryFromNumber.isoCode !== selectedCountry.isoCode) {
          setSelectedCountry(countryFromNumber);
        }
        return phoneNumber.formatNational();
      }
      
      // Fallback: remove country code manually
      const withoutPlus = e164Value.replace(/^\+/, '');
      const matchingCountry = countries.find(c => withoutPlus.startsWith(c.dialCode));
      if (matchingCountry) {
        const nationalNumber = withoutPlus.replace(matchingCountry.dialCode, '');
        if (matchingCountry.isoCode !== selectedCountry.isoCode) {
          setSelectedCountry(matchingCountry);
        }
        return nationalNumber;
      }
      
      return withoutPlus;
    } catch (error) {
      return e164Value;
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const displayValue = fromE164(field.value || '');

        const handleCountryChange = (country: Country) => {
          setSelectedCountry(country);
          setIsOpen(false);
          setSearchQuery('');
          
          // Convert current number to new country format
          if (field.value) {
            const currentNumber = fromE164(field.value);
            const newE164 = toE164(currentNumber, country);
            field.onChange(newE164);
          }
        };

        const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const inputValue = e.target.value;
          
          try {
            const e164Value = toE164(inputValue, selectedCountry);
            
            // Update form value in E164 format
            field.onChange(e164Value);
          } catch (error) {
            console.error('Error processing phone number:', error);
            // Still update the field to show user input
            field.onChange(inputValue);
          }
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          // Allow: backspace, delete, tab, escape, enter, arrows, space, parentheses, dash
          if ([8, 9, 27, 13, 37, 38, 39, 40, 46, 32, 189, 109, 173].indexOf(e.keyCode) !== -1 ||
              // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
              (e.ctrlKey === true && [65, 67, 86, 88].indexOf(e.keyCode) !== -1)) {
            return;
          }
          // Allow digits and some formatting characters
          if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
              (e.keyCode < 96 || e.keyCode > 105) &&
              ![189, 109, 173, 57, 48].includes(e.keyCode)) { // dash, parentheses
            e.preventDefault();
          }
        };

        return (
          <FormItem className="space-y-0">
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <div className="relative flex">
                {/* Country Selector */}
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isOpen}
                      className="h-10 rounded-r-none border-r-0 px-2 sm:px-3 hover:bg-gray-50 flex-shrink-0 min-w-0"
                    >
                      <span className="text-sm sm:text-lg mr-1 sm:mr-2">{selectedCountry.flag}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">+{selectedCountry.dialCode}</span>
                      <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 sm:w-80 p-0">
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search countries..."
                          className="w-full pl-8 pr-2 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {filteredCountries.map((country) => (
                        <button
                          key={country.isoCode}
                          className={cn(
                            "w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                            selectedCountry.isoCode === country.isoCode && "bg-gray-100"
                          )}
                          onClick={() => handleCountryChange(country)}
                        >
                          <span className="text-lg mr-3">{country.flag}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{country.name}</div>
                            <div className="text-xs text-muted-foreground">+{country.dialCode}</div>
                          </div>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No countries found
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Phone Number Input */}
                <input
                  type="tel"
                  className={cn(
                    "flex h-10 flex-1 rounded-l-none border border-black bg-white px-2 sm:px-3 py-2 text-sm sm:text-base leading-tight ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-0",
                    className
                  )}
                  placeholder={placeholder || (selectedCountry.isoCode === 'US' ? '(212) 555-1234' : 'Enter phone number')}
                  value={displayValue}
                  onChange={handlePhoneChange}
                  onKeyDown={handleKeyDown}
                  id={name}
                />
              </div>
            </FormControl>
            <FormMessage>
              {fieldState.error?.message}
            </FormMessage>
          </FormItem>
        );
      }}
    />
  );
}

// Validation helper function
export const validateInternationalPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  try {
    return isValidPhoneNumber(phone);
  } catch (error) {
    return false;
  }
};

// Get country from phone number
export const getCountryFromPhone = (phone: string): Country | undefined => {
  if (!phone) return undefined;
  
  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (phoneNumber && phoneNumber.country) {
      return getCountryByIsoCode(phoneNumber.country);
    }
  } catch (error) {
    // Fallback: try to match by dial code
    const cleanPhone = phone.replace(/^\+/, '');
    return countries.find(country => cleanPhone.startsWith(country.dialCode));
  }
  
  return undefined;
};
