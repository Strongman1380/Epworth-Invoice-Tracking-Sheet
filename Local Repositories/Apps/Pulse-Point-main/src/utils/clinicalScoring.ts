// Clinical Scoring and Interpretation Utilities for Manual Assessment Entries
// Phase 2: Licensed Assessment Interpretation

export interface ScoreInterpretation {
  category: 'Low' | 'Low/Moderate' | 'Moderate' | 'Moderate/Severe' | 'Severe' | 'Very High';
  description: string;
  clinicalActions: string[];
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
}

export interface ManualAssessmentResult {
  toolId: string;
  toolName: string;
  scores: Record<string, number>;
  totalScore?: number;
  interpretations: Record<string, ScoreInterpretation>;
  overallRiskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  clinicalRecommendations: string[];
  administrationDate: string;
  clinicalNotes?: string;
}

// TSI-2 Clinical Interpretation
export const interpretTSI2Scores = (scores: Record<string, number>): ManualAssessmentResult => {
  const interpretations: Record<string, ScoreInterpretation> = {};
  
  // TSI-2 T-score interpretation (population mean = 50, SD = 10)
  const interpretTScore = (score: number, subscaleName: string): ScoreInterpretation => {
    if (score < 50) {
      return {
        category: 'Low',
        description: `${subscaleName} symptoms are below average compared to trauma-exposed populations.`,
        clinicalActions: ['Monitor for changes', 'Document baseline functioning'],
        riskLevel: 'Low'
      };
    } else if (score < 60) {
      return {
        category: 'Low/Moderate', 
        description: `${subscaleName} symptoms are within normal range for trauma-exposed individuals.`,
        clinicalActions: ['Continue monitoring', 'Consider preventive interventions'],
        riskLevel: 'Low'
      };
    } else if (score < 70) {
      return {
        category: 'Moderate',
        description: `${subscaleName} symptoms are moderately elevated and may require clinical attention.`,
        clinicalActions: ['Consider targeted intervention', 'Monitor closely', 'Evaluate for therapy referral'],
        riskLevel: 'Moderate'
      };
    } else if (score < 80) {
      return {
        category: 'Moderate/Severe',
        description: `${subscaleName} symptoms are significantly elevated and likely require treatment.`,
        clinicalActions: ['Recommend therapy/treatment', 'Develop safety plan if needed', 'Regular monitoring'],
        riskLevel: 'High'
      };
    } else {
      return {
        category: 'Severe',
        description: `${subscaleName} symptoms are severely elevated and require immediate clinical attention.`,
        clinicalActions: ['Immediate therapy referral', 'Safety assessment', 'Consider medication evaluation', 'Crisis planning'],
        riskLevel: 'Very High'
      };
    }
  };

  // Interpret each subscale
  Object.entries(scores).forEach(([subscale, score]) => {
    if (typeof score === 'number') {
      interpretations[subscale] = interpretTScore(score, subscale);
    }
  });

  // Determine overall risk level
  const riskLevels = Object.values(interpretations).map(i => i.riskLevel);
  let overallRiskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
  
  if (riskLevels.includes('Very High')) overallRiskLevel = 'Very High';
  else if (riskLevels.includes('High')) overallRiskLevel = 'High';
  else if (riskLevels.includes('Moderate')) overallRiskLevel = 'Moderate';

  // Clinical recommendations based on overall profile
  const clinicalRecommendations: string[] = [];
  if (overallRiskLevel === 'Very High') {
    clinicalRecommendations.push('Immediate comprehensive trauma treatment recommended');
    clinicalRecommendations.push('Safety assessment and crisis planning essential');
    clinicalRecommendations.push('Consider medication evaluation for symptom management');
  } else if (overallRiskLevel === 'High') {
    clinicalRecommendations.push('Trauma-focused therapy strongly recommended');
    clinicalRecommendations.push('Regular monitoring and support services');
    clinicalRecommendations.push('Consider adjunct interventions (groups, case management)');
  } else if (overallRiskLevel === 'Moderate') {
    clinicalRecommendations.push('Consider trauma-focused counseling or therapy');
    clinicalRecommendations.push('Psychoeducation about trauma responses');
    clinicalRecommendations.push('Monitor for symptom progression');
  } else {
    clinicalRecommendations.push('Continue monitoring and supportive care');
    clinicalRecommendations.push('Maintain protective factors and coping skills');
  }

  return {
    toolId: 'tsi2',
    toolName: 'Trauma Symptom Inventory-2 (TSI-2)',
    scores,
    interpretations,
    overallRiskLevel,
    clinicalRecommendations,
    administrationDate: new Date().toISOString().split('T')[0]
  };
};

// CAPS-5 Clinical Interpretation
export const interpretCAPS5Scores = (scores: Record<string, number>): ManualAssessmentResult => {
  const interpretations: Record<string, ScoreInterpretation> = {};
  
  const totalScore = scores['Total Severity Score'] || 0;
  
  // CAPS-5 Total Score interpretation
  const interpretTotalScore = (score: number): ScoreInterpretation => {
    if (score < 23) {
      return {
        category: 'Low',
        description: 'PTSD symptoms are minimal. Total score below diagnostic threshold.',
        clinicalActions: ['Monitor for changes', 'Document current functioning'],
        riskLevel: 'Low'
      };
    } else if (score < 33) {
      return {
        category: 'Low/Moderate',
        description: 'Mild PTSD symptoms present. Score suggests possible subsyndromal PTSD.',
        clinicalActions: ['Consider watchful waiting', 'Provide psychoeducation', 'Monitor symptoms'],
        riskLevel: 'Low'
      };
    } else if (score < 45) {
      return {
        category: 'Moderate',
        description: 'Moderate PTSD symptoms. Score indicates probable PTSD diagnosis.',
        clinicalActions: ['PTSD-specific treatment recommended', 'Comprehensive assessment', 'Safety evaluation'],
        riskLevel: 'Moderate'
      };
    } else if (score < 65) {
      return {
        category: 'Moderate/Severe',
        description: 'Severe PTSD symptoms significantly impacting functioning.',
        clinicalActions: ['Immediate trauma treatment', 'Safety planning', 'Consider intensive services'],
        riskLevel: 'High'
      };
    } else {
      return {
        category: 'Severe',
        description: 'Extremely severe PTSD symptoms requiring intensive intervention.',
        clinicalActions: ['Crisis intervention', 'Intensive trauma therapy', 'Medical evaluation', 'Safety planning'],
        riskLevel: 'Very High'
      };
    }
  };

  // Criterion cluster interpretation
  const interpretClusterScore = (score: number, criterion: string): ScoreInterpretation => {
    const clusterThresholds = {
      'Criterion B (Intrusion)': { mild: 6, moderate: 12, severe: 18 },
      'Criterion C (Avoidance)': { mild: 3, moderate: 6, severe: 9 },
      'Criterion D (Negative Cognitions)': { mild: 8, moderate: 16, severe: 24 },
      'Criterion E (Alterations in Arousal)': { mild: 8, moderate: 16, severe: 24 }
    };
    
    const thresholds = clusterThresholds[criterion as keyof typeof clusterThresholds] || { mild: 5, moderate: 10, severe: 15 };
    
    if (score < thresholds.mild) {
      return {
        category: 'Low',
        description: `${criterion} symptoms are minimal.`,
        clinicalActions: ['Continue monitoring'],
        riskLevel: 'Low'
      };
    } else if (score < thresholds.moderate) {
      return {
        category: 'Moderate',
        description: `${criterion} symptoms are present and may require intervention.`,
        clinicalActions: ['Target in treatment planning', 'Monitor progression'],
        riskLevel: 'Moderate'
      };
    } else {
      return {
        category: 'Severe',
        description: `${criterion} symptoms are severe and require focused treatment.`,
        clinicalActions: ['Priority treatment target', 'Specialized interventions'],
        riskLevel: 'High'
      };
    }
  };

  // Interpret total score
  interpretations['Total Severity Score'] = interpretTotalScore(totalScore);

  // Interpret criterion clusters
  Object.entries(scores).forEach(([subscale, score]) => {
    if (subscale !== 'Total Severity Score' && typeof score === 'number') {
      interpretations[subscale] = interpretClusterScore(score, subscale);
    }
  });

  // Overall risk level based on total score
  const overallRiskLevel = interpretations['Total Severity Score'].riskLevel;

  // Clinical recommendations
  const clinicalRecommendations: string[] = [];
  if (totalScore >= 45) {
    clinicalRecommendations.push('Evidence-based PTSD treatment (CPT, PE, EMDR) strongly recommended');
    clinicalRecommendations.push('Consider medication evaluation (SSRIs, SNRIs)');
    clinicalRecommendations.push('Safety assessment for self-harm or substance use');
  } else if (totalScore >= 33) {
    clinicalRecommendations.push('PTSD-focused therapy recommended');
    clinicalRecommendations.push('Monitor for symptom progression');
    clinicalRecommendations.push('Psychoeducation about trauma responses');
  } else if (totalScore >= 23) {
    clinicalRecommendations.push('Consider supportive counseling or brief intervention');
    clinicalRecommendations.push('Monitor symptoms over time');
    clinicalRecommendations.push('Promote coping skills and resilience');
  } else {
    clinicalRecommendations.push('Continue supportive monitoring');
    clinicalRecommendations.push('Maintain current coping strategies');
  }

  return {
    toolId: 'caps5',
    toolName: 'Clinician-Administered PTSD Scale for DSM-5 (CAPS-5)',
    scores,
    totalScore,
    interpretations,
    overallRiskLevel,
    clinicalRecommendations,
    administrationDate: new Date().toISOString().split('T')[0]
  };
};

// CTQ Clinical Interpretation  
export const interpretCTQScores = (scores: Record<string, number>): ManualAssessmentResult => {
  const interpretations: Record<string, ScoreInterpretation> = {};
  
  // CTQ subscale interpretation (range 5-25 per subscale)
  const interpretCTQSubscale = (score: number, subscale: string): ScoreInterpretation => {
    // Clinical cutoffs based on Bernstein & Fink (1998)
    const cutoffs = {
      'Emotional Abuse': { none: 8, low: 12, moderate: 15, severe: 21 },
      'Physical Abuse': { none: 7, low: 9, moderate: 12, severe: 18 },
      'Sexual Abuse': { none: 5, low: 7, moderate: 12, severe: 19 },
      'Emotional Neglect': { none: 9, low: 14, moderate: 17, severe: 22 },
      'Physical Neglect': { none: 7, low: 9, moderate: 12, severe: 16 }
    };
    
    const thresholds = cutoffs[subscale as keyof typeof cutoffs] || { none: 8, low: 12, moderate: 15, severe: 20 };
    
    if (score <= thresholds.none) {
      return {
        category: 'Low',
        description: `No significant history of ${subscale.toLowerCase()}.`,
        clinicalActions: ['Document protective factors'],
        riskLevel: 'Low'
      };
    } else if (score <= thresholds.low) {
      return {
        category: 'Low/Moderate',
        description: `Minimal to low level ${subscale.toLowerCase()} reported.`,
        clinicalActions: ['Monitor for related symptoms', 'Consider impact on current functioning'],
        riskLevel: 'Low'
      };
    } else if (score <= thresholds.moderate) {
      return {
        category: 'Moderate',
        description: `Moderate level ${subscale.toLowerCase()} reported.`,
        clinicalActions: ['Address in treatment planning', 'Trauma-informed interventions', 'Monitor for related symptoms'],
        riskLevel: 'Moderate'
      };
    } else if (score <= thresholds.severe) {
      return {
        category: 'Moderate/Severe',
        description: `Severe level ${subscale.toLowerCase()} reported.`,
        clinicalActions: ['Priority treatment focus', 'Trauma-specific therapy', 'Safety assessment'],
        riskLevel: 'High'
      };
    } else {
      return {
        category: 'Severe',
        description: `Extreme level ${subscale.toLowerCase()} reported.`,
        clinicalActions: ['Intensive trauma treatment', 'Comprehensive safety planning', 'Specialized services'],
        riskLevel: 'Very High'
      };
    }
  };

  // Interpret each subscale
  Object.entries(scores).forEach(([subscale, score]) => {
    if (typeof score === 'number') {
      interpretations[subscale] = interpretCTQSubscale(score, subscale);
    }
  });

  // Determine overall risk level
  const riskLevels = Object.values(interpretations).map(i => i.riskLevel);
  let overallRiskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
  
  if (riskLevels.includes('Very High')) overallRiskLevel = 'Very High';
  else if (riskLevels.includes('High')) overallRiskLevel = 'High';
  else if (riskLevels.includes('Moderate')) overallRiskLevel = 'Moderate';

  // Clinical recommendations
  const clinicalRecommendations: string[] = [];
  if (overallRiskLevel === 'Very High') {
    clinicalRecommendations.push('Complex trauma treatment recommended (Phase-oriented approach)');
    clinicalRecommendations.push('Address attachment and developmental impacts');
    clinicalRecommendations.push('Consider residential or intensive outpatient services');
  } else if (overallRiskLevel === 'High') {
    clinicalRecommendations.push('Trauma-focused therapy with attention to childhood origins');
    clinicalRecommendations.push('Address core beliefs and attachment patterns');
    clinicalRecommendations.push('Build safety and stabilization skills');
  } else if (overallRiskLevel === 'Moderate') {
    clinicalRecommendations.push('Trauma-informed therapy addressing childhood experiences');
    clinicalRecommendations.push('Focus on coping skills and emotional regulation');
    clinicalRecommendations.push('Monitor for impact on current relationships');
  } else {
    clinicalRecommendations.push('Continue supportive care with awareness of history');
    clinicalRecommendations.push('Maintain protective factors and resilience');
  }

  return {
    toolId: 'ctq',
    toolName: 'Childhood Trauma Questionnaire (CTQ)',
    scores,
    interpretations,
    overallRiskLevel,
    clinicalRecommendations,
    administrationDate: new Date().toISOString().split('T')[0]
  };
};

// MAYSI-2 Clinical Interpretation
export const interpretMAYSI2Scores = (scores: Record<string, number>): ManualAssessmentResult => {
  const interpretations: Record<string, ScoreInterpretation> = {};
  
  // MAYSI-2 cutoff scores (Caution and Warning levels)
  const cutoffs = {
    'Alcohol/Drug Use': { caution: 4, warning: 7 },
    'Angry-Irritable': { caution: 5, warning: 8 },
    'Depressed-Anxious': { caution: 3, warning: 6 },
    'Somatic Complaints': { caution: 3, warning: 6 },
    'Suicide Ideation': { caution: 2, warning: 3 },
    'Thought Disturbance': { caution: 1, warning: 2 },
    'Traumatic Experiences': { caution: 3, warning: 6 }
  };

  const interpretMAYSI2Scale = (score: number, subscale: string): ScoreInterpretation => {
    const thresholds = cutoffs[subscale as keyof typeof cutoffs] || { caution: 3, warning: 6 };
    
    if (score < thresholds.caution) {
      return {
        category: 'Low',
        description: `${subscale} scores are within normal range for justice-involved youth.`,
        clinicalActions: ['Continue standard monitoring'],
        riskLevel: 'Low'
      };
    } else if (score < thresholds.warning) {
      return {
        category: 'Moderate',
        description: `${subscale} scores reach caution level - monitoring and intervention may be needed.`,
        clinicalActions: ['Enhanced monitoring', 'Consider targeted intervention', 'Follow-up assessment'],
        riskLevel: 'Moderate'
      };
    } else {
      return {
        category: 'Severe',
        description: `${subscale} scores reach warning level - immediate attention and intervention required.`,
        clinicalActions: ['Immediate intervention', 'Specialized services referral', 'Safety assessment'],
        riskLevel: subscale === 'Suicide Ideation' ? 'Very High' : 'High'
      };
    }
  };

  // Interpret each subscale
  Object.entries(scores).forEach(([subscale, score]) => {
    if (typeof score === 'number') {
      interpretations[subscale] = interpretMAYSI2Scale(score, subscale);
    }
  });

  // Special attention to suicide ideation
  const suicideScore = scores['Suicide Ideation'] || 0;
  if (suicideScore >= 2) {
    interpretations['Suicide Ideation'].clinicalActions.unshift('IMMEDIATE SUICIDE RISK ASSESSMENT REQUIRED');
  }

  // Determine overall risk level
  const riskLevels = Object.values(interpretations).map(i => i.riskLevel);
  let overallRiskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
  
  if (riskLevels.includes('Very High')) overallRiskLevel = 'Very High';
  else if (riskLevels.includes('High')) overallRiskLevel = 'High';
  else if (riskLevels.includes('Moderate')) overallRiskLevel = 'Moderate';

  // Clinical recommendations
  const clinicalRecommendations: string[] = [];
  
  if (suicideScore >= 2) {
    clinicalRecommendations.push('🚨 IMMEDIATE SUICIDE RISK ASSESSMENT AND SAFETY PLANNING REQUIRED');
  }
  
  if (overallRiskLevel === 'Very High' || overallRiskLevel === 'High') {
    clinicalRecommendations.push('Comprehensive mental health evaluation recommended');
    clinicalRecommendations.push('Consider specialized placement or intensive services');
    clinicalRecommendations.push('Coordinate with juvenile justice and mental health systems');
  } else if (overallRiskLevel === 'Moderate') {
    clinicalRecommendations.push('Enhanced monitoring and supportive services');
    clinicalRecommendations.push('Consider group or individual counseling');
    clinicalRecommendations.push('Family involvement and support');
  } else {
    clinicalRecommendations.push('Continue standard monitoring and support');
    clinicalRecommendations.push('Maintain protective factors');
  }

  return {
    toolId: 'maysi2',
    toolName: 'Massachusetts Youth Screening Instrument-2 (MAYSI-2)',
    scores,
    interpretations,
    overallRiskLevel,
    clinicalRecommendations,
    administrationDate: new Date().toISOString().split('T')[0]
  };
};

// Main interpretation function
export const interpretManualAssessment = (
  toolId: string, 
  scores: Record<string, number>, 
  administrationDate: string,
  clinicalNotes?: string
): ManualAssessmentResult => {
  let result: ManualAssessmentResult;
  
  switch (toolId) {
    case 'tsi2':
      result = interpretTSI2Scores(scores);
      break;
    case 'caps5':
      result = interpretCAPS5Scores(scores);
      break;
    case 'ctq':
      result = interpretCTQScores(scores);
      break;
    case 'maysi2':
      result = interpretMAYSI2Scores(scores);
      break;
    default:
      // Generic interpretation for unknown tools
      result = {
        toolId,
        toolName: 'Manual Assessment Entry',
        scores,
        interpretations: {},
        overallRiskLevel: 'Moderate',
        clinicalRecommendations: ['Review scores with qualified clinician', 'Follow standard clinical procedures'],
        administrationDate
      };
  }

  // Add administration date and clinical notes
  result.administrationDate = administrationDate;
  if (clinicalNotes) {
    result.clinicalNotes = clinicalNotes;
  }

  return result;
};