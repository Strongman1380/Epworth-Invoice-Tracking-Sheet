
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  TrendingUp,
  AlertTriangle,
  Database,
  Activity,
  DollarSign,
  UserCheck,
  Mail,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  newUsersThisMonth: number;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  profile?: {
    first_name: string;
    last_name: string;
  };
}

interface Subscription {
  id: string;
  status: string;
  plan_name: string;
  user_email: string;
  created_at: string;
  current_period_end: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    newUsersThisMonth: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load users with profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Load subscription data
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(name, price)
        `);

      if (subscriptionsError) {
        console.error('Error loading subscriptions:', subscriptionsError);
      }

      // Calculate stats
      const totalUsers = profilesData?.length || 0;
      const activeSubscriptions = subscriptionsData?.filter(sub => sub.status === 'active').length || 0;
      const totalRevenue = subscriptionsData?.reduce((sum, sub) => {
        return sum + (sub.subscription_plans?.price || 0);
      }, 0) || 0;

      setStats({
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        newUsersThisMonth: totalUsers // Simplified - you could calculate this more precisely
      });

      setUsers(profilesData?.map(profile => ({
        id: profile.id,
        email: profile.email || '',
        created_at: profile.created_at,
        last_sign_in_at: profile.created_at,
        profile: {
          first_name: profile.first_name || '',
          last_name: profile.last_name || ''
        }
      })) || []);

      setSubscriptions(subscriptionsData?.map(sub => ({
        id: sub.id,
        status: sub.status,
        plan_name: sub.subscription_plans?.name || 'Unknown',
        user_email: 'User',
        created_at: sub.created_at,
        current_period_end: sub.current_period_end || ''
      })) || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-600">PulsePoint Management Console</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.activeSubscriptions}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-slate-900">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">New Users</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.newUsersThisMonth}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <p className="text-slate-600">No users found.</p>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.profile?.first_name} {user.profile?.last_name}
                            </p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                            <p className="text-xs text-slate-500">
                              Joined: {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptions.length === 0 ? (
                    <p className="text-slate-600">No subscriptions found.</p>
                  ) : (
                    subscriptions.map((subscription) => (
                      <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{subscription.plan_name}</p>
                          <p className="text-sm text-slate-600">{subscription.user_email}</p>
                          <p className="text-xs text-slate-500">
                            Created: {new Date(subscription.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          variant={subscription.status === 'active' ? 'default' : 'secondary'}
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    User Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Registered Users</span>
                      <span className="font-bold text-slate-900">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Premium Subscribers</span>
                      <span className="font-bold text-slate-900">{stats.activeSubscriptions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Conversion Rate</span>
                      <span className="font-bold text-slate-900">
                        {stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Database Status</span>
                      <Badge className="bg-green-100 text-green-800">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">API Status</span>
                      <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Last Backup</span>
                      <span className="text-sm text-slate-600">Today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Database Operations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={loadAdminData} className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Send System Notification
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Maintenance Mode</span>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Registration</span>
                    <Badge className="bg-green-100 text-green-800">Open</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Email Notifications</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
