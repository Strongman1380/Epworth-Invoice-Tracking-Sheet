# Encryption Quick Start Guide

## What's New?

Your intake form now has **built-in encryption** to protect sensitive personal health information!

## How to Use

### Step 1: Enter Your Passphrase
When you open the form, you'll see a prompt asking for a passphrase:
- **Create a strong passphrase** (12+ characters recommended)
- Include numbers, symbols, uppercase and lowercase letters
- Example: `Healthcare2024!Secure`

### Step 2: Fill Out the Form Normally
- Type your information as usual
- The form will **automatically encrypt** sensitive fields
- Everything appears normal on your screen

### Step 3: View Your Summary
- Your summary automatically **decrypts** the data for viewing
- Only you can see it (passphrase is never sent anywhere)

### Step 4: Print or Export
- Click "Print / Save PDF" to save a secure copy
- Click "Email Summary" to download a text file
- Both include your decrypted data

## Important Security Notes

### ✅ Keep Your Passphrase Safe
- **Write it down** in a secure location (password manager recommended)
- **Don't share** your passphrase with anyone
- **Don't forget** it - encrypted data cannot be recovered without it

### ✅ This Form is Private
- Data stays in your browser only
- Nothing is sent to servers
- Close the browser to clear data

### ✅ Best Practices
- Use a **strong, unique passphrase**
- **Print or save** your summary before closing
- Never leave the form unattended
- Use on a **secure, personal device**

## What Gets Encrypted?

These sensitive fields are automatically encrypted:
- ✅ Names and dates of birth
- ✅ Phone numbers and email addresses
- ✅ Home addresses
- ✅ Insurance information
- ✅ Provider contact details
- ✅ Emergency contact information

## Encryption Details

| Aspect | Details |
|--------|---------|
| **Method** | XSalsa20-Poly1305 (military-grade) |
| **Key Derivation** | PBKDF2 with 100,000 iterations |
| **Library** | TweetNaCl.js (audited & trusted) |
| **Passphrase** | Never stored or transmitted |
| **Data Location** | Your browser only |

## Visual Indicators

### ✅ Encryption Active (Green)
```
🔐 Encryption Active: Your sensitive information is being encrypted
```
- Your data is protected
- Passphrase was accepted

### ⚠️ No Encryption (Yellow)
```
⚠ No Encryption: Your data will be stored unencrypted
```
- You didn't enter a passphrase
- **Refresh the page and enter a passphrase**

### ⚠️ Encryption Failed (Yellow)
```
⚠ Encryption Failed: Your data will be stored unencrypted
```
- Browser doesn't support encryption
- Try a different browser

## Troubleshooting

### "I forgot my passphrase"
Unfortunately, encrypted data **cannot** be recovered without the passphrase.
- Click "Clear All" to start fresh
- Create a new passphrase this time
- **Save it somewhere safe!**

### "Data looks encrypted in the form"
- This is normal for display only
- Your data shows as plain text while editing
- Stored data is encrypted

### "Print/Export shows my real data"
- This is correct and expected
- The exported file is **decrypted** for your use
- Keep it in a safe location

## Security Levels

### 🟢 Very Secure
- 16+ character passphrase
- Mix of all character types
- Unique passphrase (not used elsewhere)

### 🟡 Secure
- 12-15 character passphrase
- Mix of numbers and letters
- Reasonably unique

### 🔴 Not Secure
- Passphrase < 12 characters
- Dictionary words only
- Common phrases or dates

## What This Protects From

✅ **Protects:**
- Data in browser memory
- Data visible in developer tools
- Unauthorized local access
- Basic snooping

❌ **Does NOT Protect From:**
- Weak or compromised passphrases
- Malware on your computer
- Screen recording/sharing
- Keyloggers
- Screenshot sharing

## Before You Close

**Remember:** This form does NOT save data to a server!

Before closing or refreshing:
1. ✅ Print or save a PDF copy
2. ✅ Download the email summary
3. ✅ Note your passphrase somewhere safe
4. ✅ Verify your data is complete

## Need Help?

**Passphrase Tips:**
- Use memorable phrases like "MyDogAte7Tacos!"
- Combine unrelated words
- Add numbers in the middle
- Include at least one symbol

**Exporting Your Data:**
- "Print / Save PDF" - Best for records
- "Email Summary" - Download as text file
- Both include your decrypted information

**Browser Compatibility:**
- Chrome, Firefox, Safari, Edge (recent versions)
- Most smartphones supported
- Requires JavaScript enabled

---

**Remember:** Keep your passphrase safe! No one, not even the form creators, can recover your data without it.
