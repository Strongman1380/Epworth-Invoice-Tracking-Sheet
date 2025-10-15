import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import MockDataLoader from './MockDataLoader';
import { clientStorage } from '../services/clientStorage';
import { assessmentStorage } from '../services/assessmentStorage';
import { Skeleton } from './ui/skeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: 'Active Clients', value: '0', icon: Users, color: 'text-teal-600' },
    { label: 'Assessments This Month', value: '0', icon: FileText, color: 'text-sky-600' },
    { label: 'Completed Assessments', value: '0', icon: CheckCircle, color: 'text-violet-600' },
    { label: 'Pending Reviews', value: '0', icon: Clock, color: 'text-amber-600' },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const clients = await clientStorage.getClients();
        const assessments = await assessmentStorage.getAllAssessments();
        
        const assessmentsThisMonth = assessments.filter(a => {
          if (!a.completedAt) return false;
          const assessmentDate = new Date(a.completedAt);
          const today = new Date();
          return assessmentDate.getMonth() === today.getMonth() &&
                 assessmentDate.getFullYear() === today.getFullYear();
        });

        const completedAssessments = assessments.filter(a => !!a.completedAt);
        
        // Assuming 'Pending' status for reviews are those created but not completed.
        const pendingReviews = assessments.filter(a => a.createdAt && !a.completedAt);

        setStats([
          { label: 'Active Clients', value: clients.length.toString(), icon: Users, color: 'text-teal-600' },
          { label: 'Assessments This Month', value: assessmentsThisMonth.length.toString(), icon: FileText, color: 'text-sky-600' },
          { label: 'Completed Assessments', value: completedAssessments.length.toString(), icon: CheckCircle, color: 'text-violet-600' },
          { label: 'Pending Reviews', value: pendingReviews.length.toString(), icon: Clock, color: 'text-amber-600' },
        ]);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        // Keep stats at 0 if there's an error
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);


  // Reset stats to zero for fresh start
  const initialStats = [
    { label: 'Active Clients', value: '0', icon: Users, color: 'text-teal-600' },
    { label: 'Assessments This Month', value: '0', icon: FileText, color: 'text-sky-600' },
    { label: 'Completed Assessments', value: '0', icon: CheckCircle, color: 'text-violet-600' },
    { label: 'Pending Reviews', value: '0', icon: Clock, color: 'text-amber-600' },
  ];

  const handleAddClient = () => {
    navigate('/clients');
  };

  const handleBeginAssessment = () => {
    navigate('/assessments');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-primary rounded-xl p-8 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Trauma-Informed Practice</h1>
        <p className="text-primary-foreground/90 text-lg">
          Track trauma. Strengthen support. Move forward.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow duration-200 animate-fade-in" style={{ animationDelay: `${index * 100}ms`}}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Getting Started Section */}
      <Card className="trauma-safe-card animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900">Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center p-6 bg-primary/10 rounded-full mb-6">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <h3 className="provider-focus-header text-2xl mb-4">
              Begin Your Trauma-Informed Journey
            </h3>
            <p className="text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Welcome to your comprehensive trauma assessment platform. Start by adding your first client 
              or explore our evidence-based assessment tools to begin providing trauma-informed care.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleAddClient}
                className="safe-button gentle-interaction"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Client
              </Button>
              <Button 
                onClick={handleBeginAssessment}
                variant="outline"
                className="gentle-interaction"
              >
                <FileText className="h-4 w-4 mr-2" />
                Explore Assessment Tools
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="hover:shadow-md transition-shadow duration-200 cursor-pointer animate-fade-in trauma-safe-card" 
          style={{ animationDelay: '500ms' }}
          onClick={handleAddClient}
        >
          <CardContent className="p-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Client Management</h3>
              <p className="text-slate-600">Start building comprehensive client profiles for trauma-informed care and track their healing journey.</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow duration-200 cursor-pointer animate-fade-in trauma-safe-card" 
          style={{ animationDelay: '600ms' }}
          onClick={handleBeginAssessment}
        >
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Assessment Library</h3>
              <p className="text-slate-600">Access our comprehensive library of evidence-based trauma assessment tools and screening instruments.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mock Data Loader */}
      <div className="animate-fade-in" style={{ animationDelay: '700ms' }}>
        <MockDataLoader />
      </div>
    </div>
  );
};

export default Dashboard;
