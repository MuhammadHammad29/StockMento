/**
 * Utility Functions for StockMento
 * 
 * Common utility functions used throughout the application.
 * Includes className merging for Tailwind CSS and other helpers.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine and merge Tailwind CSS classes with proper conflict resolution
 * 
 * @param inputs - Array of class values to merge
 * @returns Merged className string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
