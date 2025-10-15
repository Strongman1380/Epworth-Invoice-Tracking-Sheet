---
description: Repository Information Overview
alwaysApply: true
---

# Pulse Point Information

## Summary
Pulse Point is a HIPAA-compliant healthcare application for providers to manage client data, assessments, and treatment plans. It features user-level data isolation, row-level security, duplicate prevention, audit trails, and encrypted storage to ensure compliance with healthcare regulations.

## Structure
- **src/**: Core application code including components, contexts, and services
- **public/**: Static assets and files served directly
- **supabase/**: Database migrations, functions, and configuration
- **dist/**: Compiled production build

## Language & Runtime
**Language**: TypeScript
**Version**: ES2020 target
**Build System**: Vite
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- React 18.3.1
- React Router 6.26.2
- Supabase 2.50.0
- Capacitor 7.4.0 (mobile)
- shadcn/ui (Radix UI components)
- TanStack React Query 5.56.2
- Tailwind CSS 3.4.11
- Zod 3.23.8

**Development Dependencies**:
- TypeScript 5.5.3
- ESLint 9.9.0
- Vite 5.4.1
- SWC (React plugin)

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Mobile Configuration
**Platform**: Android via Capacitor
**App ID**: app.lovable.094603cc60e741a38d5d706dcee0a0d6
**App Name**: pulse-point
**Web Directory**: dist
**Server URL**: https://094603cc-60e7-41a3-8d5d-706dcee0a0d6.lovableproject.com

## Database
**Provider**: Supabase
**Features**:
- Row-level security
- User authentication
- Serverless functions
- SQL migrations

## Main Files
**Entry Point**: src/main.tsx
**App Component**: src/App.tsx
**Routing**: React Router DOM
**Authentication**: src/contexts/AuthContext.tsx
**API Integration**: src/integrations/supabase/client.ts
**Data Storage**: src/services/clientStorage.ts, src/services/assessmentStorage.ts

## HIPAA Compliance
**Data Isolation**: User-level data segregation
**Security**: Row-level security in database
**Duplicate Prevention**: Unique constraints to prevent client data mixing
**Audit Trail**: Logging of all data access and modifications
**Encryption**: Data encrypted at rest and in transit

## Testing Framework
**targetFramework**: Playwright

## Project Specialization
This application is specialized as the **Integrated Trauma & PTSD Assessment Suite v2.0** - a comprehensive platform for delivering validated trauma, PTSD, and ACE assessments with auto-scoring, clinician oversight, and trauma-informed UX.