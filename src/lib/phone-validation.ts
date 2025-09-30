import { z } from 'zod';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

// International phone number validation schema
export const internationalPhoneSchema = z.string()
  .min(1, 'Phone number is required.')
  .refine((phone) => {
    try {
      // Basic format check first
      if (!phone.startsWith('+') || phone.length < 8) {
        return false;
      }
      
      // Use libphonenumber-js for validation
      const isValid = isValidPhoneNumber(phone);
      
      // If validation fails, check if it's a common test/placeholder number
      if (!isValid) {
        // Allow some common test patterns for development
        const testPatterns = [
          /^\+1555\d{7}$/,  // US 555 numbers
          /^\+1\d{3}555\d{4}$/, // US numbers with 555 exchange
        ];
        
        // In development/test environment, allow test numbers
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          return testPatterns.some(pattern => pattern.test(phone));
        }
      }
      
      return isValid;
    } catch (error) {
      console.error('Phone validation error:', error);
      return false;
    }
  }, {
    message: 'Please enter a valid phone number. Example: +1 (212) 555-1234 for US, +44 20 7946 0958 for UK.',
  });

// US-only phone number validation (for backward compatibility)
export const usPhoneSchema = z.string()
  .min(1, 'Phone number is required.')
  .refine((phone) => {
    // Phone should be in E164 format: +15551234567 (12 digits total for US/Canada)
    return phone.startsWith('+1') && phone.length === 12 && /^\+1\d{10}$/.test(phone);
  }, {
    message: 'Please enter a valid US phone number.',
  });

// Helper function to validate phone number
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  try {
    const isValid = isValidPhoneNumber(phone);
    if (!isValid) {
      return { isValid: false, error: 'Please enter a valid phone number.' };
    }
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Please enter a valid phone number.' };
  }
};

// Helper function to get phone number info
export const getPhoneNumberInfo = (phone: string) => {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (phoneNumber) {
      return {
        country: phoneNumber.country,
        nationalNumber: phoneNumber.nationalNumber,
        internationalFormat: phoneNumber.formatInternational(),
        nationalFormat: phoneNumber.formatNational(),
        e164Format: phoneNumber.format('E.164'),
        isValid: phoneNumber.isValid(),
      };
    }
  } catch (error) {
    console.error('Error parsing phone number:', error);
  }
  return null;
};

// Format phone number for display
export const formatPhoneNumber = (phone: string, format: 'international' | 'national' | 'e164' = 'national'): string => {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (phoneNumber) {
      switch (format) {
        case 'international':
          return phoneNumber.formatInternational();
        case 'national':
          return phoneNumber.formatNational();
        case 'e164':
          return phoneNumber.format('E.164');
        default:
          return phoneNumber.formatNational();
      }
    }
  } catch (error) {
    console.error('Error formatting phone number:', error);
  }
  return phone;
};
