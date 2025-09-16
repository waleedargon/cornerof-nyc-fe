
export type Country = {
  name: string;
  dialCode: string;
  isoCode: string;
};

// Static list of countries to avoid import issues with external libraries.
export const countries: Country[] = [
    { name: 'United States', dialCode: '1', isoCode: 'US' },
    { name: 'Canada', dialCode: '1', isoCode: 'CA' },
    { name: 'Mexico', dialCode: '52', isoCode: 'MX' },
    { name: 'United Kingdom', dialCode: '44', isoCode: 'GB' },
    { name: 'Pakistan', dialCode: '92', isoCode: 'PK' },
    // Add other frequently used countries here
];
