import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MapPin, Clock, User, Shield, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import { clientStorage, Client } from '../services/clientStorage';
import { assessmentStorage, AssessmentResult } from '../services/assessmentStorage';

interface CrisisAlert {
  id: string;
  clientId: string;
  client: Client;
  riskLevel: 'high' | 'severe';
  assessmentType: string;
  score: number;
  triggeredAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
  notes?: string;
}

const CrisisManagement = () => {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const navigate = useNavigate();

  // Crisis intervention resources
  const emergencyResources = [
    {
      name: 'National Suicide Prevention Lifeline',
      number: '988',
      description: '24/7 crisis support'
    },
    {
      name: 'Crisis Text Line',
      number: 'Text HOME to 741741',
      description: 'Free 24/7 text support'
    },
    {
      name: 'National Domestic Violence Hotline',
      number: '1-800-799-7233',
      description: '24/7 confidential support'
    },
    {
      name: 'RAINN National Sexual Assault Hotline',
      number: '1-800-656-4673',
      description: '24/7 confidential support'
    }
  ];

  useEffect(() => {
    const loadCrisisAlerts = async () => {
      try {
        setLoading(true);
        const clients = await clientStorage.getClients();
        const crisisAlerts: CrisisAlert[] = [];

        for (const client of clients) {
          const assessments = await assessmentStorage.getAssessmentsByClient(client.id);
          
          // Check for high-risk assessments in the last 7 days
          const recentHighRisk = assessments.filter(assessment => {
            const assessmentDate = new Date(assessment.completedAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            return assessmentDate >= sevenDaysAgo && 
                   (assessment.riskLevel === 'high' || assessment.riskLevel === 'severe');
          });

          recentHighRisk.forEach(assessment => {
            crisisAlerts.push({
              id: `${assessment.id}_crisis`,
              clientId: client.id,
              client,
              riskLevel: assessment.riskLevel as 'high' | 'severe',
              assessmentType: assessment.assessmentType,
              score: assessment.score || 0,
              triggeredAt: assessment.completedAt,
              status: 'active' // In a real app, this would be stored in the database
            });
          });
        }

        // Sort by most recent first
        crisisAlerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
        
        setAlerts(crisisAlerts);
      } catch (error) {
        console.error('Error loading crisis alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCrisisAlerts();
  }, []);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'acknowledged' as const }
        : alert
    ));
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const, notes: actionNotes }
        : alert
    ));
    setSelectedAlert(null);
    setActionNotes('');
  };

  const getAlertColor = (riskLevel: string, status: string) => {
    if (status === 'resolved') return 'border-green-200 bg-green-50/50';
    if (status === 'acknowledged') return 'border-yellow-200 bg-yellow-50/50';
    return riskLevel === 'severe' ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Active</Badge>;
      case 'acknowledged':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Acknowledged</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Resolved</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Crisis Management</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Crisis Management</h1>
          <p className="text-slate-600 mt-1">Monitor and respond to high-risk assessment alerts</p>
        </div>
        <Button onClick={() => navigate('/resources')} variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          Emergency Resources
        </Button>
      </div>

      {/* Emergency Quick Access */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="font-medium">Emergency: If someone is in immediate danger, call 911 immediately.</span>
          <div className="flex gap-2">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <Phone className="h-3 w-3 mr-1" />
              Call 911
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700">
              <Phone className="h-3 w-3 mr-1" />
              Call 988
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Active Alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Crisis Alerts ({alerts.filter(a => a.status === 'active').length} Active)
          </h2>
        </div>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Crisis Alerts</h3>
              <p className="text-slate-600">All clients are currently at low to moderate risk levels.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <Card key={alert.id} className={`${getAlertColor(alert.riskLevel, alert.status)} border-2`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-6 w-6 ${alert.riskLevel === 'severe' ? 'text-red-600' : 'text-orange-600'}`} />
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {alert.client.firstName} {alert.client.lastName}
                        </h3>
                        <p className="text-slate-600">
                          {alert.assessmentType} Assessment - Score: {alert.score}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(alert.status)}
                      <Badge variant={alert.riskLevel === 'severe' ? 'destructive' : 'outline'}>
                        {alert.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="h-4 w-4" />
                      Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="h-4 w-4" />
                      Client ID: {alert.clientId}
                    </div>
                  </div>

                  {alert.client.emergencyContact && (
                    <div className="bg-white/50 p-3 rounded-lg mb-4">
                      <h4 className="font-medium text-slate-900 mb-2">Emergency Contact</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">{alert.client.emergencyContact}</span>
                        {alert.client.emergencyPhone && (
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3 mr-1" />
                            {alert.client.emergencyPhone}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          variant="outline"
                          className="border-yellow-500 text-yellow-700"
                        >
                          Acknowledge Alert
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark as Resolved
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/client/${alert.clientId}`)}
                    >
                      <User className="h-3 w-3 mr-1" />
                      View Client
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/assessments')}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      New Assessment
                    </Button>
                  </div>

                  {alert.notes && (
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-1">Action Notes</h4>
                      <p className="text-sm text-slate-600">{alert.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyResources.map((resource, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-medium text-slate-900 mb-1">{resource.name}</h4>
                <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                <Button size="sm" variant="outline" className="w-full">
                  <Phone className="h-3 w-3 mr-2" />
                  {resource.number}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Resolve Crisis Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Mark this alert as resolved for {selectedAlert.client.firstName} {selectedAlert.client.lastName}
              </p>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Action Taken (Optional)
                </label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Describe the actions taken to address this crisis..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleResolveAlert(selectedAlert.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Mark Resolved
                </Button>
                <Button
                  onClick={() => setSelectedAlert(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CrisisManagement;