# International Phone Number Troubleshooting Guide

## Common Issues and Solutions

### 1. **"Invalid Phone Number" Error with US Numbers**

**Problem**: Numbers like `+1 (555) 123-4567` show as invalid.

**Cause**: The `555` area code and exchange are reserved for fictional use and are not valid real phone numbers.

**Solutions**:
- **For Testing**: Use valid area codes like:
  - `+1 (212) 555-1234` (NYC)
  - `+1 (415) 555-1234` (San Francisco)
  - `+1 (310) 555-1234` (Los Angeles)
- **For Production**: Users should enter their real phone numbers

### 2. **International Numbers Not Validating**

**Problem**: Valid-looking international numbers are rejected.

**Common Issues**:
- Missing country code (must start with `+`)
- Incorrect country code
- Number too short/long for the country

**Examples of Valid Numbers**:
```
US: +1 (212) 555-1234
UK: +44 20 7946 0958
Germany: +49 30 12345678
India: +91 98765 43210
Japan: +81 3-1234-5678
France: +33 1 23 45 67 89
```

### 3. **Country Not Auto-Detecting**

**Problem**: When entering a number, the country doesn't change automatically.

**Solution**: This is expected behavior. Users should:
1. Select the country first from the dropdown
2. Then enter their phone number
3. Or enter the full international format with country code

### 4. **Formatting Issues**

**Problem**: Numbers don't format correctly as you type.

**Causes**:
- Invalid characters in input
- Number doesn't match country's format
- Incomplete number entry

**Solutions**:
- Only enter digits, spaces, parentheses, and dashes
- Complete the full number for proper formatting
- Select the correct country first

### 5. **Development vs Production Validation**

**Development Mode**: Allows some test numbers (like 555 numbers) for easier testing.

**Production Mode**: Strict validation using real phone number patterns.

## Testing Different Countries

### Valid Test Numbers by Country:

| Country | Valid Example | Format |
|---------|---------------|---------|
| US | +1 (212) 555-1234 | +1 (XXX) XXX-XXXX |
| Canada | +1 (416) 555-1234 | +1 (XXX) XXX-XXXX |
| UK | +44 20 7946 0958 | +44 XX XXXX XXXX |
| Germany | +49 30 12345678 | +49 XX XXXXXXXX |
| France | +33 1 23 45 67 89 | +33 X XX XX XX XX |
| India | +91 98765 43210 | +91 XXXXX XXXXX |
| Japan | +81 3-1234-5678 | +81 X-XXXX-XXXX |
| Australia | +61 2 1234 5678 | +61 X XXXX XXXX |

## Implementation Details

### Validation Library
- Uses `libphonenumber-js` (Google's libphonenumber port)
- Validates against real phone number patterns
- Supports 200+ countries and territories

### Storage Format
- All numbers stored in E.164 format (e.g., `+12125551234`)
- Consistent international standard
- Easy to work with APIs and services

### Display Format
- Shows numbers in national format for better UX
- Automatically formats as user types
- Maintains international compatibility

## Debugging Steps

1. **Check the Console**: Look for validation errors in browser console
2. **Verify Country Selection**: Ensure correct country is selected
3. **Test with Known Valid Numbers**: Use the examples above
4. **Check Network Tab**: Look for any API errors during submission
5. **Validate E.164 Format**: Ensure numbers are stored correctly

## Need Help?

If you're still experiencing issues:
1. Check which specific numbers are failing
2. Verify the country selection matches the number
3. Test with the valid examples provided above
4. Check browser console for detailed error messages
