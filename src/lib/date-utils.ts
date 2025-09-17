/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth in ISO format (YYYY-MM-DD) or Date object
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date();
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validate if user is at least 18 years old
 * @param dateOfBirth - Date of birth in ISO format (YYYY-MM-DD) or Date object
 * @returns True if user is 18 or older
 */
export function isAtLeast18(dateOfBirth: string | Date): boolean {
  return calculateAge(dateOfBirth) >= 18;
}

/**
 * Format date of birth for display
 * @param dateOfBirth - Date of birth in ISO format (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDateOfBirth(dateOfBirth: string): string {
  const date = new Date(dateOfBirth);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get maximum date for date input (18 years ago from today)
 * @returns Date string in YYYY-MM-DD format
 */
export function getMaxBirthDate(): string {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return maxDate.toISOString().split('T')[0];
}

/**
 * Get minimum date for date input (reasonable maximum age, e.g., 100 years ago)
 * @returns Date string in YYYY-MM-DD format
 */
export function getMinBirthDate(): string {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  return minDate.toISOString().split('T')[0];
}
