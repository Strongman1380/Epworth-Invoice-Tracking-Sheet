import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, AlertCircle, Mail, Phone, MapPin, UserPlus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { clientStorage, Client } from '../services/clientStorage';
import { assessmentStorage, AssessmentResult } from '../services/assessmentStorage';
import AIInsights from './AIInsights';

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (clientId) {
        const [clientData, assessmentData] = await Promise.all([
          clientStorage.getClientById(clientId),
          assessmentStorage.getAssessmentsByClient(clientId)
        ]);
        setClient(clientData);
        setAssessments(assessmentData);
      }
      setIsLoading(false);
    };

    loadData();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/clients')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Profile</h1>
            <p className="text-slate-600">Client ID: {clientId}</p>
          </div>
        </div>

        {/* Client Not Found State */}
        <Card className="trauma-safe-card">
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center p-6 bg-amber-50 rounded-full">
                <AlertCircle className="h-12 w-12 text-amber-600" />
              </div>
              <div>
                <h3 className="provider-focus-header text-2xl mb-3">
                  Client Profile Not Found
                </h3>
                <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                  The client profile you're looking for doesn't exist or may have been removed.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/clients')}
                  variant="outline"
                  className="gentle-interaction"
                >
                  <User className="h-4 w-4 mr-2" />
                  View All Clients
                </Button>
                <Button 
                  onClick={() => navigate('/assessments')}
                  className="safe-button gentle-interaction"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Start Assessment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-slate-600">Client ID: {client.id}</p>
        </div>
      </div>

      {/* Client Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">First Name</label>
                    <p className="text-slate-900">{client.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Last Name</label>
                    <p className="text-slate-900">{client.lastName}</p>
                  </div>
                  {client.dateOfBirth && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Date of Birth</label>
                      <p className="text-slate-900">{client.dateOfBirth}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-slate-600">Client Since</label>
                    <p className="text-slate-900">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => navigate(`/assessment/PCL-5/${clientId}`)}
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Start Assessment
                </Button>
                <Button 
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/clients')}
                >
                  <User className="h-4 w-4 mr-2" />
                  View All Clients
                </Button>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <div>
                      <label className="text-sm font-medium text-slate-600">Email</label>
                      <p className="text-slate-900">{client.email}</p>
                    </div>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <div>
                        <label className="text-sm font-medium text-slate-600">Phone</label>
                        <p className="text-slate-900">{client.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                {client.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                    <div>
                      <label className="text-sm font-medium text-slate-600">Address</label>
                      <p className="text-slate-900">{client.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {(client.emergencyContact || client.emergencyPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.emergencyContact && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Contact Name</label>
                      <p className="text-slate-900">{client.emergencyContact}</p>
                    </div>
                  )}
                  {client.emergencyPhone && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Phone Number</label>
                      <p className="text-slate-900">{client.emergencyPhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assessments">
          <Card>
            <CardHeader>
              <CardTitle>Assessment History</CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length > 0 ? (
                <ul className="space-y-4">
                  {assessments.map(assessment => (
                    <li key={assessment.id} className="p-4 border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{assessment.assessmentType}</p>
                        <p className="text-sm text-slate-600">
                          Completed on: {new Date(assessment.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        assessment.riskLevel === 'high' || assessment.riskLevel === 'severe' ? 'destructive' :
                        assessment.riskLevel === 'moderate' ? 'secondary' : 'default'
                      }>
                        {assessment.riskLevel ? assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1) : 'N/A'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 px-6 space-y-6">
                  <div className="inline-flex items-center justify-center p-6 bg-primary/10 rounded-full">
                    <FileText className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="provider-focus-header text-2xl mb-3">
                      No Assessments Yet
                    </h3>
                    <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                      This client has not completed any assessments. Start by assigning an assessment to begin tracking their progress.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/assessments')}
                    className="safe-button gentle-interaction"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign First Assessment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights">
          <AIInsights 
            clientId={clientId!} 
            assessmentData={
              assessments.length > 0 ? {
                type: assessments[0].assessmentType,
                score: assessments[0].score || 0,
                riskLevel: assessments[0].riskLevel || 'unknown',
                responses: assessments[0].responses as Record<string, string>
              } : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientProfile;
