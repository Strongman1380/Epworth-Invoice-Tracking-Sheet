# Access Code Authentication Setup Guide

## Overview

The intake form now has a **two-layer security system**:

1. **Access Code Authentication** - Provider-issued code to verify the client has authorization
2. **Encryption Passphrase** - Client's personal encryption key to protect their data

## For Healthcare Providers

### Generating Access Codes

Access codes should be:
- **Unique** per client or per appointment
- **Memorable** but not guessable (avoid birthdates, simple sequences)
- **Distributed securely** via email, phone, or in-person only
- **Changed regularly** for security best practices

### Examples of Good Access Codes
- `LEMKE2024`
- `WEBER4CARE`
- `INTAKE-OCT24`
- `CLIENT-ABC123`

### Examples of Poor Access Codes
- `1234` (too simple)
- `PASSWORD` (too obvious)
- `ADMIN` (too common)
- `123456789` (sequential)

## Configuration

### Adding Access Codes to the Form

1. Open `index.html` in a text editor
2. Find the `VALID_ACCESS_CODES` array (around line 1721)
3. Add or modify codes in the array

**Current Location:**
```javascript
const VALID_ACCESS_CODES = [
  "LEMKE2024",        // Default example code
  "WEBER2024",        // Alternative example
  // Add more codes as needed, one per line
  // "YOUR_CODE_HERE"
];
```

### Example: Adding New Codes

```javascript
const VALID_ACCESS_CODES = [
  "LEMKE2024",
  "WEBER2024",
  "SMITH-NEW-001",
  "JONES-INTAKE-2024",
  "BROWN-ASSESSMENT"
];
```

### Multi-Provider Setup

If you have multiple providers, use provider-specific codes:

```javascript
const VALID_ACCESS_CODES = [
  // Dr. Lemke's codes
  "LEMKE-INTAKE-01",
  "LEMKE-INTAKE-02",
  // Dr. Weber's codes
  "WEBER-INTAKE-01",
  "WEBER-INTAKE-02",
  // Shared codes (for group sessions)
  "GROUP-THERAPY-101"
];
```

## User Experience Flow

### Step 1: Access Code Screen
```
┌─────────────────────────────────────┐
│  🔐 Access Code Required            │
├─────────────────────────────────────┤
│  Please enter your access code      │
│  provided by your healthcare        │
│  provider.                          │
│                                     │
│  [Enter access code input field]    │
│                                     │
│  [Exit] [Verify Access Code]        │
└─────────────────────────────────────┘
```

### Step 2: Encryption Setup Screen
```
┌─────────────────────────────────────┐
│  🔐 Set Encryption Passphrase       │
├─────────────────────────────────────┤
│  Create a strong passphrase to      │
│  protect your data.                 │
│                                     │
│  [Create Passphrase]                │
│  [Confirm Passphrase]               │
│                                     │
│  [Exit] [Create & Continue]         │
└─────────────────────────────────────┘
```

### Step 3: Privacy Acknowledgment
```
┌─────────────────────────────────────┐
│  Before we begin                    │
├─────────────────────────────────────┤
│  This form runs entirely in your    │
│  browser. We don't store anything.  │
│                                     │
│  ☐ I understand and consent         │
│                                     │
│  [Exit] [I understand & continue]   │
└─────────────────────────────────────┘
```

### Step 4: Form Begins
```
✅ Access Verified & Encryption Active
Your data is protected

[Intake Form Begins Here]
```

## Security Features

### Access Code Security
✅ **What It Does:**
- Verifies client has authorization from provider
- Prevents unauthorized form access
- Case-insensitive for user convenience
- Error message shows attempts failed

❌ **What It Doesn't Do:**
- Doesn't encrypt data (that's the encryption passphrase)
- Doesn't create login accounts
- Doesn't track who accessed the form
- Code is visible in HTML (not a secret!)

### Encryption Passphrase Security
✅ **What It Does:**
- Encrypts all sensitive data with XSalsa20-Poly1305
- Only the user knows their passphrase
- Data cannot be decrypted without correct passphrase
- Passphrases must match before encryption enables

❌ **What It Doesn't Do:**
- Doesn't authenticate identity (that's the access code)
- Doesn't create accounts or logins
- Cannot be recovered if forgotten

## Best Practices

### For Providers

1. **Generate Unique Codes**
   - Create a new code per client or session
   - Use a code generator if you have many clients

2. **Distribute Securely**
   - Email directly to client (not shared messages)
   - Or provide in-person during appointment confirmation
   - Include instructions on how to use

3. **Document Codes**
   - Keep a secure list of issued codes
   - Document when codes were issued
   - Mark codes as used/retired after a period

4. **Example Distribution Template**
   ```
   Dear Client,

   Your intake form access code is: LEMKE2024

   To complete your intake form:
   1. Go to [intake form URL]
   2. Enter the access code above
   3. Create a secure passphrase
   4. Complete the form at your own pace
   5. Print or download before closing

   If you have questions, call [phone]

   Best regards,
   [Provider Name]
   ```

5. **Rotate Codes Periodically**
   - Change codes monthly or quarterly
   - Retire old codes from the system
   - Notify clients of new codes

### For Clients

1. **Save Your Access Code**
   - Write it down or save it temporarily
   - Don't share it with anyone else
   - You only need it once per session

2. **Remember Your Encryption Passphrase**
   - This is your personal encryption key
   - Write it down in a secure location
   - Use a password manager to store it
   - Don't forget it - it cannot be recovered

3. **Complete in One Session**
   - The form doesn't save progress to a server
   - Closing or refreshing loses all data
   - Print/download a copy before leaving
   - You'll need a new access code for each session

## Troubleshooting

### "Invalid access code" Error

**If client gets this error:**

1. Check they entered it correctly (it's case-insensitive)
2. Verify the code in your `VALID_ACCESS_CODES` list
3. Ensure the code hasn't been retired or changed
4. Provide a new code if the current one has expired

**Solution:**
```javascript
// Make sure code exists in your list
const VALID_ACCESS_CODES = [
  "CORRECT-CODE-HERE",  // ✅ Add the right code
  "WRONG-CODE"          // ❌ Remove typos
];
```

### Code Expiration

If you want codes to expire after a certain date:

```javascript
const VALID_ACCESS_CODES = {
  "LEMKE2024": {
    active: true,
    expiresAt: "2024-12-31"
  },
  "WEBER2024": {
    active: false,  // Retired code
    expiresAt: "2024-06-30"
  }
};
```

Then update the verification logic to check expiration dates.

### Too Many Failed Attempts

To prevent brute force attacks, you could add:

```javascript
let accessCodeAttempts = 0;
const MAX_ATTEMPTS = 5;

const verifyAccessCode = () => {
  if (accessCodeAttempts >= MAX_ATTEMPTS) {
    accessCodeError.textContent = "Too many failed attempts. Please contact your provider.";
    accessCodeInput.disabled = true;
    accessCodeSubmitBtn.disabled = true;
    return;
  }

  accessCodeAttempts++;
  // ... rest of verification logic
};
```

## Advanced: API Integration

For larger practices, you can integrate with an API:

```javascript
const verifyAccessCode = async () => {
  const code = accessCodeInput.value.trim();

  try {
    const response = await fetch('/api/verify-access-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (response.ok) {
      // Code verified by server
      isAccessCodeAuthenticated = true;
      // Continue to encryption modal
    } else {
      // Code invalid or expired
      accessCodeError.textContent = "Invalid or expired code.";
    }
  } catch (error) {
    console.error('Verification failed:', error);
    accessCodeError.textContent = "Unable to verify code. Please try again.";
  }
};
```

## Security Audit Checklist

- [ ] All access codes are unique and unpredictable
- [ ] Codes are not dictionary words or birthdates
- [ ] Codes are distributed only through secure channels
- [ ] Old/expired codes are removed from the system
- [ ] No access code is used for multiple clients
- [ ] Audit log tracks who received which codes
- [ ] Codes are rotated regularly (monthly/quarterly)
- [ ] Clients are instructed to create strong encryption passphrases
- [ ] Form privacy policy explains data handling
- [ ] No codes are hardcoded in version control

## Support

For issues or questions:

1. Verify the code exists in `VALID_ACCESS_CODES`
2. Check the code isn't retired or expired
3. Ensure client has correct code from provider
4. Review the user experience flow above
5. Contact support if issues persist

---

**Last Updated**: November 2024
**Version**: 2.0 (Two-Factor Authentication)
