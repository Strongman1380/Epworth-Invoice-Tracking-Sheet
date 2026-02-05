import { json, methodNotAllowed } from './_utils.js'
import { chatText } from './_openai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  try {
    const payload = req.body || {}
    const { templateType, caseName, mcNumber, cfss, workerName, reportMonth, reportYear, caseNotes, profile, goals } = payload

    if (!caseNotes || !Array.isArray(caseNotes) || caseNotes.length === 0) {
      return json(res, 400, { error: 'caseNotes are required' })
    }

    const system =
      'You are a Family Life Specialist (FLS) at Epworth Family Resources - a trauma-informed family support professional writing monthly summary reports. ' +
      'Write in third person professional voice (e.g., "The FLS observed...", "Family Life Specialist provided support..."). ' +
      'Never use first person (I, me, my). Always refer to yourself as "the FLS" or "Family Life Specialist". ' +
      'Be BALANCED and HONEST in your reporting: ' +
      '- Document BOTH progress/strengths AND concerns/challenges. Do not sugarcoat issues. ' +
      '- If there are safety concerns, behavioral issues, or lack of progress, state them clearly and professionally. ' +
      '- Use trauma-informed, non-judgmental language - describe behaviors and observations, not character. ' +
      '- Be specific and factual with concrete examples from the case notes. ' +
      '- Include parent engagement levels, barriers encountered, and how they were addressed. ' +
      '- Document any patterns of concern (missed visits, positive drug tests, safety issues). ' +
      '- Provide honest recommendations based on actual progress or lack thereof. ' +
      'Return plain text with the exact section headers shown. Do not use markdown.'

    const user = `Generate a monthly summary for ${caseName || 'the family'} (${mcNumber || 'no case #'}).\n\n` +
      `Worker: ${workerName || 'Unknown'}\n` +
      `CFSS: ${cfss || ''}\n` +
      `Report Month/Year: ${reportMonth + 1}/${reportYear}\n` +
      `Template Type: ${templateType}\n\n` +
      `Goals: ${JSON.stringify(goals || [])}\n\n` +
      `Profile: ${JSON.stringify(profile || {})}\n\n` +
      `Case Notes (most recent first):\n${JSON.stringify(caseNotes, null, 2)}\n\n` +
      `Format exactly like this:\n` +
      `===== PROGRESS TOWARD GOALS =====\n` +
      `Goal 1: ...\n` +
      `Goal 2: ...\n` +
      `Goal 3: ...\n` +
      `===== BARRIERS IDENTIFIED AND ADDRESSED =====\n...\n` +
      `===== CHILD SAFETY ASSESSMENT =====\n...\n` +
      `===== FAMILY'S PROGRESS =====\n...\n` +
      `===== RECOMMENDATIONS =====\n...\n` +
      `===== OUTCOME OF CONTACTS =====\n...\n`

    const summary = await chatText({
      system,
      user,
      model: process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, { summary })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Summary generation failed' })
  }
}
