import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { clientStorage } from '../services/clientStorage';
import { useToast } from './ui/use-toast';

const AddClientForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Check for duplicates before attempting to save
      const duplicateCheck = await clientStorage.checkDuplicateClient(formData);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingClient) {
        const existingClient = duplicateCheck.existingClient;
        toast({
          title: "Duplicate Client Detected",
          description: `A client named ${existingClient.firstName} ${existingClient.lastName} with the same ${duplicateCheck.duplicateField} already exists in your practice. This prevents HIPAA violations and data mixing.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Attempt to save the client
      const savedClient = await clientStorage.saveClient(formData);
      
      if (savedClient) {
        toast({
          title: "✓ Client Added Successfully",
          description: `${savedClient.firstName} ${savedClient.lastName} has been securely added to your practice. All data is encrypted and HIPAA-compliant.`,
        });
        
        navigate('/clients');
      } else {
        toast({
          title: "Error",
          description: "There was a problem saving the client. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error saving client:', error);
      
      // Handle specific error messages
      let errorMessage = "There was a problem saving the client. Please try again.";
      
      if (error.message && error.message.includes('already exists')) {
        errorMessage = error.message + ". Please check your client list or use different contact information.";
      } else if (error.message && error.message.includes('not authenticated')) {
        errorMessage = "You must be logged in to add clients. Please refresh the page and try again.";
      }
      
      toast({
        title: "Cannot Add Client",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <h1 className="text-3xl font-bold text-slate-900">Add New Client</h1>
          <p className="text-slate-600">Create a new client profile for trauma assessment tracking</p>
        </div>
      </div>

      {/* Form */}
      <Card className="trauma-safe-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="gentle-interaction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="gentle-interaction"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="gentle-interaction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="gentle-interaction"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="gentle-interaction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="gentle-interaction"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  className="gentle-interaction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                  className="gentle-interaction"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="safe-button gentle-interaction"
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Client'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/clients')}
                className="gentle-interaction"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClientForm;
