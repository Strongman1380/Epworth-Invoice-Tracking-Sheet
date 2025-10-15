
import React from 'react';
import { User, Phone, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { Client } from '../services/clientStorage';

interface ClientCardProps {
  client: Client;
}

const ClientCard = ({ client }: ClientCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="trauma-safe-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="truncate">{client.firstName} {client.lastName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          {client.email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 break-all">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-600">{client.phone}</span>
            </div>
          )}
          {client.dateOfBirth && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-600">{formatDate(client.dateOfBirth)}</span>
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t border-slate-200">
          <Button
            onClick={() => navigate(`/client/${client.id}`)}
            className="safe-button gentle-interaction w-full"
            size="sm"
          >
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientCard;
