# Quick Setup Guide: AI Assessment Interpretation

## Prerequisites
- Supabase project set up
- OpenAI API key
- Supabase CLI installed (`npm install -g supabase`)

## Step-by-Step Setup

### 1. Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
npx supabase login
```

### 3. Link Your Project
```bash
cd "/Users/brandonhinrichs/Local Repositories/Apps/Pulse-Point-main"
npx supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to Supabase Dashboard
- Look at your project URL: `https://YOUR_PROJECT_REF.supabase.co`

### 4. Set OpenAI API Key as Secret
```bash
# Set the secret
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here

# Verify it's set
npx supabase secrets list
```

To get an OpenAI API key:
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again!)

### 5. Deploy the Edge Function
```bash
# Deploy the AI interpretation function
npx supabase functions deploy ai-assessment-interpretation

# You should see:
# Deploying Function ai-assessment-interpretation...
# Deployed Function ai-assessment-interpretation
```

### 6. Test the Function
```bash
# Test locally first (optional)
npx supabase functions serve ai-assessment-interpretation

# In another terminal, test with curl:
curl -X POST http://localhost:54321/functions/v1/ai-assessment-interpretation \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentType": "ACE",
    "score": 5,
    "answers": {"0": "Often", "1": "Sometimes"},
    "questions": [
      {"id": 0, "text": "Did you experience trauma?", "category": "Abuse"}
    ]
  }'
```

### 7. Configure CORS (if needed)
The function already includes CORS headers. If you need to adjust them:

Edit `supabase/functions/ai-assessment-interpretation/index.ts`:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

Then redeploy:
```bash
npx supabase functions deploy ai-assessment-interpretation
```

### 8. Verify in Your App
1. Start your development server: `npm run dev`
2. Complete an assessment (e.g., ACE Assessment)
3. Click the "Print" button when complete
4. You should see:
   - "Generating AI Interpretation" loading screen
   - After 3-5 seconds, the print view with AI analysis

### 9. Monitor Function Logs
```bash
# View real-time logs
npx supabase functions logs ai-assessment-interpretation --follow

# View recent logs
npx supabase functions logs ai-assessment-interpretation
```

## Troubleshooting

### Error: "Cannot find OpenAI API key"
```bash
# Check if secret is set
npx supabase secrets list

# Set it again if missing
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### Error: "Function not found"
```bash
# Redeploy the function
npx supabase functions deploy ai-assessment-interpretation

# Check deployed functions
npx supabase functions list
```

### Error: "CORS policy"
The function includes CORS headers. If you still see errors:
1. Check browser console for specific CORS error
2. Verify the function is deployed: `npx supabase functions list`
3. Try clearing browser cache

### Error: "OpenAI API rate limit"
If you're on the free tier:
1. Upgrade your OpenAI plan
2. Implement caching (future enhancement)
3. Reduce the number of test calls

## Production Deployment

### Environment Variables
Set these in your production environment:
```bash
OPENAI_API_KEY=sk-your-production-key
```

### Rate Limiting
Consider implementing rate limiting if you have high traffic:
```typescript
// Add to edge function
const rateLimit = {
  maxRequests: 100,
  windowMs: 60000 // 1 minute
};
```

### Monitoring
Set up monitoring:
1. Supabase Dashboard > Functions > View Logs
2. Set up alerts for errors
3. Monitor OpenAI API usage at https://platform.openai.com/usage

## Cost Management

### Estimate Your Costs
- GPT-4o-mini: ~$0.001-0.002 per interpretation
- Average tokens per request: 1500-2000
- Monthly cost for 1000 assessments: ~$1-2

### Optimize Costs
1. Cache common interpretations
2. Use lower temperature for faster responses
3. Implement request batching
4. Set rate limits per user

## Next Steps
1. ✅ Deploy the function
2. ✅ Test with ACE assessment
3. 🔄 Update other assessments to use AI (PCL-5, PHQ-9, etc.)
4. 📊 Monitor usage and costs
5. 🎨 Customize AI prompts for your organization

## Support
- Supabase Docs: https://supabase.com/docs/guides/functions
- OpenAI Docs: https://platform.openai.com/docs
- Check the main AI_INTERPRETATION_README.md for detailed information

---
**Ready to go!** Your AI interpretation system is now set up and ready to provide clinical insights.
