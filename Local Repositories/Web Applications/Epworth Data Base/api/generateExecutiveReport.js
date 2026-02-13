import { json, methodNotAllowed } from './_utils.js'
import { chatText } from './_openai.js'
import { requireAuth } from './_auth.js'

const MAX_PROMPT_CHARS = 120000

function buildAllCasesPrompt(caseProfiles, authorizationAlerts, weekStart, weekEnd) {
  let prompt = `WEEKLY EXECUTIVE REPORT — Epworth Family Resources\nReporting Period: ${weekStart} to ${weekEnd}\nActive Cases: ${caseProfiles.length}\n\n`

  prompt += 'CASE DATA:\n'
  for (const profile of caseProfiles) {
    prompt += `\n--- ${profile.familyName} (Case #${profile.mcNumber || 'N/A'}) ---\n`
    prompt += `Service Types: ${profile.serviceTypes.join(', ') || 'None'}\n`
    prompt += `Workers: ${profile.workers.join(', ') || 'None'}\n`
    prompt += `Entries This Week: ${profile.entryCount}\n`
    if (profile.goalsText) prompt += `Goals: ${profile.goalsText}\n`
    if (profile.safetyConcerns.length > 0) {
      prompt += `Safety Concerns: ${profile.safetyConcerns.join('; ')}\n`
    }
    if (profile.entries.length > 0) {
      prompt += 'Visit Summaries:\n'
      for (const e of profile.entries) {
        prompt += `  ${e.date} | ${e.serviceType} | ${e.contactType}\n`
        if (e.narrative) prompt += `    Narrative: ${e.narrative}\n`
        if (e.goalsProgress) prompt += `    Goals Progress: ${e.goalsProgress}\n`
        if (e.interventions) prompt += `    Interventions: ${e.interventions}\n`
        if (e.safetyConcernDesc) prompt += `    Safety: ${e.safetyConcernDesc}\n`
      }
    }
  }

  if (authorizationAlerts.length > 0) {
    prompt += '\nAUTHORIZATION ALERTS (expiring within 14 days):\n'
    for (const alert of authorizationAlerts) {
      prompt += `  - ${alert.familyName}: ${alert.serviceType || 'General'} authorization expires ${alert.endDate}\n`
    }
  }

  prompt += `\nGenerate a comprehensive weekly executive report with the following sections (use ALL CAPS for section headers):\n`
  prompt += `1. EXECUTIVE OVERVIEW - High-level summary of the week\n`
  prompt += `2. SERVICE DELIVERY SUMMARY - Types and volume of services provided\n`
  prompt += `3. CASELOAD METRICS - Key numbers and statistics\n`
  prompt += `4. SAFETY CONCERNS - Any safety issues flagged this week\n`
  prompt += `5. GOAL PROGRESS HIGHLIGHTS - Notable progress across cases\n`
  prompt += `6. AUTHORIZATION STATUS - Upcoming expirations and alerts\n`
  prompt += `7. PER-CASE BRIEFS - Short paragraph per active case\n`
  prompt += `8. KEY OBSERVATIONS AND RECOMMENDATIONS - Strategic observations for leadership\n`

  return prompt
}

function buildSingleCasePrompt(caseProfiles, authorizationAlerts, weekStart, weekEnd) {
  const profile = caseProfiles[0]
  if (!profile) return 'No case data provided.'

  let prompt = `WEEKLY CASE DEEP-DIVE REPORT — Epworth Family Resources\nReporting Period: ${weekStart} to ${weekEnd}\nFamily: ${profile.familyName} (Case #${profile.mcNumber || 'N/A'})\n\n`

  prompt += `Workers Assigned: ${profile.workers.join(', ') || 'None'}\n`
  prompt += `Service Types: ${profile.serviceTypes.join(', ') || 'None'}\n`
  prompt += `Total Entries This Week: ${profile.entryCount}\n`
  if (profile.goalsText) prompt += `Case Goals: ${profile.goalsText}\n`

  if (profile.entries.length > 0) {
    prompt += '\nDETAILED VISIT DATA:\n'
    for (const e of profile.entries) {
      prompt += `\n  Date: ${e.date} | Service: ${e.serviceType} | Contact: ${e.contactType} | Worker: ${e.worker}\n`
      if (e.narrative) prompt += `    Narrative: ${e.narrative}\n`
      if (e.goalsProgress) prompt += `    Goals Progress: ${e.goalsProgress}\n`
      if (e.interventions) prompt += `    Interventions: ${e.interventions}\n`
      if (e.plan) prompt += `    Plan: ${e.plan}\n`
      if (e.interactions) prompt += `    Interactions: ${e.interactions}\n`
      if (e.parentingSkills) prompt += `    Parenting Skills: ${e.parentingSkills}\n`
      if (e.safetyConcernDesc) prompt += `    Safety Concern: ${e.safetyConcernDesc}\n`
    }
  }

  if (authorizationAlerts.length > 0) {
    prompt += '\nAUTHORIZATION ALERTS:\n'
    for (const alert of authorizationAlerts) {
      prompt += `  - ${alert.serviceType || 'General'} authorization expires ${alert.endDate}\n`
    }
  }

  prompt += `\nGenerate a detailed weekly case report with the following sections (use ALL CAPS for section headers):\n`
  prompt += `1. CASE OVERVIEW - Family context and current status\n`
  prompt += `2. SERVICE DELIVERY THIS WEEK - Services provided with dates\n`
  prompt += `3. VISIT NARRATIVES SUMMARY - Key themes from visit narratives\n`
  prompt += `4. GOAL PROGRESS - Progress toward each goal\n`
  prompt += `5. SAFETY ASSESSMENT - Safety observations and any concerns\n`
  prompt += `6. PARENTING OBSERVATIONS - Parenting skills and interactions noted\n`
  prompt += `7. INTERVENTIONS PROVIDED - Specific interventions used\n`
  prompt += `8. BARRIERS AND CHALLENGES - Obstacles to progress\n`
  prompt += `9. AUTHORIZATION STATUS - Current authorization status\n`
  prompt += `10. PLAN AND NEXT STEPS - Upcoming plans and focus areas\n`
  prompt += `11. RECOMMENDATIONS - Professional recommendations\n`

  return prompt
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const { scope, weekStart, weekEnd, caseProfiles, authorizationAlerts } = req.body || {}

    if (!caseProfiles || !Array.isArray(caseProfiles) || caseProfiles.length === 0) {
      return json(res, 400, { error: 'caseProfiles array is required' })
    }

    if (!weekStart || !weekEnd) {
      return json(res, 400, { error: 'weekStart and weekEnd are required' })
    }

    let userPrompt = scope === 'single'
      ? buildSingleCasePrompt(caseProfiles, authorizationAlerts || [], weekStart, weekEnd)
      : buildAllCasesPrompt(caseProfiles, authorizationAlerts || [], weekStart, weekEnd)

    if (userPrompt.length > MAX_PROMPT_CHARS) {
      userPrompt = userPrompt.slice(0, MAX_PROMPT_CHARS) + '\n\n[Note: Data was truncated due to size. Analyze what is provided.]'
    }

    const system =
      'You are a supervisor of in-home family services at Epworth Family Resources with a clinical background. ' +
      'You are writing a weekly executive report for leadership. ' +
      'Your tone is casually professional — you sound like a real person, not a robot. ' +
      'Write the way a laid-back but knowledgeable clinical supervisor would talk in a staffing meeting: warm, straightforward, and grounded. ' +
      'Use plain, human language. Avoid stiff corporate phrasing. Say things like "things are moving in the right direction" instead of "positive trajectory noted." ' +
      'You can be conversational — use contractions, keep sentences natural — but stay professional and clinically informed. ' +
      'Use trauma-informed, strengths-based language naturally, not as buzzwords. ' +
      'Be specific with data points and observations. Call out what is going well and what needs attention honestly. ' +
      'Where safety concerns exist, be direct and clear — do not soften them. ' +
      'Use ALL CAPS for section headers exactly as requested. ' +
      'Do not use markdown formatting — output plain text only. ' +
      'Workers are identified as "FLS [LastName]" (Family Life Specialist). Use this format consistently. ' +
      'For AUTHORIZATION STATUS: only discuss authorizations for services the client is actively receiving as evidenced by their case notes. Do not reference authorization types that have no corresponding case note activity.'

    const text = await chatText({
      system,
      user: userPrompt,
      model: process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, { text })
  } catch (err) {
    console.error('generateExecutiveReport error:', err?.message || err)
    return json(res, 500, { error: err?.message || 'Executive report generation failed' })
  }
}
