import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useNavigate } from 'react-router-dom';
import { clientStorage, Client } from '../services/clientStorage';
import { assessmentStorage, AssessmentResult } from '../services/assessmentStorage';

interface ClientProgress {
  client: Client;
  totalAssessments: number;
  latestScore: number | null;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe' | null;
  riskTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
  lastAssessment: string | null;
  needsAttention: boolean;
}

const ProgressDashboard = () => {
  const [clientProgress, setClientProgress] = useState<ClientProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertClients, setAlertClients] = useState<ClientProgress[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProgressData = async () => {
      try {
        setLoading(true);
        const clients = await clientStorage.getClients();
        const progressData: ClientProgress[] = [];

        for (const client of clients) {
          const stats = await assessmentStorage.getClientStats(client.id);
          const assessments = await assessmentStorage.getAssessmentsByClient(client.id);
          
          const clientProgress: ClientProgress = {
            client,
            totalAssessments: stats.totalAssessments,
            latestScore: stats.latestScore,
            riskLevel: assessments[0]?.riskLevel || null,
            riskTrend: stats.riskTrend,
            lastAssessment: assessments[0]?.completedAt || null,
            needsAttention: determineNeedsAttention(stats, assessments)
          };

          progressData.push(clientProgress);
        }

        setClientProgress(progressData);
        setAlertClients(progressData.filter(cp => cp.needsAttention));
      } catch (error) {
        console.error('Error loading progress data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgressData();
  }, []);

  const determineNeedsAttention = (stats: any, assessments: AssessmentResult[]): boolean => {
    // High risk level
    if (assessments[0]?.riskLevel === 'high' || assessments[0]?.riskLevel === 'severe') {
      return true;
    }
    
    // Worsening trend
    if (stats.riskTrend === 'worsening') {
      return true;
    }
    
    // No recent assessments (older than 30 days)
    if (assessments[0] && assessments[0].completedAt) {
      const lastAssessment = new Date(assessments[0].completedAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (lastAssessment < thirtyDaysAgo) {
        return true;
      }
    }
    
    return false;
  };

  const getRiskColor = (level: string | null) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'severe': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'worsening': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Progress Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
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
          <h1 className="text-3xl font-bold text-slate-900">Progress Dashboard</h1>
          <p className="text-slate-600 mt-1">Monitor client progress and identify those who need attention</p>
        </div>
        <Button onClick={() => navigate('/assessments')} className="bg-primary hover:bg-primary/90">
          <BarChart3 className="h-4 w-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Crisis Alerts */}
      {alertClients.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Clients Requiring Immediate Attention ({alertClients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertClients.map(cp => (
              <div key={cp.client.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getRiskColor(cp.riskLevel)}`}></div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {cp.client.firstName} {cp.client.lastName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {cp.riskLevel === 'high' || cp.riskLevel === 'severe' ? 'High risk level' :
                        cp.riskTrend === 'worsening' ? 'Worsening trend' :
                        'Overdue assessment'}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/client/${cp.client.id}`)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Clients</p>
                <p className="text-2xl font-bold text-slate-900">{clientProgress.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">High Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {clientProgress.filter(cp => cp.riskLevel === 'high' || cp.riskLevel === 'severe').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Improving</p>
                <p className="text-2xl font-bold text-green-600">
                  {clientProgress.filter(cp => cp.riskTrend === 'improving').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Need Assessment</p>
                <p className="text-2xl font-bold text-orange-600">
                  {clientProgress.filter(cp => !cp.lastAssessment || 
                    new Date(cp.lastAssessment) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Progress Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Client Progress Overview</h2>
        
        {clientProgress.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Clients Yet</h3>
              <p className="text-slate-600 mb-6">Add your first client to start tracking their progress.</p>
              <Button onClick={() => navigate('/add-client')}>
                Add First Client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {clientProgress.map(cp => (
              <Card key={cp.client.id} className={`hover:shadow-lg transition-shadow ${cp.needsAttention ? 'border-orange-200' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${getRiskColor(cp.riskLevel)}`}></div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {cp.client.firstName} {cp.client.lastName}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {cp.totalAssessments} assessment{cp.totalAssessments !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(cp.riskTrend)}
                      {cp.needsAttention && (
                        <Badge variant="outline" className="border-orange-500 text-orange-700">
                          Attention
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {cp.latestScore !== null && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Latest Score</span>
                          <span className="font-medium">{cp.latestScore}</span>
                        </div>
                        <Progress value={Math.min((cp.latestScore / 80) * 100, 100)} className="h-2" />
                      </div>
                    )}

                    {cp.lastAssessment && (
                      <p className="text-sm text-slate-600">
                        Last assessment: {new Date(cp.lastAssessment).toLocaleDateString()}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/client/${cp.client.id}`)}
                        className="flex-1"
                      >
                        View Profile
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => navigate('/assessments')}
                        className="flex-1"
                      >
                        New Assessment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboard;