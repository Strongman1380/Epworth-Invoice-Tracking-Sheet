
import { BookOpen, ExternalLink, Heart, FileText, Users, AlertTriangle } from 'lucide-react';

export const traumaAssessmentTools = {
  brief_screening_tools: [
    {
      name: "PC-PTSD-5",
      description: "A 5-item tool for rapid PTSD screening (2-3 minutes), free, and validated across diverse populations.",
      link: "https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd.asp",
      notes: "Free"
    },
    {
      name: "ACE Questionnaire",
      description: "A 10-item tool assessing adverse childhood experiences (3-5 minutes), free, and key for justice-involved individuals.",
      link: "https://www.cdc.gov/violenceprevention/aces/questionnaire.html",
      notes: "Free"
    },
    {
      name: "Trauma Screening Questionnaire (TSQ)",
      description: "A 10-item yes/no tool for post-incident screening (5 minutes), free, administered 3-4 weeks post-trauma.",
      link: "https://www.ptsd.va.gov/professional/assessment/screens/tsq.asp",
      notes: "Free"
    },
    {
      name: "Brief Trauma Questionnaire (BTQ)",
      description: "A brief tool focusing on DSM-5 Criterion A trauma exposure, free, and complements other screens.",
      link: "https://www.ptsd.va.gov/professional/assessment/screens/btq.asp",
      notes: "Free"
    },
    {
      name: "Child Trauma Screening Questionnaire (CTSQ)",
      description: "A 1-2 minute tool for youth, free, with a score of 5+ indicating high PTSD risk.",
      link: "https://www.nctsn.org/measures/child-trauma-screening-questionnaire",
      notes: "Free"
    },
    {
      name: "MAYSI-2 (Massachusetts Youth Screening Instrument)",
      description: "A mental health screening tool for juvenile justice settings, including trauma components, designed for detention staff.",
      link: "https://www.umassmed.edu/psychiatry/services/youth-screening-instrument/",
      notes: "Requires purchase or licensing"
    },
    {
      name: "BJMHS (Brief Jail Mental Health Screen)",
      description: "A brief tool for mental health screening in jail settings, including trauma, free and efficient.",
      link: "https://www.prainc.com/bjmhs/",
      notes: "Free"
    }
  ],
  comprehensive_assessment_instruments: [
    {
      name: "CAPS-5 (Clinician-Administered PTSD Scale for DSM-5)",
      description: "A 45-60 minute structured interview, the clinical gold standard for PTSD assessment, with online training available.",
      link: "https://www.ptsd.va.gov/professional/assessment/adult-int/caps.asp",
      notes: "Free, requires training"
    },
    {
      name: "Trauma Symptom Inventory-2 (TSI-2)",
      description: "A 136-item, 20-minute self-report tool assessing broad trauma symptoms, with validity scales, requires purchase.",
      link: "https://www.parinc.com/Products/Pkey/475",
      notes: "Requires purchase from PAR"
    },
    {
      name: "Complex Trauma Inventory (CTI)",
      description: "A free, 20-item tool assessing complex trauma per ICD-11 criteria, evaluating six symptom clusters.",
      link: "https://istss.org/clinical-resources/assessing-trauma/complex-trauma-inventory",
      notes: "Free - Contact ISTSS for access"
    },
    {
      name: "UCLA PTSD Reaction Index (UCLA PTSD-RI-5)",
      description: "A 15-30 minute tool for youth (ages 7-21), assessing trauma exposure and DSM-5 PTSD symptoms, with parent versions.",
      link: "https://www.ptsd.va.gov/professional/assessment/child/ucla-ptsd-ri.asp",
      notes: "Requires purchase or licensing"
    }
  ],
  youth_specific: [
    {
      name: "Childhood Trauma Questionnaire (CTQ)",
      description: "A 28-item short form (5-10 minutes) assessing childhood maltreatment across five domains, with validity scales.",
      link: "https://www.pearsonassessments.com/store/usassessments/en/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Childhood-Trauma-Questionnaire/p/100000453.html",
      notes: "Requires purchase from Pearson"
    },
    {
      name: "Trauma Symptom Checklist for Children (TSCC)",
      description: "A 54-item, 15-20 minute tool for ages 8-16, measuring post-traumatic stress and related symptoms.",
      link: "https://www.pearsonassessments.com/store/usassessments/en/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Trauma-Symptom-Checklist-for-Children/p/100000454.html",
      notes: "Requires purchase from Pearson"
    },
    {
      name: "Child PTSD Symptom Scale for DSM-5 (CPSS-5)",
      description: "A free tool for ages 8-18, available in self-report and interview formats, assessing PTSD and impairment.",
      link: "https://www.ptsd.va.gov/professional/assessment/child/cpss.asp",
      notes: "Free"
    }
  ],
  criminal_justice: [
    {
      name: "Women's Risk/Needs Assessment (WRNA)",
      description: "A validated tool for system-impacted women, assessing trauma, PTSD, and criminogenic factors, available in three versions.",
      link: "https://cech.uc.edu/about/centers/ucci/services/university-of-cincinnati-corrections-institute/womens-risk-needs-assessment.html",
      notes: "Requires training or purchase"
    },
    {
      name: "Level of Service Inventory-Revised (LSI-R)",
      description: "A 54-item criminogenic tool incorporating trauma-related factors, particularly in emotional and family subscales.",
      link: "https://www.mhs.com/MHS-Assessment?prodname=lsi-r",
      notes: "Requires purchase from MHS"
    }
  ]
};

export const resourceCategories = [
  {
    title: "Trauma-Informed Care Guidelines",
    icon: BookOpen,
    resources: [
      {
        title: "SAMHSA Trauma-Informed Care in Behavioral Services",
        description: "Comprehensive guide to implementing trauma-informed approaches",
        type: "PDF Guide",
        downloadUrl: "https://store.samhsa.gov/sites/default/files/SAMHSA_Digital_Download/PEP21-01-01-003.pdf",
        viewUrl: "https://www.samhsa.gov/resource/dbhis/tip-57-trauma-informed-care-behavioral-health-services"
      },
      {
        title: "The Body Keeps the Score - Key Concepts",
        description: "Summary of essential trauma recovery principles",
        type: "Article",
        downloadUrl: null,
        viewUrl: "https://www.traumainformedcare.chcs.org/what-is-trauma-informed-care/"
      }
    ]
  },
  {
    title: "Client Resources",
    icon: Heart,
    resources: [
      {
        title: "Grounding Techniques for Trauma Survivors",
        description: "Practical exercises for managing trauma symptoms",
        type: "Handout",
        downloadUrl: null,
        viewUrl: "https://www.ptsd.va.gov/understand/related/grounding.asp"
      },
      {
        title: "Building Safety and Stability",
        description: "Self-care strategies for trauma recovery",
        type: "Worksheet",
        downloadUrl: null,
        viewUrl: "https://www.nctsn.org/resources/building-safety-and-stability-worksheet"
      }
    ]
  },
  {
    title: "Crisis Resources",
    icon: ExternalLink,
    resources: [
      {
        title: "National Suicide Prevention Lifeline",
        description: "24/7 crisis support - 988",
        type: "Hotline",
        downloadUrl: null,
        viewUrl: "https://988lifeline.org/"
      },
      {
        title: "RAINN National Sexual Assault Hotline",
        description: "24/7 support for sexual assault survivors",
        type: "Hotline",
        downloadUrl: null,
        viewUrl: "https://www.rainn.org/about-national-sexual-assault-telephone-hotline"
      }
    ]
  }
];

export const assessmentGuidelines = [
  {
    tool: "ACE Questionnaire",
    guidelines: [
      "Explain the purpose and confidentiality before beginning",
      "Allow clients to skip questions they're uncomfortable answering",
      "Normalize responses and emphasize that experiences don't define them",
      "Discuss scoring in context of resilience and post-traumatic growth"
    ]
  },
  {
    tool: "PCL-5",
    guidelines: [
      "Assess for current safety before administering",
      "Explain that symptoms are normal responses to trauma",
      "Be prepared to provide immediate support if high distress is evident",
      "Connect responses to treatment planning and hope for recovery"
    ]
  }
];
