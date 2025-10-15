import React, { useState, useEffect } from 'react';
import DataDiagnostic from './DataDiagnostic';
import { Plus, Search, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { clientStorage, Client } from '../services/clientStorage';
import ClientCard from './ClientCard';
import ClientCardSkeleton from './ClientCardSkeleton';

const ClientManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      try {
        const savedClients = await clientStorage.getClients();
        setClients(savedClients);
      } catch (error) {
        console.error("Failed to load clients:", error);
        // Optionally set an error state here to show in the UI
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, []);

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNewClient = () => {
    navigate('/add-client');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Clients</h1>
          <p className="text-slate-600 mt-1">Here you can manage your clients and track their assessment progress</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={handleAddNewClient}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Client
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List, Loading State, or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <ClientCardSkeleton key={index} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="trauma-safe-card">
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center p-6 bg-primary/10 rounded-full">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h3 className="provider-focus-header text-2xl mb-3">
                  Welcome to Your Client Space
                </h3>
                <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                  Start building your trauma-informed practice by adding your first client. 
                  Each client profile will help you track their healing journey with care and precision.
                </p>
              </div>
              <Button 
                onClick={handleAddNewClient}
                className="safe-button gentle-interaction"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
              
              {/* Data diagnostic for troubleshooting */}
              <div className="mt-8">
                <DataDiagnostic />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-600">
              {filteredClients.length} of {clients.length} clients
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
