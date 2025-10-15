
import React, { useState } from 'react';
import { FileText, Users, Clock, Star, Lock, ExternalLink, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const AssessmentLibrary = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const assessmentTools = [
    // Free, Integrated Tools
    {
      id: 'ace',
      name: 'Adverse Childhood Experiences (ACE) Questionnaire',
      shortName: 'ACE',
      description: 'Screens for childhood trauma and adverse experiences that may impact adult health and behavior.',
      questions: 10,
      timeEstimate: '5-10 minutes',
      validated: true,
      usage: 'Most commonly used',
      category: 'Childhood Trauma',
      targetPopulation: 'Adults',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.cdc.gov/violenceprevention/aces/',
      type: 'screening'
    },
    {
      id: 'pc-ptsd-5',
      name: 'Primary Care PTSD Screen for DSM-5 (PC-PTSD-5)',
      shortName: 'PC-PTSD-5',
      description: 'Brief, 5-item screening instrument designed to identify individuals who may have probable PTSD.',
      questions: 6,
      timeEstimate: '3-5 minutes',
      validated: true,
      usage: 'Rapid screening',
      category: 'PTSD Screening',
      targetPopulation: 'Adults',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.ptsd.va.gov/professional/assessment/screens/pc-ptsd.asp',
      type: 'screening'
    },
    {
      id: 'tsq',
      name: 'Trauma Screening Questionnaire (TSQ)',
      shortName: 'TSQ',
      description: 'Brief 10-item screening instrument for PTSD symptoms following traumatic events.',
      questions: 10,
      timeEstimate: '5 minutes',
      validated: true,
      usage: 'Post-trauma screening',
      category: 'PTSD Screening',
      targetPopulation: 'Adults, 3-4 weeks post-trauma',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.kcl.ac.uk/research/tsq',
      type: 'screening'
    },
    {
      id: 'btq',
      name: 'Brief Trauma Questionnaire (BTQ)',
      shortName: 'BTQ',
      description: 'Screens for lifetime trauma exposure across multiple categories.',
      questions: 10,
      timeEstimate: '10 minutes',
      validated: true,
      usage: 'Trauma exposure assessment',
      category: 'Trauma Exposure',
      targetPopulation: 'Adults',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.ptsd.va.gov/professional/assessment/te-measures/btq.asp',
      type: 'screening'
    },
    {
      id: 'ctsq',
      name: 'Child Trauma Screening Questionnaire (CTSQ)',
      shortName: 'CTSQ',
      description: 'Brief screening tool for trauma exposure and symptoms in children and adolescents.',
      questions: 10,
      timeEstimate: '5-10 minutes',
      validated: true,
      usage: 'Child/Adolescent screening',
      category: 'Pediatric Trauma',
      targetPopulation: 'Children and Adolescents',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.nctsn.org/measures/child-trauma-screening-questionnaire',
      type: 'screening'
    },
    // Comprehensive Free Tools
    {
      id: 'pcl5',
      name: 'PTSD Checklist for DSM-5 (PCL-5)',
      shortName: 'PCL-5',
      description: 'Assesses the 20 DSM-5 symptoms of PTSD. Can be used to screen, make a provisional diagnosis, or monitor symptoms.',
      questions: 20,
      timeEstimate: '10-15 minutes',
      validated: true,
      usage: 'Comprehensive PTSD assessment',
      category: 'PTSD Assessment',
      targetPopulation: 'Adults',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp',
      type: 'comprehensive'
    },
    {
      id: 'lec5',
      name: 'Life Events Checklist for DSM-5 (LEC-5)',
      shortName: 'LEC-5',
      description: 'Identifies potentially traumatic events that may be related to PTSD symptoms.',
      questions: 17,
      timeEstimate: '10-15 minutes',
      validated: true,
      usage: 'Trauma exposure assessment',
      category: 'Trauma Exposure',
      targetPopulation: 'Adults',
      isProprietary: false,
      requiresTraining: false,
      sourceUrl: 'https://www.ptsd.va.gov/professional/assessment/te-measures/life_events_checklist.asp',
      type: 'comprehensive'
    },
    // Proprietary Tools
    {
      id: 'tsi2',
      name: 'Trauma Symptom Inventory-2 (TSI-2)',
      shortName: 'TSI-2',
      description: 'Comprehensive assessment of trauma-related symptoms in adults. Evaluates a broad range of psychological impacts.',
      questions: 136,
      timeEstimate: '20-30 minutes',
      validated: true,
      usage: 'Comprehensive clinical assessment',
      category: 'Comprehensive Trauma',
      targetPopulation: 'Adults',
      isProprietary: true,
      requiresTraining: true,
      purchaseUrl: 'https://www.parinc.com/Products/Pkey/492',
      sourceUrl: 'https://www.parinc.com/Products/Pkey/492',
      type: 'comprehensive'
    },
    {
      id: 'caps5',
      name: 'Clinician-Administered PTSD Scale for DSM-5 (CAPS-5)',
      shortName: 'CAPS-5',
      description: 'Gold standard structured interview for diagnosing PTSD. Requires extensive training.',
      questions: 30,
      timeEstimate: '45-60 minutes',
      validated: true,
      usage: 'Diagnostic interview',
      category: 'PTSD Assessment',
      targetPopulation: 'Adults',
      isProprietary: false,
      requiresTraining: true,
      sourceUrl: 'https://www.ptsd.va.gov/professional/assessment/adult-int/caps.asp',
      type: 'comprehensive'
    },
    {
      id: 'ctq',
      name: 'Childhood Trauma Questionnaire (CTQ)',
      shortName: 'CTQ',
      description: 'Retrospective assessment of childhood maltreatment across five domains.',
      questions: 28,
      timeEstimate: '15-20 minutes',
      validated: true,
      usage: 'Childhood trauma assessment',
      category: 'Childhood Trauma',
      targetPopulation: 'Adults (retrospective)',
      isProprietary: true,
      requiresTraining: true,
      purchaseUrl: 'https://www.pearsonassessments.com/store/usassessments/en/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Childhood-Trauma-Questionnaire/p/100000446.html',
      type: 'comprehensive'
    },
    {
      id: 'maysi2',
      name: 'Massachusetts Youth Screening Instrument-2 (MAYSI-2)',
      shortName: 'MAYSI-2',
      description: 'Mental health screening tool for youth in juvenile justice settings.',
      questions: 52,
      timeEstimate: '15-20 minutes',
      validated: true,
      usage: 'Juvenile justice screening',
      category: 'Justice System',
      targetPopulation: 'Youth (12-17 years)',
      isProprietary: true,
      requiresTraining: true,
      purchaseUrl: 'https://www.massyouthscreening.com/',
      type: 'screening'
    }
  ];

  const categories = ['all', 'PTSD Screening', 'PTSD Assessment', 'Childhood Trauma', 'Trauma Exposure', 'Pediatric Trauma', 'Comprehensive Trauma', 'Justice System'];
  const types = ['all', 'screening', 'comprehensive'];

  const filteredTools = assessmentTools.filter(tool => {
    const categoryMatch = selectedCategory === 'all' || tool.category === selectedCategory;
    const typeMatch = selectedType === 'all' || tool.type === selectedType;
    return categoryMatch && typeMatch;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Childhood Trauma': return 'bg-blue-100 text-blue-800';
      case 'PTSD Assessment': return 'bg-purple-100 text-purple-800';
      case 'PTSD Screening': return 'bg-emerald-100 text-emerald-800';
      case 'Comprehensive Trauma': return 'bg-red-100 text-red-800';
      case 'Trauma Exposure': return 'bg-green-100 text-green-800';
      case 'Pediatric Trauma': return 'bg-yellow-100 text-yellow-800';
      case 'Justice System': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUseAssessment = (tool: any) => {
    if (tool.isProprietary || tool.requiresTraining) {
      navigate(`/assessment/${tool.id}/manual-entry`);
    } else {
      navigate(`/assessment/${tool.id}/new-client`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Assessment Library</h1>
        <p className="text-slate-600 mt-1">Choose from validated trauma assessment tools</p>
      </div>

      {/* Filters */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Assessment Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-md bg-white"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 border border-blue-300 rounded-md bg-white"
              >
                {types.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type === 'screening' ? 'Screening Tools' : 'Comprehensive Assessments'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Tools Grid */}
      <div className="grid gap-6">
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{tool.name}</CardTitle>
                    {tool.validated && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="text-xs font-medium">Validated</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(tool.category)}`}>
                      {tool.category}
                    </span>
                    {tool.isProprietary && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <Lock className="h-3 w-3" />
                        Requires Purchase
                      </span>
                    )}
                    {tool.requiresTraining && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                        Training Required
                      </span>
                    )}
                    {!tool.isProprietary && !tool.requiresTraining && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Free & Integrated
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => handleUseAssessment(tool)}
                >
                  {tool.isProprietary || tool.requiresTraining ? 'Manual Entry' : 'Use Assessment'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">{tool.description}</p>
              
              <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {tool.questions} questions
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {tool.timeEstimate}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {tool.targetPopulation}
                </div>
              </div>

              <div className="flex gap-2">
                {tool.sourceUrl && (
                  <Button variant="outline" size="sm" onClick={() => window.open(tool.sourceUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Source
                  </Button>
                )}
                {tool.purchaseUrl && (
                  <Button variant="outline" size="sm" onClick={() => window.open(tool.purchaseUrl, '_blank')}>
                    <Lock className="h-4 w-4 mr-1" />
                    Purchase Tool
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-slate-500">No assessment tools match your current filters.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedType('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentLibrary;
