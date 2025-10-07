# Deployment Checklist

Use this checklist to ensure your Pathways Companion deployment is production-ready.

## Pre-Deployment

### ✅ Code Quality

- [ ] All Python code passes `python3 -m compileall`
- [ ] No ESLint errors in mobile code
- [ ] No TypeScript errors (if using TypeScript)
- [ ] All tests passing
- [ ] Code reviewed by team member
- [ ] No hardcoded credentials in code
- [ ] All TODO comments addressed or documented

### ✅ Environment Configuration

#### Backend
- [ ] `.env` file created from `.env.example`
- [ ] `SUPABASE_URL` set correctly
- [ ] `SUPABASE_SERVICE_KEY` set (secret, never commit!)
- [ ] `SUPABASE_ANON_KEY` set
- [ ] `.env` added to `.gitignore`
- [ ] All required environment variables documented

#### Mobile
- [ ] `.env` file created from `.env.example`
- [ ] `EXPO_PUBLIC_SUPABASE_URL` set correctly
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `.env` added to `.gitignore`
- [ ] Environment variables work in all build modes (dev/preview/production)

### ✅ Database

- [ ] Supabase project created
- [ ] `backend/database/schema.sql` executed successfully
- [ ] All tables created (`profiles`, `prompts`, `reflections`)
- [ ] RLS policies enabled on all tables
- [ ] Storage bucket `voice-notes` created
- [ ] Storage policies configured
- [ ] Seed data (prompts) inserted
- [ ] Database indexes created
- [ ] Helper functions (`get_emotion_trend`) working
- [ ] Test user created and can authenticate

### ✅ Security

- [ ] RLS policies tested - users can't access others' data
- [ ] Service role key never exposed to frontend
- [ ] CORS configured appropriately (not `*` in production)
- [ ] HTTPS enforced in production
- [ ] Sensitive files in `.gitignore`
- [ ] Auth tokens expire appropriately
- [ ] Rate limiting configured (if applicable)
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### ✅ Testing

#### Backend
- [ ] Health check endpoint works (`/health`)
- [ ] Authentication required for protected routes
- [ ] Create reflection works
- [ ] Get trends works
- [ ] List reflections works
- [ ] Delete reflection works
- [ ] Error handling works (invalid tokens, missing data, etc.)
- [ ] Load tested with expected traffic

#### Mobile
- [ ] Sign up flow works
- [ ] Email confirmation works
- [ ] Sign in flow works
- [ ] Create reflection saves to Supabase
- [ ] Trends load correctly
- [ ] Offline queue works
- [ ] Auto-sync works when coming back online
- [ ] Sign out works
- [ ] Works on iOS simulator/device
- [ ] Works on Android emulator/device
- [ ] No memory leaks in navigation

### ✅ Performance

- [ ] Backend response times < 200ms (p95)
- [ ] Mobile app loads in < 3 seconds
- [ ] Images/assets optimized
- [ ] Database queries use indexes
- [ ] No N+1 queries
- [ ] Offline mode responsive
- [ ] Large lists virtualized
- [ ] Bundle size optimized

### ✅ Documentation

- [ ] README.md up to date
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Deployment guide complete
- [ ] Troubleshooting section exists
- [ ] Contributing guidelines (if open source)
- [ ] License file present

---

## Backend Deployment

### Vercel

- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] `vercel.json` configured
- [ ] Project linked (`vercel link`)
- [ ] Environment variables set in Vercel dashboard
- [ ] Deployment successful (`vercel --prod`)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate valid
- [ ] Health check endpoint returns 200

### Render/Railway

- [ ] GitHub repo connected
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `uvicorn app.main_supabase:app --host 0.0.0.0 --port $PORT`
- [ ] Environment variables set in platform
- [ ] Deployment successful
- [ ] Health check configured
- [ ] Auto-deploy on push enabled (optional)

### Custom Server

- [ ] Server provisioned (Ubuntu/Debian recommended)
- [ ] Python 3.11+ installed
- [ ] Nginx/Caddy configured as reverse proxy
- [ ] SSL certificate (Let's Encrypt) installed
- [ ] Systemd service created for uvicorn
- [ ] Firewall configured
- [ ] Logs configured
- [ ] Monitoring set up

---

## Mobile Deployment

### Expo Prerequisites

- [ ] Expo account created
- [ ] EAS CLI installed (`npm i -g eas-cli`)
- [ ] Logged in (`eas login`)
- [ ] `app.json` configured correctly
- [ ] Bundle identifier/package name unique
- [ ] Version numbers set

### iOS

- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect app created
- [ ] Bundle ID registered
- [ ] Provisioning profiles configured
- [ ] `eas.json` configured for iOS
- [ ] Build successful (`eas build --platform ios`)
- [ ] TestFlight upload successful
- [ ] Beta testing complete
- [ ] App Store submission (`eas submit --platform ios`)
- [ ] Screenshots/metadata added
- [ ] Privacy policy URL provided
- [ ] App approved

### Android

- [ ] Google Play Developer account ($25 one-time)
- [ ] Play Console app created
- [ ] Package name registered
- [ ] Keystore generated
- [ ] `eas.json` configured for Android
- [ ] Build successful (`eas build --platform android`)
- [ ] Internal testing track uploaded
- [ ] Beta testing complete
- [ ] Production submission (`eas submit --platform android`)
- [ ] Screenshots/metadata added
- [ ] Privacy policy URL provided
- [ ] App approved

---

## Post-Deployment

### ✅ Verification

- [ ] Deployed backend health check returns 200
- [ ] Mobile app connects to production backend
- [ ] New user can sign up
- [ ] Email confirmation arrives
- [ ] User can sign in
- [ ] User can create reflection
- [ ] Reflection appears in Supabase
- [ ] Trends load correctly
- [ ] Offline mode works
- [ ] Sign out works

### ✅ Monitoring

- [ ] Error tracking configured (Sentry, Bugsnag, etc.)
- [ ] Analytics configured (Mixpanel, Amplitude, etc.)
- [ ] Uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Performance monitoring (New Relic, Datadog, etc.)
- [ ] Log aggregation (Logtail, Papertrail, etc.)
- [ ] Alerts configured for critical errors
- [ ] Dashboard created for key metrics

### ✅ Backup & Recovery

- [ ] Database backups enabled (Supabase auto-backup)
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure documented
- [ ] Data retention policy defined

### ✅ Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if EU users)
  - [ ] Data export functionality
  - [ ] Data deletion functionality
  - [ ] Cookie consent (if applicable)
- [ ] HIPAA compliance (if health data in US)
- [ ] Accessibility audit completed (WCAG 2.1 AA)

### ✅ User Support

- [ ] Support email configured
- [ ] FAQ page created
- [ ] In-app help/tour available
- [ ] Feedback mechanism in place
- [ ] Bug reporting process defined
- [ ] Response SLA defined

### ✅ Marketing

- [ ] App Store optimization (ASO) done
- [ ] Keywords researched
- [ ] Icon/screenshots optimized
- [ ] Press kit prepared
- [ ] Launch announcement ready
- [ ] Social media accounts created
- [ ] Website/landing page live

---

## Scaling Checklist

### When you hit 1,000 users:

- [ ] Review Supabase plan (upgrade if needed)
- [ ] Enable database connection pooling
- [ ] Set up CDN for static assets
- [ ] Implement caching layer (Redis)
- [ ] Review and optimize slow queries
- [ ] Consider read replicas

### When you hit 10,000 users:

- [ ] Implement rate limiting
- [ ] Set up load balancer
- [ ] Enable auto-scaling
- [ ] Shard database if needed
- [ ] Implement queue for async tasks
- [ ] Consider edge functions for global performance

---

## Emergency Contacts

- **Supabase Support**: https://supabase.com/support
- **Expo Support**: https://expo.dev/contact
- **Domain Registrar**: _________________
- **Hosting Provider**: _________________
- **Email Provider**: _________________
- **Team Lead**: _________________
- **On-call Engineer**: _________________

---

## Sign-off

- [ ] **Developer**: Code ready for deployment
  - Name: _________________ Date: _______

- [ ] **QA**: Testing complete, bugs resolved
  - Name: _________________ Date: _______

- [ ] **Product Owner**: Features approved
  - Name: _________________ Date: _______

- [ ] **Security**: Security review complete
  - Name: _________________ Date: _______

- [ ] **Deployment Manager**: Deployment successful
  - Name: _________________ Date: _______

---

## Rollback Plan

If something goes wrong:

1. **Backend**: Redeploy previous version
   ```bash
   vercel rollback  # or platform-specific command
   ```

2. **Mobile**: Users still have old version (gradual rollout helps)
   - Push update with fix
   - Use EAS Updates for quick patches

3. **Database**: Restore from backup
   ```bash
   # Via Supabase dashboard or CLI
   supabase db reset --db-url "backup-connection-string"
   ```

4. **Communication**:
   - Notify users via in-app banner
   - Post on social media
   - Send email if critical

---

**Production Readiness Score**: ___ / 100 (Count checkboxes)

- 90-100: Ready to deploy ✅
- 70-89: Deploy with caution ⚠️
- <70: Not ready ❌

---

Last updated: _____________
Next review: _____________
