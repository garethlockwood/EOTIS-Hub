
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Currency } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
  };
  return symbols[currency];
}

export function getContrastingTextColor(hexColor: string): 'black' | 'white' {
    if (!hexColor) return 'black';

    const color = hexColor.charAt(0) === '#' ? hexColor.substring(1, 7) : hexColor;
    if (color.length !== 6) return 'black';

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    // Formula from http://www.w3.org/TR/AERT#color-contrast
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    return (yiq >= 150) ? 'black' : 'white';
}
