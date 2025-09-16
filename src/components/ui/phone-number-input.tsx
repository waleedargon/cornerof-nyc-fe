'use client';

import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { cn } from '@/lib/utils';

import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

interface PhoneNumberInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  placeholder?: string;
  className?: string;
}

// Format US phone number: (555) 123-4567
const formatUSPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Extract digits and convert to E164 format
const toE164 = (formattedValue: string): string => {
  const digits = formattedValue.replace(/\D/g, '');
  return digits.length > 0 ? `+1${digits}` : '';
};

// Convert E164 back to display format
const fromE164 = (e164Value: string): string => {
  if (!e164Value) return '';
  const digits = e164Value.replace(/^\+1/, '').replace(/\D/g, '');
  return formatUSPhone(digits);
};

export function PhoneNumberInput<TFieldValues extends FieldValues>({ 
  name, 
  control, 
  label, 
  placeholder = "(555) 123-4567",
  className 
}: PhoneNumberInputProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const displayValue = fromE164(field.value || '');

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const inputValue = e.target.value;
          const formatted = formatUSPhone(inputValue);
          const e164Value = toE164(formatted);
          
          // Update display value
          e.target.value = formatted;
          // Update form value in E164 format
          field.onChange(e164Value);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          // Allow: backspace, delete, tab, escape, enter, arrows
          if ([8, 9, 27, 13, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
              // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
              (e.ctrlKey === true && [65, 67, 86, 88].indexOf(e.keyCode) !== -1)) {
            return;
          }
          // Only allow digits
          if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
          }
        };

        return (
          <FormItem className="space-y-0">
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <div className="relative">
                {/* US Flag and +1 indicator */}
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-sm text-muted-foreground">+1</span>
                </div>
                <input
                  type="tel"
                  className={cn(
                    "flex h-10 w-full rounded border border-black bg-white pl-16 pr-3 py-2 text-base leading-tight ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    className
                  )}
                  placeholder={placeholder}
                  defaultValue={displayValue}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  maxLength={14} // (555) 123-4567
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
