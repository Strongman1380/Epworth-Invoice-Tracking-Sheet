import { json, methodNotAllowed } from './_utils.js'
import { chatText } from './_openai.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const payload = req.body || {}
    const { templateType, caseName, mcNumber, cfss, workerName, reportMonth, reportYear, caseNotes, profile, goals } = payload

    if (!caseNotes || !Array.isArray(caseNotes) || caseNotes.length === 0) {
      return json(res, 400, { error: 'caseNotes are required' })
    }

    const isDrugTesting = templateType === 'drug_testing'

    // Pre-extract structured drug testing log from case notes
    let drugTestLog = ''
    if (isDrugTesting) {
      const dstEntries = caseNotes.filter(n => String(n.service_type || '').toUpperCase().startsWith('DST'))
      if (dstEntries.length > 0) {
        drugTestLog = '\n\n=== DRUG TESTING OCCURRENCES LOG (reference all of these) ===\n'
        dstEntries.forEach((e, i) => {
          const type = e.service_type || 'Unknown'
          const date = e.date || 'Unknown date'
          const contact = e.contact_type || ''
          const coc = e.chain_of_custody || 'N/A'
          // Determine result based on test type
          let result = 'N/A'
          if (type === 'DST-SP') {
            result = e.sp_test_result || 'Pending'
          } else {
            result = e.test_result || 'Pending'
          }
          // Substances if positive
          let substances = ''
          if (type === 'DST-SP' && e.sp_drugs_tested_positive) {
            substances = e.sp_drugs_tested_positive
          } else if (e.drugs_tested_positive) {
            substances = e.drugs_tested_positive
          }
          // Lab info
          const sentToLab = e.sent_to_lab || 'N/A'
          const labResults = e.lab_result_text || ''
          // Client admission
          const admitted = type === 'DST-SP' ? (e.sp_client_admitted_use || '') : (e.client_admitted_use || '')

          // Lab-based tests (Sweat Patch, Hair Follicle) always go to lab — include full report text
          const isLabBasedTest = ['DST-SP', 'DST-HF'].includes(type)

          drugTestLog += `\n${i + 1}. Date: ${date} | Type: ${type} | Contact: ${contact}\n`
          drugTestLog += `   Chain of Custody: ${coc} | Result: ${result}\n`
          if (substances) drugTestLog += `   Substances: ${substances}\n`
          if (admitted) drugTestLog += `   Client Admitted Use: ${admitted}\n`
          if (labResults) {
            if (isLabBasedTest) {
              // Full lab report for sweat patch and hair follicle — these are read from pasted lab reports
              drugTestLog += `   Sent to Lab: Yes\n`
              drugTestLog += `   --- LAB REPORT START ---\n${labResults}\n   --- LAB REPORT END ---\n`
            } else {
              // Other test types — include full lab text when sent to lab
              drugTestLog += `   Sent to Lab: ${sentToLab}${sentToLab === 'Yes' ? '\n   Lab Results: ' + labResults : ''}\n`
            }
          } else if (sentToLab === 'Yes') {
            drugTestLog += `   Sent to Lab: Yes | Results: Pending\n`
          }
          if (e.refusal_reason) drugTestLog += `   Refusal Reason: ${e.refusal_reason}\n`
          if (e.visit_narrative) drugTestLog += `   Narrative: ${e.visit_narrative.substring(0, 200)}\n`
        })
        drugTestLog += `\nTotal drug testing occurrences: ${dstEntries.length}\n`
      }
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
      (isDrugTesting
        ? '- CRITICAL: In the OUTCOME OF CONTACTS section, you MUST list EVERY single drug testing occurrence individually with its date, test type (UA, Mouth Swab, Sweat Patch, Hair Follicle), result (Negative/Positive/Refusal/No Show), chain of custody status, and any substances detected. Do NOT summarize or skip any tests. Every test documented in the case notes must appear as its own entry. ' +
          '- LAB REPORTS: When lab report text is provided (especially for Sweat Patch and Hair Follicle tests which are always sent to a lab), parse and organize the raw lab report into a clean, readable format for that test entry. Include: specimen ID, collection date, report date, each substance tested with its result (positive/negative) and levels/cutoffs when shown, confirmation method, and any lab notes or flags. Present the lab data in a structured, professional format under that test occurrence. '
        : '') +
      'Return plain text with the exact section headers shown. Do not use markdown.'

    const userPrompt = `Generate a monthly summary for ${caseName || 'the family'} (${mcNumber || 'no case #'}).\n\n` +
      `Worker: ${workerName || 'Unknown'}\n` +
      `CFSS: ${cfss || ''}\n` +
      `Report Month/Year: ${reportMonth + 1}/${reportYear}\n` +
      `Template Type: ${templateType}\n\n` +
      `Goals: ${JSON.stringify(goals || [])}\n\n` +
      `Profile: ${JSON.stringify(profile || {})}\n\n` +
      `Case Notes (most recent first):\n${JSON.stringify(caseNotes, null, 2)}\n\n` +
      (drugTestLog ? drugTestLog + '\n\n' : '') +
      `Format exactly like this:\n` +
      (isDrugTesting
        ? ''
        : `===== PROGRESS TOWARD GOALS =====\nWrite one comprehensive narrative summarizing how ALL goals were addressed during the month. Reference each goal by name and describe the family's progress, specific examples from case notes, and any setbacks. Do NOT split into separate Goal 1/Goal 2/Goal 3 sections — combine everything into one flowing summary.\n`) +
      `===== BARRIERS IDENTIFIED AND ADDRESSED =====\n...\n` +
      `===== CHILD SAFETY ASSESSMENT =====\n...\n` +
      `===== FAMILY'S PROGRESS =====\n...\n` +
      `===== RECOMMENDATIONS =====\n...\n` +
      `===== OUTCOME OF CONTACTS =====\n` +
      (isDrugTesting
        ? `List EVERY drug testing occurrence individually. For each test include:\n- Date\n- Test type (Urinalysis, Mouth Swab, Sweat Patch, Hair Follicle)\n- Result (Negative, Positive, Refusal, No Show)\n- Chain of custody (Yes/No)\n- Substances detected (if positive)\n- Lab confirmation status and organized lab results (when lab report text is provided, parse it into a clean format showing each substance tested, result, levels/cutoffs, specimen ID, and any lab flags)\n- Any relevant narrative (client behavior, admissions, refusal reasons)\nFor Sweat Patch and Hair Follicle tests: these always go to a lab. When the full lab report text is included, organize ALL the lab data into a clear, structured summary under that test entry showing every substance screened and its result.\nDo NOT combine or summarize tests. Each test must be its own entry.\n`
        : `...\n`)

    const summary = await chatText({
      system,
      user: userPrompt,
      model: process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, { summary })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Summary generation failed' })
  }
}
