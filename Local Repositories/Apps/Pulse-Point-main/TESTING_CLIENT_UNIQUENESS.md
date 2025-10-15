# Testing HIPAA Client Uniqueness

## Quick Test Guide

### Test 1: Duplicate Name + Date of Birth
1. Add a client:
   - First Name: John
   - Last Name: Smith
   - Date of Birth: 1980-01-15
   - Email: john1@example.com

2. Try to add another client with:
   - First Name: John
   - Last Name: Smith
   - Date of Birth: 1980-01-15
   - Email: john2@example.com (different email!)

**Expected Result:** ❌ Error message: "Duplicate Client Detected - A client named John Smith with the same name and date of birth already exists"

### Test 2: Duplicate Email
1. Add a client:
   - First Name: Jane
   - Last Name: Doe
   - Email: jane@example.com

2. Try to add another client with:
   - First Name: Sarah
   - Last Name: Johnson
   - Email: jane@example.com (same email!)

**Expected Result:** ❌ Error message: "Duplicate Client Detected - A client with the same email already exists"

### Test 3: Duplicate Phone Number
1. Add a client:
   - First Name: Mike
   - Last Name: Wilson
   - Phone: 555-1234

2. Try to add another client with:
   - First Name: Tom
   - Last Name: Brown
   - Phone: 555-1234 (same phone!)

**Expected Result:** ❌ Error message: "Duplicate Client Detected - A client with the same phone number already exists"

### Test 4: Valid Unique Clients
Add multiple clients with completely different information:

**Client 1:**
- Name: Alice Cooper
- DOB: 1990-05-10
- Email: alice@example.com
- Phone: 555-0001

**Client 2:**
- Name: Bob Martinez
- DOB: 1985-03-22
- Email: bob@example.com
- Phone: 555-0002

**Expected Result:** ✅ Both clients added successfully

### Test 5: Data Isolation (Multi-Browser Test)
1. Open app in Chrome (Browser Session 1)
2. Add a client: John Doe
3. Open app in Firefox/Safari (Browser Session 2)
4. Try to add another client: John Doe

**Expected Result:** ✅ Both clients can be added because they belong to different mock users (different browser sessions = different user_ids)

## Visual Indicators

### Success Message
```
✓ Client Added Successfully
[Name] has been securely added to your practice. 
All data is encrypted and HIPAA-compliant.
```

### Duplicate Error Message
```
❌ Duplicate Client Detected
A client named [Name] with the same [field] already exists 
in your practice. This prevents HIPAA violations and data mixing.
```

### Constraint Error Message
```
❌ Cannot Add Client
A client with this information already exists in your practice. 
Please check your client list or use different contact information.
```

## Verifying in Database

If you have access to Supabase Dashboard:

1. Go to Table Editor → clients
2. Check the `user_id` column - each client should have the same user_id for your session
3. Try to manually insert a duplicate - should fail with constraint violation

## Common Issues

### Issue: "User not authenticated"
- **Cause:** Mock user not properly set up
- **Fix:** Check localStorage for `mock_user_id`, or clear localStorage and refresh

### Issue: Duplicate added successfully (shouldn't happen!)
- **Cause:** Migration not applied
- **Fix:** Run `supabase db push` to apply constraints

### Issue: Can see other users' clients
- **Cause:** RLS policies not working or missing user_id filter
- **Fix:** Check database RLS policies are enabled

## Troubleshooting Commands

### Check localStorage
```javascript
// In browser console
console.log(localStorage.getItem('mock_user_id'));
```

### Reset mock user
```javascript
// In browser console
localStorage.removeItem('mock_user_id');
location.reload();
```

### Check current user
```javascript
// In browser console (with React DevTools)
// Find AuthContext and check the user.id value
```
