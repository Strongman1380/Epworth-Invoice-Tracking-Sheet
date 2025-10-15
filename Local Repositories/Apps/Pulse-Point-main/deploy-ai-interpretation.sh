#!/bin/bash

# AI Assessment Interpretation - Quick Deploy Script
# This script helps you deploy the AI interpretation Edge Function to Supabase

echo "🚀 AI Assessment Interpretation Deployment Script"
echo "=================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "To install it, run:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI is installed"
echo ""

# Check if user is logged in
echo "📝 Checking Supabase login status..."
if ! supabase projects list &> /dev/null
then
    echo "❌ You need to login to Supabase first."
    echo ""
    echo "Run this command:"
    echo "  npx supabase login"
    echo ""
    exit 1
fi

echo "✅ You are logged in to Supabase"
echo ""

# Show current project
echo "📂 Your Supabase project:"
echo "   Project Ref: pvmqzydaaaeelbhsejjh"
echo "   URL: https://pvmqzydaaaeelbhsejjh.supabase.co"
echo ""

# Check if OpenAI API key is needed
echo "🔑 OpenAI API Key Setup"
echo "----------------------"
echo "Do you have an OpenAI API key? (y/n)"
read -r has_key

if [ "$has_key" != "y" ]; then
    echo ""
    echo "To get an OpenAI API key:"
    echo "  1. Go to: https://platform.openai.com/api-keys"
    echo "  2. Sign in or create an account"
    echo "  3. Click 'Create new secret key'"
    echo "  4. Copy the key (you won't see it again!)"
    echo ""
    echo "Cost estimate: ~$0.001-0.002 per assessment interpretation"
    echo "For 1000 assessments: ~$1-2 per month"
    echo ""
    exit 0
fi

echo ""
echo "Please enter your OpenAI API key:"
read -r openai_key

if [ -z "$openai_key" ]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Set the secret
echo ""
echo "🔐 Setting OpenAI API key as Supabase secret..."
npx supabase secrets set OPENAI_API_KEY="$openai_key" --project-ref pvmqzydaaaeelbhsejjh

if [ $? -eq 0 ]; then
    echo "✅ OpenAI API key set successfully"
else
    echo "❌ Failed to set API key. You may need to link your project first:"
    echo "   npx supabase link --project-ref pvmqzydaaaeelbhsejjh"
    exit 1
fi

# Deploy the function
echo ""
echo "📦 Deploying AI interpretation function..."
npx supabase functions deploy ai-assessment-interpretation --project-ref pvmqzydaaaeelbhsejjh

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! AI interpretation is now deployed!"
    echo ""
    echo "🎉 Your assessment printouts will now include AI-powered clinical interpretations!"
    echo ""
    echo "Next steps:"
    echo "  1. Complete an assessment in your app"
    echo "  2. Click 'Print' when done"
    echo "  3. Watch the AI generate clinical insights!"
    echo ""
    echo "Monitor function logs with:"
    echo "  npx supabase functions logs ai-assessment-interpretation --project-ref pvmqzydaaaeelbhsejjh"
else
    echo "❌ Deployment failed. Check the error message above."
    exit 1
fi
