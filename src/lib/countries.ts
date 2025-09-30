
export type Country = {
  name: string;
  dialCode: string;
  isoCode: string;
  flag: string;
};

// Comprehensive list of countries with their dial codes and flags
export const countries: Country[] = [
  { name: 'United States', dialCode: '1', isoCode: 'US', flag: '🇺🇸' },
  { name: 'Canada', dialCode: '1', isoCode: 'CA', flag: '🇨🇦' },
  { name: 'United Kingdom', dialCode: '44', isoCode: 'GB', flag: '🇬🇧' },
  { name: 'Australia', dialCode: '61', isoCode: 'AU', flag: '🇦🇺' },
  { name: 'Germany', dialCode: '49', isoCode: 'DE', flag: '🇩🇪' },
  { name: 'France', dialCode: '33', isoCode: 'FR', flag: '🇫🇷' },
  { name: 'Italy', dialCode: '39', isoCode: 'IT', flag: '🇮🇹' },
  { name: 'Spain', dialCode: '34', isoCode: 'ES', flag: '🇪🇸' },
  { name: 'Netherlands', dialCode: '31', isoCode: 'NL', flag: '🇳🇱' },
  { name: 'Belgium', dialCode: '32', isoCode: 'BE', flag: '🇧🇪' },
  { name: 'Switzerland', dialCode: '41', isoCode: 'CH', flag: '🇨🇭' },
  { name: 'Austria', dialCode: '43', isoCode: 'AT', flag: '🇦🇹' },
  { name: 'Sweden', dialCode: '46', isoCode: 'SE', flag: '🇸🇪' },
  { name: 'Norway', dialCode: '47', isoCode: 'NO', flag: '🇳🇴' },
  { name: 'Denmark', dialCode: '45', isoCode: 'DK', flag: '🇩🇰' },
  { name: 'Finland', dialCode: '358', isoCode: 'FI', flag: '🇫🇮' },
  { name: 'Poland', dialCode: '48', isoCode: 'PL', flag: '🇵🇱' },
  { name: 'Czech Republic', dialCode: '420', isoCode: 'CZ', flag: '🇨🇿' },
  { name: 'Hungary', dialCode: '36', isoCode: 'HU', flag: '🇭🇺' },
  { name: 'Portugal', dialCode: '351', isoCode: 'PT', flag: '🇵🇹' },
  { name: 'Greece', dialCode: '30', isoCode: 'GR', flag: '🇬🇷' },
  { name: 'Ireland', dialCode: '353', isoCode: 'IE', flag: '🇮🇪' },
  { name: 'Japan', dialCode: '81', isoCode: 'JP', flag: '🇯🇵' },
  { name: 'South Korea', dialCode: '82', isoCode: 'KR', flag: '🇰🇷' },
  { name: 'China', dialCode: '86', isoCode: 'CN', flag: '🇨🇳' },
  { name: 'India', dialCode: '91', isoCode: 'IN', flag: '🇮🇳' },
  { name: 'Pakistan', dialCode: '92', isoCode: 'PK', flag: '🇵🇰' },
  { name: 'Bangladesh', dialCode: '880', isoCode: 'BD', flag: '🇧🇩' },
  { name: 'Sri Lanka', dialCode: '94', isoCode: 'LK', flag: '🇱🇰' },
  { name: 'Singapore', dialCode: '65', isoCode: 'SG', flag: '🇸🇬' },
  { name: 'Malaysia', dialCode: '60', isoCode: 'MY', flag: '🇲🇾' },
  { name: 'Thailand', dialCode: '66', isoCode: 'TH', flag: '🇹🇭' },
  { name: 'Philippines', dialCode: '63', isoCode: 'PH', flag: '🇵🇭' },
  { name: 'Indonesia', dialCode: '62', isoCode: 'ID', flag: '🇮🇩' },
  { name: 'Vietnam', dialCode: '84', isoCode: 'VN', flag: '🇻🇳' },
  { name: 'Mexico', dialCode: '52', isoCode: 'MX', flag: '🇲🇽' },
  { name: 'Brazil', dialCode: '55', isoCode: 'BR', flag: '🇧🇷' },
  { name: 'Argentina', dialCode: '54', isoCode: 'AR', flag: '🇦🇷' },
  { name: 'Chile', dialCode: '56', isoCode: 'CL', flag: '🇨🇱' },
  { name: 'Colombia', dialCode: '57', isoCode: 'CO', flag: '🇨🇴' },
  { name: 'Peru', dialCode: '51', isoCode: 'PE', flag: '🇵🇪' },
  { name: 'South Africa', dialCode: '27', isoCode: 'ZA', flag: '🇿🇦' },
  { name: 'Nigeria', dialCode: '234', isoCode: 'NG', flag: '🇳🇬' },
  { name: 'Egypt', dialCode: '20', isoCode: 'EG', flag: '🇪🇬' },
  { name: 'Kenya', dialCode: '254', isoCode: 'KE', flag: '🇰🇪' },
  { name: 'Morocco', dialCode: '212', isoCode: 'MA', flag: '🇲🇦' },
  { name: 'Israel', dialCode: '972', isoCode: 'IL', flag: '🇮🇱' },
  { name: 'Turkey', dialCode: '90', isoCode: 'TR', flag: '🇹🇷' },
  { name: 'Saudi Arabia', dialCode: '966', isoCode: 'SA', flag: '🇸🇦' },
  { name: 'United Arab Emirates', dialCode: '971', isoCode: 'AE', flag: '🇦🇪' },
  { name: 'Russia', dialCode: '7', isoCode: 'RU', flag: '🇷🇺' },
  { name: 'Ukraine', dialCode: '380', isoCode: 'UA', flag: '🇺🇦' },
  { name: 'New Zealand', dialCode: '64', isoCode: 'NZ', flag: '🇳🇿' },
];

// Helper function to get country by ISO code
export const getCountryByIsoCode = (isoCode: string): Country | undefined => {
  return countries.find(country => country.isoCode === isoCode);
};

// Helper function to get country by dial code
export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(country => country.dialCode === dialCode);
};

// Helper function to format phone number for display
export const formatPhoneForDisplay = (e164Number: string, country?: Country): string => {
  if (!e164Number) return '';
  
  if (country) {
    const nationalNumber = e164Number.replace(`+${country.dialCode}`, '');
    return `+${country.dialCode} ${nationalNumber}`;
  }
  
  return e164Number;
};
