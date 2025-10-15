# AI Interpretation Troubleshooting Guide

## Issue: "AI interpretation could not be generated" appears on printouts

### Why This Happens
The AI interpretation feature requires:
1. ✅ **Code**: Already implemented in your app
2. ⏳ **OpenAI API Key**: Needs to be set in Supabase
3. ⏳ **Edge Function**: Needs to be deployed to Supabase

### Quick Fix Options

---

## Option 1: Deploy AI (5 minutes) - **RECOMMENDED**

### Step 1: Get OpenAI API Key (2 min)
1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. **Copy the key immediately** (you won't see it again!)
5. Cost: ~$0.001-0.002 per interpretation (~$1-2 per 1000 assessments)

### Step 2: Deploy to Supabase (3 min)

#### Quick Method (Using Script):
```bash
cd "/Users/brandonhinrichs/Local Repositories/Apps/Pulse-Point-main"
./deploy-ai-interpretation.sh
```

#### Manual Method:
```bash
# 1. Login to Supabase
npx supabase login

# 2. Link your project
npx supabase link --project-ref pvmqzydaaaeelbhsejjh

# 3. Set your OpenAI API key
npx supabase secrets set OPENAI_API_KEY=sk-your-actual-key-here

# 4. Deploy the AI function
npx supabase functions deploy ai-assessment-interpretation

# 5. Verify it worked
npx supabase functions list
```

### Step 3: Test It!
1. Open your app: http://localhost:8081
2. Go to **Settings** page
3. You should see a green "AI Interpretation Ready" message
4. Complete an assessment and print - AI will now work!

---

## Option 2: Test Without AI (Temporary)

If you want to test the print functionality without AI for now:

### Method A: Disable AI via Environment Variable
Add to your `.env` file:
```bash
VITE_ENABLE_AI_INTERPRETATION=false
```

Then restart your dev server:
```bash
npm run dev
```

### Method B: Use Standard Print
The app will automatically fall back to standard printing (without AI) if the Edge Function isn't available. Your printouts will still work, they just won't include the AI-powered clinical interpretation section.

---

## Checking AI Status

### In the App
1. Go to **Settings** page
2. Look for the AI status card at the top
3. **Green card** = AI is ready
4. **Orange card** = AI needs setup (click copy buttons for commands)

### Via Command Line
```bash
# Check if function is deployed
npx supabase functions list

# View function logs
npx supabase functions logs ai-assessment-interpretation

# Test the function
curl -X POST https://pvmqzydaaaeelbhsejjh.supabase.co/functions/v1/ai-assessment-interpretation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"assessmentType":"ACE","score":5,"answers":{},"questions":[]}'
```

---

## Common Issues & Solutions

### Issue: "Cannot find name 'Deno'"
**Solution**: This is normal! The Deno errors in the Edge Function file are expected. They only apply to the Supabase runtime, not your local development.

### Issue: "Supabase CLI not found"
**Solution**:
```bash
npm install -g supabase
```

### Issue: "OpenAI API error: Incorrect API key"
**Solution**:
1. Double-check your API key
2. Make sure you copied the full key (starts with `sk-`)
3. Reset the secret:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-correct-key
```

### Issue: "Function not found"
**Solution**:
```bash
# Make sure you're in the right directory
cd "/Users/brandonhinrichs/Local Repositories/Apps/Pulse-Point-main"

# Redeploy
npx supabase functions deploy ai-assessment-interpretation
```

### Issue: "Rate limit exceeded"
**Solution**:
- You're on OpenAI free tier with low limits
- Upgrade your OpenAI account tier
- Or wait a few minutes between requests

### Issue: AI takes too long (>10 seconds)
**Solution**:
- Normal time: 3-5 seconds
- Check OpenAI API status: https://status.openai.com
- Check your internet connection
- View Supabase logs for errors:
```bash
npx supabase functions logs ai-assessment-interpretation --follow
```

---

## What Works Now vs. What Needs Setup

### ✅ Works Now (No Setup Needed)
- All assessments (ACE, PCL-5, PHQ-9, etc.)
- Print functionality
- Standard assessment results
- PDF export
- Client management
- All other app features

### ⏳ Needs Setup (5 minutes)
- AI-powered clinical interpretation on printouts
- Evidence-based recommendations
- Symptom pattern analysis
- Follow-up planning suggestions

---

## Verifying Success

After deploying, you should see:

### 1. In Settings Page
```
✅ AI Interpretation Ready
Assessment printouts will include AI-powered clinical insights
```

### 2. When Printing Assessment
- "Generating AI Interpretation" modal appears (3-5 seconds)
- Print view opens with blue/purple "AI-Powered Clinical Interpretation" section
- Detailed analysis, recommendations, and follow-up plan displayed

### 3. In Terminal (if watching logs)
```bash
npx supabase functions logs ai-assessment-interpretation --follow

# You should see successful API calls:
# 2025-10-14 ... INFO Function executed successfully
```

---

## Cost Monitoring

### Tracking Usage
1. Go to https://platform.openai.com/usage
2. View your API usage and costs
3. Set up spending limits if desired

### Reducing Costs
- Each interpretation costs ~$0.001-0.002
- 1000 assessments = ~$1-2
- Very affordable for the value provided!

---

## Need More Help?

### Documentation
- `AI_IMPLEMENTATION_SUMMARY.md` - What was built
- `AI_INTERPRETATION_README.md` - Full feature docs
- `AI_SETUP_GUIDE.md` - Detailed setup instructions

### Support Resources
- Supabase Docs: https://supabase.com/docs/guides/functions
- OpenAI Docs: https://platform.openai.com/docs
- Check function logs: `npx supabase functions logs ai-assessment-interpretation`

### Debug Checklist
- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] OpenAI API key obtained
- [ ] API key set as Supabase secret
- [ ] Edge Function deployed
- [ ] Function appears in `npx supabase functions list`
- [ ] Settings page shows "AI Ready" status
- [ ] Test print generates AI interpretation

---

## The Bottom Line

Your AI interpretation feature is **fully built and ready**. It just needs:
1. OpenAI API key (2 minutes to get)
2. One deploy command (1 minute to run)

Total setup time: **~5 minutes**

After setup, every assessment printout will automatically include professional, evidence-based AI interpretation!

---

**Still seeing fallback message?** Run the deploy script:
```bash
./deploy-ai-interpretation.sh
```

Or check the Settings page for step-by-step instructions with copy-paste commands!
