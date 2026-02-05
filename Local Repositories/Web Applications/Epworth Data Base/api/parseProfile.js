import { json, methodNotAllowed } from './_utils.js'
import { chatJson } from './_openai.js'

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    profile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        Family_ID: { type: 'string' },
        Case_Name: { type: 'string' },
        MC_Number: { type: 'string' },
        CFSS: { type: 'string' },
        Typical_Location: { type: 'string' },
        Poverty_Level: { type: 'string' },
        Authorized_Units: { type: 'string' },
        Units_Per_Week: { type: 'string' },
        Auth_Start_Date: { type: 'string' },
        Auth_End_Date: { type: 'string' },
        Parent_1: { type: 'string' },
        Parent_1_Gender: { type: 'string' },
        Parent_2: { type: 'string' },
        Parent_2_Gender: { type: 'string' },
        Parent_3: { type: 'string' },
        Parent_3_Gender: { type: 'string' },
        Child_1: { type: 'string' },
        Child_1_Gender: { type: 'string' },
        Child_1_Age_Range: { type: 'string' },
        Child_2: { type: 'string' },
        Child_2_Gender: { type: 'string' },
        Child_2_Age_Range: { type: 'string' },
        Child_3: { type: 'string' },
        Child_3_Gender: { type: 'string' },
        Child_3_Age_Range: { type: 'string' },
        Child_4: { type: 'string' },
        Child_4_Gender: { type: 'string' },
        Child_4_Age_Range: { type: 'string' },
        Child_5: { type: 'string' },
        Child_5_Gender: { type: 'string' },
        Child_5_Age_Range: { type: 'string' },
        Child_6: { type: 'string' },
        Child_6_Gender: { type: 'string' },
        Child_6_Age_Range: { type: 'string' },
        Child_7: { type: 'string' },
        Child_7_Gender: { type: 'string' },
        Child_7_Age_Range: { type: 'string' },
        goalsText: { type: 'string' },
        Service_Start_Date: { type: 'string' },
        Service_End_Date: { type: 'string' },
        is_lead_case: { type: 'boolean' },
        lead_case_id: { type: 'string' },
        linked_case_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['Case_Name'],
    },
    goals: {
      type: 'array',
      items: { type: 'string' },
    },
    raw: { type: 'object' },
  },
  required: ['profile', 'goals', 'raw'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  try {
    const { text, hint } = req.body || {}
    if (!text) return json(res, 400, { error: 'text is required' })

    const system =
      'You extract client profile data for a family services case management app. ' +
      'Return only JSON that matches the schema. Use empty strings when unknown. Dates must be YYYY-MM-DD.'

    const user = `Parse this intake/profile text into structured fields.\n\nText:\n${text}\n\nHints:\n${JSON.stringify(hint || {})}`

    const result = await chatJson({
      system,
      user,
      schema,
      name: 'profile_parse',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, result)
  } catch (err) {
    return json(res, 500, { error: err?.message || 'AI parse failed' })
  }
}
