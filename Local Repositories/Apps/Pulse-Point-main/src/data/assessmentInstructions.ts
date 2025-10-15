export interface AssessmentInstructions {
  id: string;
  name: string;
  purpose: string;
  administration: {
    timeframe: string;
    setting: string;
    administeringGuidelines: string[];
    traumaInformed: string[];
  };
  instructions: {
    beforeStarting: string[];
    duringAssessment: string[];
    afterCompletion: string[];
  };
  scoring: {
    method: string;
    interpretation: {
      ranges: Array<{
        range: string;
        interpretation: string;
        recommendation: string;
        level: 'low' | 'moderate' | 'high' | 'severe';
      }>;
    };
    clinicalNotes: string[];
  };
  safetyConsiderations: string[];
  followUpActions: string[];
}

export const assessmentInstructions: AssessmentInstructions[] = [
  {
    id: 'pc-ptsd-5',
    name: 'PC-PTSD-5 (Primary Care PTSD Screen for DSM-5)',
    purpose: 'A brief, 6-item screening tool designed to identify individuals with probable PTSD in primary care and other medical settings.',
    administration: {
      timeframe: '3-5 minutes',
      setting: 'Can be administered in any clinical setting, including primary care, specialty mental health, and community health centers.',
      administeringGuidelines: [
        'Ensure privacy and confidentiality',
        'Build rapport before beginning',
        'Explain the purpose of the screening',
        'Emphasize that this is a screening, not a diagnosis'
      ],
      traumaInformed: [
        'Validate that trauma responses are normal',
        'Allow clients to pause or stop if overwhelmed',
        'Provide grounding techniques if needed',
        'Respect client choice to skip questions'
      ]
    },
    instructions: {
      beforeStarting: [
        'Review the client\'s current safety and stability',
        'Ensure you have time and privacy for the full assessment',
        'Have resources available for immediate support if needed',
        'Explain confidentiality limits and mandatory reporting requirements'
      ],
      duringAssessment: [
        'Read questions exactly as written',
        'Allow time for client to process each question',
        'Watch for signs of distress or re-traumatization',
        'Offer breaks if the client appears overwhelmed',
        'Maintain a calm, non-judgmental presence'
      ],
      afterCompletion: [
        'Review responses with the client',
        'Normalize any symptoms identified',
        'Discuss next steps based on results',
        'Provide immediate coping strategies if score is elevated',
        'Schedule appropriate follow-up'
      ]
    },
    scoring: {
      method: 'Count "Yes" responses to the 5 symptom questions (excluding the trauma exposure question)',
      interpretation: {
        ranges: [
          {
            range: '0-2',
            interpretation: 'Negative screen for PTSD',
            recommendation: 'PTSD unlikely. Monitor for changes and provide general mental health support as appropriate.',
            level: 'low'
          },
          {
            range: '3-5',
            interpretation: 'Positive screen for probable PTSD',
            recommendation: 'Further evaluation recommended. Consider referral to trauma-informed mental health professional for comprehensive PTSD assessment.',
            level: 'high'
          }
        ]
      },
      clinicalNotes: [
        'A score of 3 or higher suggests probable PTSD',
        'Positive screens require follow-up assessment',
        'Consider co-occurring conditions (depression, anxiety, substance use)',
        'Document specific symptoms endorsed for treatment planning'
      ]
    },
    safetyConsiderations: [
      'Assess for current suicidal or homicidal ideation',
      'Evaluate current safety in living situation',
      'Assess for ongoing trauma exposure',
      'Consider impact of assessment on current mental state'
    ],
    followUpActions: [
      'Positive screen: Refer for comprehensive PTSD evaluation',
      'Provide crisis resources and safety planning',
      'Consider brief interventions while awaiting specialty care',
      'Document findings and communicate with treatment team'
    ]
  },
  {
    id: 'ace',
    name: 'Adverse Childhood Experiences (ACE) Questionnaire',
    purpose: 'Assesses exposure to childhood trauma and adversity that may impact adult physical and mental health outcomes.',
    administration: {
      timeframe: '5-10 minutes',
      setting: 'Appropriate for various clinical settings including primary care, mental health, substance abuse treatment, and social services.',
      administeringGuidelines: [
        'Create a safe, private environment',
        'Explain the connection between childhood experiences and adult health',
        'Emphasize that experiences do not define the person',
        'Use trauma-informed language throughout'
      ],
      traumaInformed: [
        'Acknowledge the courage it takes to answer these questions',
        'Remind clients they can skip questions that feel too difficult',
        'Normalize trauma responses and symptoms',
        'Focus on resilience and post-traumatic growth potential'
      ]
    },
    instructions: {
      beforeStarting: [
        'Assess client\'s readiness to discuss childhood experiences',
        'Explain the purpose and how results will be used',
        'Ensure adequate time for processing and debriefing',
        'Have support resources readily available'
      ],
      duringAssessment: [
        'Read questions slowly and clearly',
        'Allow silence for client processing',
        'Notice non-verbal signs of distress',
        'Offer grounding techniques if client becomes overwhelmed',
        'Remind client they are in control of the process'
      ],
      afterCompletion: [
        'Acknowledge the client\'s strength in completing the assessment',
        'Discuss the meaning of the score in context of resilience',
        'Explore protective factors and current support systems',
        'Develop safety and self-care plan',
        'Connect to appropriate resources and interventions'
      ]
    },
    scoring: {
      method: 'Sum the number of "Yes" responses across all 10 categories',
      interpretation: {
        ranges: [
          {
            range: '0',
            interpretation: 'No reported adverse childhood experiences',
            recommendation: 'Focus on maintaining resilience and healthy coping strategies. Continue routine preventive care.',
            level: 'low'
          },
          {
            range: '1-3',
            interpretation: 'Low to moderate ACE exposure',
            recommendation: 'Monitor for stress-related health issues. Provide psychoeducation about trauma and resilience.',
            level: 'moderate'
          },
          {
            range: '4-6',
            interpretation: 'High ACE exposure',
            recommendation: 'Increased risk for physical and mental health problems. Consider trauma-informed interventions and comprehensive care coordination.',
            level: 'high'
          },
          {
            range: '7-10',
            interpretation: 'Very high ACE exposure',
            recommendation: 'Significant risk for multiple health impacts. Prioritize trauma-informed care, comprehensive services, and close monitoring.',
            level: 'severe'
          }
        ]
      },
      clinicalNotes: [
        'Higher ACE scores correlate with increased risk for chronic diseases',
        'Consider protective factors and resilience when interpreting scores',
        'ACEs are common - normalize the client\'s experiences',
        'Focus on current functioning and strengths, not just deficits'
      ]
    },
    safetyConsiderations: [
      'Assess for ongoing abuse or unsafe relationships',
      'Evaluate current mental health and suicide risk',
      'Consider mandatory reporting requirements',
      'Address any immediate safety concerns'
    ],
    followUpActions: [
      'Higher scores: Refer to trauma-informed therapy',
      'Provide education about trauma and its impacts',
      'Develop comprehensive care plan addressing physical and mental health',
      'Connect to peer support and community resources'
    ]
  },
  {
    id: 'tsq',
    name: 'Trauma Screening Questionnaire (TSQ)',
    purpose: 'Screens for PTSD symptoms following a traumatic event, typically administered 3-4 weeks post-trauma.',
    administration: {
      timeframe: '5-8 minutes',
      setting: 'Emergency departments, crisis centers, primary care, or any setting where recent trauma survivors are seen.',
      administeringGuidelines: [
        'Administer 3-4 weeks after the traumatic event',
        'Ensure client is medically stable',
        'Create a calm, supportive environment',
        'Explain this helps identify normal vs. concerning responses'
      ],
      traumaInformed: [
        'Normalize acute stress responses',
        'Emphasize that symptoms are the body\'s natural reaction to trauma',
        'Validate the client\'s experience and emotions',
        'Provide hope for recovery and resilience'
      ]
    },
    instructions: {
      beforeStarting: [
        'Confirm the timing is appropriate (3-4 weeks post-trauma)',
        'Assess current safety and stabilization',
        'Explain the difference between normal and concerning reactions',
        'Ensure client understands the screening purpose'
      ],
      duringAssessment: [
        'Ask about symptoms occurring "at least twice" in the past week',
        'Be specific about the timeframe',
        'Watch for re-experiencing symptoms during assessment',
        'Provide reassurance about normal trauma responses',
        'Allow breaks if needed'
      ],
      afterCompletion: [
        'Discuss results in context of normal trauma recovery',
        'Provide psychoeducation about trauma responses',
        'Identify current coping strategies and supports',
        'Plan appropriate level of intervention',
        'Schedule follow-up screening'
      ]
    },
    scoring: {
      method: 'Count the number of "Yes" responses to all 10 items',
      interpretation: {
        ranges: [
          {
            range: '0-5',
            interpretation: 'Low risk for developing PTSD',
            recommendation: 'Continue monitoring. Provide general trauma education and healthy coping strategies.',
            level: 'low'
          },
          {
            range: '6-10',
            interpretation: 'High risk for developing PTSD',
            recommendation: 'Comprehensive PTSD evaluation recommended. Consider early intervention to prevent chronic PTSD.',
            level: 'high'
          }
        ]
      },
      clinicalNotes: [
        'A score of 6 or higher indicates high PTSD risk',
        'Early intervention can prevent chronic PTSD development',
        'Consider cultural factors in symptom expression',
        'Monitor changes over time with repeated screenings'
      ]
    },
    safetyConsiderations: [
      'Assess for ongoing trauma exposure',
      'Evaluate current support systems',
      'Screen for substance use as coping mechanism',
      'Monitor for deterioration in functioning'
    ],
    followUpActions: [
      'High risk scores: Immediate referral for trauma treatment',
      'Provide crisis resources and safety planning',
      'Consider brief trauma-focused interventions',
      'Schedule follow-up screening in 2-4 weeks'
    ]
  },
  {
    id: 'pcl5',
    name: 'PTSD Checklist for DSM-5 (PCL-5)',
    purpose: 'Comprehensive assessment of PTSD symptoms based on DSM-5 criteria. Can be used for screening, diagnosis, and monitoring treatment progress.',
    administration: {
      timeframe: '10-15 minutes',
      setting: 'Mental health clinics, primary care, research settings, or any clinical environment.',
      administeringGuidelines: [
        'Ensure client has experienced a traumatic event',
        'Allow adequate time for completion without rushing',
        'Provide support throughout the assessment',
        'Consider administration method (self-report vs. interview)'
      ],
      traumaInformed: [
        'Validate the difficulty of symptom reporting',
        'Normalize PTSD symptoms as trauma responses',
        'Emphasize treatability and recovery potential',
        'Respect client autonomy in the assessment process'
      ]
    },
    instructions: {
      beforeStarting: [
        'Confirm traumatic event exposure',
        'Assess client\'s current emotional state',
        'Explain how results will inform treatment',
        'Ensure privacy and minimize interruptions'
      ],
      duringAssessment: [
        'Focus on symptoms over the past month',
        'Clarify any questions about symptom descriptions',
        'Monitor client for signs of re-traumatization',
        'Offer breaks if client becomes overwhelmed',
        'Maintain supportive, non-judgmental stance'
      ],
      afterCompletion: [
        'Review high-scoring items with client',
        'Discuss impact on daily functioning',
        'Explore client\'s understanding of their symptoms',
        'Develop initial treatment planning',
        'Provide hope and information about recovery'
      ]
    },
    scoring: {
      method: 'Sum scores for all 20 items (range 0-80). Items rated from 0 (Not at all) to 4 (Extremely)',
      interpretation: {
        ranges: [
          {
            range: '0-32',
            interpretation: 'Below PTSD threshold',
            recommendation: 'Monitor symptoms. Provide psychoeducation and healthy coping strategies.',
            level: 'low'
          },
          {
            range: '33-37',
            interpretation: 'Possible PTSD - further evaluation needed',
            recommendation: 'Clinical interview recommended to confirm diagnosis. Consider trauma-focused treatment.',
            level: 'moderate'
          },
          {
            range: '38-49',
            interpretation: 'Probable PTSD - moderate severity',
            recommendation: 'Evidence-based trauma treatment indicated. Consider medication evaluation.',
            level: 'high'
          },
          {
            range: '50-80',
            interpretation: 'Probable PTSD - severe symptoms',
            recommendation: 'Intensive trauma-focused treatment needed. Consider inpatient or intensive outpatient care.',
            level: 'severe'
          }
        ]
      },
      clinicalNotes: [
        'Cutoff score of 33 indicates probable PTSD',
        'Higher scores indicate greater symptom severity',
        'Monitor specific symptom clusters for treatment planning',
        'Consider using for treatment outcome measurement'
      ]
    },
    safetyConsiderations: [
      'Assess for severe depression and suicide risk',
      'Evaluate functioning in major life areas',
      'Screen for substance abuse as self-medication',
      'Consider impact on relationships and social support'
    ],
    followUpActions: [
      'Probable PTSD: Begin evidence-based trauma treatment',
      'High severity: Consider intensive or specialized care',
      'Regular monitoring using PCL-5 to track progress',
      'Coordinate care with other providers as needed'
    ]
  },
  {
    id: 'btq',
    name: 'Brief Trauma Questionnaire (BTQ)',
    purpose: 'Screens for lifetime trauma exposure across multiple categories to identify potentially traumatic life events.',
    administration: {
      timeframe: '10-15 minutes',
      setting: 'Clinical settings, research environments, or any setting requiring trauma exposure assessment.',
      administeringGuidelines: [
        'Create a safe, supportive environment',
        'Explain that this assesses exposure, not detailed descriptions',
        'Emphasize that they don\'t need to provide details about events',
        'Allow self-paced completion'
      ],
      traumaInformed: [
        'Normalize that many people have traumatic experiences',
        'Emphasize client control over sharing information',
        'Provide grounding techniques if memories arise',
        'Validate courage in completing the assessment'
      ]
    },
    instructions: {
      beforeStarting: [
        'Ensure privacy and confidentiality',
        'Explain the purpose is to understand life experiences',
        'Clarify that detailed descriptions are not required',
        'Have support resources readily available'
      ],
      duringAssessment: [
        'Read each event category carefully',
        'Allow time to think about each question',
        'Watch for signs of distress or overwhelm',
        'Offer breaks between difficult questions',
        'Remain calm and supportive'
      ],
      afterCompletion: [
        'Acknowledge client\'s strength in completing the assessment',
        'Normalize the range of human experiences',
        'Discuss results in context of overall wellbeing',
        'Provide immediate support strategies if needed',
        'Plan appropriate follow-up care'
      ]
    },
    scoring: {
      method: 'Count the number of trauma categories endorsed (Yes responses)',
      interpretation: {
        ranges: [
          {
            range: '0',
            interpretation: 'No trauma exposure reported',
            recommendation: 'Continue supportive care. Monitor for any emerging concerns.',
            level: 'low'
          },
          {
            range: '1-2',
            interpretation: 'Limited trauma exposure',
            recommendation: 'Consider trauma-informed care approaches. Monitor for trauma-related symptoms.',
            level: 'low'
          },
          {
            range: '3-4',
            interpretation: 'Moderate trauma exposure',
            recommendation: 'Consider comprehensive trauma screening (PCL-5). Trauma-informed interventions recommended.',
            level: 'moderate'
          },
          {
            range: '5+',
            interpretation: 'Extensive trauma exposure',
            recommendation: 'Comprehensive PTSD assessment recommended. Consider specialized trauma treatment.',
            level: 'high'
          }
        ]
      },
      clinicalNotes: [
        'Higher exposure counts increase risk for PTSD and other mental health issues',
        'Consider cumulative impact of multiple traumas',
        'Assess for trauma-related symptoms even with single exposure',
        'Document specific types for treatment planning'
      ]
    },
    safetyConsiderations: [
      'Assess for ongoing trauma exposure',
      'Evaluate current coping strategies',
      'Screen for substance use and self-harm',
      'Consider impact on current relationships and functioning'
    ],
    followUpActions: [
      'Multiple exposures: Comprehensive trauma assessment recommended',
      'Provide psychoeducation about trauma responses',
      'Consider trauma-focused therapy referral',
      'Develop trauma-informed treatment plan'
    ]
  },
  {
    id: 'ctsq',
    name: 'Child Trauma Screening Questionnaire (CTSQ)',
    purpose: 'Brief screening tool for trauma exposure and symptoms in children and adolescents (ages 8-18).',
    administration: {
      timeframe: '5-10 minutes',
      setting: 'Pediatric clinics, schools, child mental health settings, or any setting serving youth.',
      administeringGuidelines: [
        'Ensure age-appropriate language and approach',
        'Consider developmental level and capacity',
        'May require parent/guardian consent',
        'Create child-friendly, safe environment'
      ],
      traumaInformed: [
        'Use simple, non-threatening language',
        'Validate child\'s feelings and experiences',
        'Emphasize child\'s bravery and strength',
        'Provide reassurance about safety'
      ]
    },
    instructions: {
      beforeStarting: [
        'Assess child\'s comfort and safety',
        'Explain in age-appropriate terms what the questions are about',
        'Ensure appropriate adult support is available',
        'Confirm understanding of confidentiality and reporting limits'
      ],
      duringAssessment: [
        'Use child-friendly version of questions when available',
        'Speak slowly and clearly',
        'Watch for signs of confusion or distress',
        'Offer breaks or comfort items as needed',
        'Remain patient and supportive'
      ],
      afterCompletion: [
        'Praise child for their honesty and courage',
        'Provide immediate comfort and support',
        'Explain next steps in age-appropriate way',
        'Coordinate with parents/guardians as appropriate',
        'Ensure child feels safe and supported'
      ]
    },
    scoring: {
      method: 'Count the number of "Yes" responses to all 10 items',
      interpretation: {
        ranges: [
          {
            range: '0-2',
            interpretation: 'Minimal trauma symptoms',
            recommendation: 'Continue supportive care. Monitor for any changes in behavior or symptoms.',
            level: 'low'
          },
          {
            range: '3-4',
            interpretation: 'Moderate trauma symptoms',
            recommendation: 'Consider more detailed trauma assessment. Trauma-informed interventions may be helpful.',
            level: 'moderate'
          },
          {
            range: '5+',
            interpretation: 'Significant trauma symptoms (cutoff met)',
            recommendation: 'Comprehensive trauma evaluation recommended. Specialized treatment for children indicated.',
            level: 'high'
          }
        ]
      },
      clinicalNotes: [
        'Cutoff of 5+ indicates probable trauma symptoms requiring attention',
        'Sensitivity: 85%, Specificity: 75%',
        'Consider developmental factors in interpretation',
        'Involve caregivers in treatment planning as appropriate'
      ]
    },
    safetyConsiderations: [
      'Assess for ongoing safety concerns',
      'Evaluate family and home environment',
      'Screen for abuse or neglect',
      'Consider mandatory reporting requirements'
    ],
    followUpActions: [
      'High scores: Comprehensive child trauma evaluation',
      'Involve family in treatment planning',
      'Consider school-based interventions',
      'Coordinate with child protective services if needed'
    ]
  },
  {
    id: 'lec-5',
    name: 'Life Events Checklist for DSM-5 (LEC-5)',
    purpose: 'Identifies potentially traumatic events for use in PTSD assessment and treatment planning.',
    administration: {
      timeframe: '10-15 minutes',
      setting: 'Clinical settings where PTSD assessment is needed, particularly before administering CAPS-5 or PCL-5.',
      administeringGuidelines: [
        'Use as prelude to comprehensive PTSD assessment',
        'Explain this helps identify events for further evaluation',
        'Clarify different types of exposure (direct, witnessed, learned about, job-related)',
        'Maintain focus on exposure, not symptom details'
      ],
      traumaInformed: [
        'Normalize different types of trauma exposure',
        'Validate that all forms of exposure can be impactful',
        'Provide choice in discussing specific events',
        'Emphasize client control over sharing details'
      ]
    },
    instructions: {
      beforeStarting: [
        'Explain purpose as preparation for PTSD assessment',
        'Clarify different exposure categories',
        'Ensure understanding that details are not required',
        'Prepare for potential emotional responses'
      ],
      duringAssessment: [
        'Read each life event carefully',
        'Clarify exposure type (happened to me, witnessed, learned about, part of job)',
        'Allow time to consider each event',
        'Watch for emotional responses to specific events',
        'Provide support if memories arise'
      ],
      afterCompletion: [
        'Help client identify worst event for further assessment',
        'Normalize range of potentially traumatic experiences',
        'Discuss next steps in PTSD assessment process',
        'Provide support for any distress that emerged',
        'Plan timing of comprehensive PTSD evaluation'
      ]
    },
    scoring: {
      method: 'Count exposures by type and identify DSM-5 Criterion A events (direct exposure and witnessing)',
      interpretation: {
        ranges: [
          {
            range: 'No Criterion A events',
            interpretation: 'Indirect exposure only or no traumatic events',
            recommendation: 'Consider impact of indirect exposure. PTSD diagnosis unlikely but assess for other mental health concerns.',
            level: 'low'
          },
          {
            range: '1-2 Criterion A events',
            interpretation: 'Limited direct trauma exposure',
            recommendation: 'Comprehensive PTSD screening recommended (PCL-5). Consider trauma-informed care approaches.',
            level: 'moderate'
          },
          {
            range: '3+ Criterion A events',
            interpretation: 'Multiple direct trauma exposures',
            recommendation: 'Comprehensive PTSD assessment essential (CAPS-5 or PCL-5). Consider specialized trauma treatment.',
            level: 'high'
          }
        ]
      },
      clinicalNotes: [
        'Primary purpose is to identify index trauma for PTSD assessment',
        'Multiple exposures increase PTSD risk',
        'Consider cumulative trauma effects',
        'Use worst event for PCL-5 or CAPS-5 administration'
      ]
    },
    safetyConsiderations: [
      'Assess for recent or ongoing trauma exposure',
      'Evaluate current coping and support systems',
      'Consider safety planning if ongoing risks identified',
      'Screen for trauma-related behaviors (substance use, self-harm)'
    ],
    followUpActions: [
      'Criterion A events present: Administer PCL-5 or CAPS-5 for worst event',
      'Multiple exposures: Consider complex trauma assessment',
      'Plan trauma-informed treatment approach',
      'Schedule timely follow-up for comprehensive evaluation'
    ]
  }
];

export const getInstructionsById = (id: string): AssessmentInstructions | undefined => {
  return assessmentInstructions.find(instruction => instruction.id === id);
};