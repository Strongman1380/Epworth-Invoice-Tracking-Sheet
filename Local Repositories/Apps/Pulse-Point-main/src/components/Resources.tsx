
import React from 'react';
import { ExternalLink, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { traumaAssessmentTools, resourceCategories } from '../data/resourcesData';
import ResourcesHeader from './resources/ResourcesHeader';
import AssessmentToolSection from './resources/AssessmentToolSection';
import ResourceCategory from './resources/ResourceCategory';
import AssessmentGuidelines from './resources/AssessmentGuidelines';
import EmergencyProtocols from './resources/EmergencyProtocols';
import ResourcesFooter from './resources/ResourcesFooter';
import ChatBot from './ChatBot';

const Resources = () => {
  // Handle Download Function
  const handleDownload = (url: string | null, title: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`Download not available for ${title}. Please use the View button to access the resource.`);
    }
  };

  // Handle View Function
  const handleView = (url: string, title: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(`Failed to open link for ${title}:`, error);
      alert(`Unable to open link for ${title}. Please check your internet connection or try again later.`);
    }
  };

  // Get Cost Badge Color Function
  const getCostBadgeColor = (notes: string) => {
    if (notes.toLowerCase().includes('free')) {
      return 'bg-green-100 text-green-800';
    } else if (notes.toLowerCase().includes('purchase') || notes.toLowerCase().includes('licensing')) {
      return 'bg-red-100 text-red-800';
    } else if (notes.toLowerCase().includes('training')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="min-h-screen trauma-gradient">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <ResourcesHeader />

        {/* Trauma Assessment Tools Section */}
        <section>
          <div className="trauma-safe-card p-6 mb-6">
            <h2 className="provider-focus-header text-2xl mb-3 flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              Trauma Assessment Tools Directory
            </h2>
            <p className="text-slate-600">
              Comprehensive collection of evidence-based trauma assessment instruments with verified links and updated access information.
            </p>
          </div>

          <div className="space-y-6">
            <AssessmentToolSection
              title="Brief Screening Tools (2-5 minutes)"
              tools={traumaAssessmentTools.brief_screening_tools}
              description="Quick identification tools for initial trauma screening and triage"
              onView={handleView}
              getCostBadgeColor={getCostBadgeColor}
            />

            <AssessmentToolSection
              title="Comprehensive Assessment Instruments (15-60 minutes)"
              tools={traumaAssessmentTools.comprehensive_assessment_instruments}
              description="In-depth evaluation tools for detailed trauma symptom assessment"
              onView={handleView}
              getCostBadgeColor={getCostBadgeColor}
            />

            <AssessmentToolSection
              title="Youth-Specific Assessment Tools"
              tools={traumaAssessmentTools.youth_specific}
              description="Specialized instruments designed for children and adolescents"
              onView={handleView}
              getCostBadgeColor={getCostBadgeColor}
            />

            <AssessmentToolSection
              title="Criminal Justice Population Tools"
              tools={traumaAssessmentTools.criminal_justice}
              description="Assessment instruments validated for justice-involved individuals"
              onView={handleView}
              getCostBadgeColor={getCostBadgeColor}
            />

            <Card className="trauma-safe-card">
              <CardHeader>
                <CardTitle className="provider-focus-header text-xl flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  Additional Specialized Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">NCTSN Trauma Assessment Tools</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Comprehensive suite of trauma assessment tools from the National Child Traumatic Stress Network, 
                    flexible for various populations and settings.
                  </p>
                  <div className="flex gap-2">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Free
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleView("https://www.nctsn.org/treatments-and-practices/screening-and-assessments", "NCTSN Tools")}
                      className="gentle-interaction border-trauma-gentle"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Access NCTSN Tools
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Resource Categories */}
        <section>
          <div className="grid gap-6">
            {resourceCategories.map((category, index) => (
              <ResourceCategory
                key={index}
                title={category.title}
                icon={category.icon}
                resources={category.resources}
                onDownload={handleDownload}
                onView={handleView}
              />
            ))}
          </div>
        </section>

        {/* Assessment Guidelines */}
        <section>
          <AssessmentGuidelines />
        </section>

        {/* Emergency Protocols */}
        <section>
          <EmergencyProtocols />
        </section>

        {/* Provider Support Footer */}
        <ResourcesFooter />
      </div>
      
      {/* ChatBot component */}
      <ChatBot />
    </div>
  );
};

export default Resources;
