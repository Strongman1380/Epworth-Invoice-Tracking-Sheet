
import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

// Helper functions to convert between camelCase and snake_case
const toSnakeCase = (obj: any) => {
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

const toCamelCase = (obj: any): Client => {
  return {
    id: obj.id,
    firstName: obj.first_name,
    lastName: obj.last_name,
    dateOfBirth: obj.date_of_birth,
    email: obj.email || '',
    phone: obj.phone || '',
    address: obj.address || '',
    emergencyContact: obj.emergency_contact || '',
    emergencyPhone: obj.emergency_phone || '',
    createdAt: obj.created_at,
    updatedAt: obj.updated_at
  };
};

export const clientStorage = {
  getClients: async (): Promise<Client[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('User not authenticated');
        return [];
      }

      // Only fetch clients belonging to the authenticated user (HIPAA compliance)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading clients:', error);
        return [];
      }

      return (data || []).map(toCamelCase);
    } catch (error) {
      console.error('Error loading clients:', error);
      return [];
    }
  },

  checkDuplicateClient: async (clientData: CreateClientData): Promise<{ isDuplicate: boolean; duplicateField?: string; existingClient?: Client }> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Check for duplicate based on name and date of birth
      if (clientData.dateOfBirth) {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.user.id)
          .ilike('first_name', clientData.firstName)
          .ilike('last_name', clientData.lastName)
          .eq('date_of_birth', clientData.dateOfBirth)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking duplicate:', error);
        }

        if (data) {
          return { 
            isDuplicate: true, 
            duplicateField: 'name and date of birth',
            existingClient: toCamelCase(data)
          };
        }
      }

      // Check for duplicate email
      if (clientData.email && clientData.email.trim() !== '') {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.user.id)
          .ilike('email', clientData.email.trim())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking duplicate email:', error);
        }

        if (data) {
          return { 
            isDuplicate: true, 
            duplicateField: 'email',
            existingClient: toCamelCase(data)
          };
        }
      }

      // Check for duplicate phone
      if (clientData.phone && clientData.phone.trim() !== '') {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('phone', clientData.phone.trim())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking duplicate phone:', error);
        }

        if (data) {
          return { 
            isDuplicate: true, 
            duplicateField: 'phone number',
            existingClient: toCamelCase(data)
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicate client:', error);
      return { isDuplicate: false };
    }
  },

  saveClient: async (clientData: CreateClientData): Promise<Client | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Check for duplicates before saving (HIPAA protection)
      const duplicateCheck = await clientStorage.checkDuplicateClient(clientData);
      if (duplicateCheck.isDuplicate) {
        throw new Error(`A client with the same ${duplicateCheck.duplicateField} already exists`);
      }

      const snakeData = toSnakeCase(clientData);
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          ...snakeData,
          user_id: user.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving client:', error);
        
        // Handle database constraint violations
        if (error.code === '23505') { // PostgreSQL unique violation
          throw new Error('A client with this information already exists in your practice');
        }
        
        return null;
      }

      return toCamelCase(data);
    } catch (error) {
      console.error('Error saving client:', error);
      throw error; // Re-throw to handle in the component
    }
  },

  getClientById: async (id: string): Promise<Client | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('User not authenticated');
        return null;
      }

      // Only fetch client if it belongs to the authenticated user (HIPAA compliance)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.user.id) // Critical: Ensure user can only access their own clients
        .single();

      if (error) {
        console.error('Error loading client:', error);
        return null;
      }

      return data ? toCamelCase(data) : null;
    } catch (error) {
      console.error('Error loading client:', error);
      return null;
    }
  },

  updateClient: async (id: string, clientData: Partial<CreateClientData>): Promise<Client | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const snakeData = toSnakeCase(clientData);
      
      // Only update client if it belongs to the authenticated user (HIPAA compliance)
      const { data, error } = await supabase
        .from('clients')
        .update(snakeData)
        .eq('id', id)
        .eq('user_id', user.user.id) // Critical: Ensure user can only update their own clients
        .select()
        .single();

      if (error) {
        console.error('Error updating client:', error);
        
        // Handle database constraint violations
        if (error.code === '23505') { // PostgreSQL unique violation
          throw new Error('A client with this information already exists in your practice');
        }
        
        return null;
      }

      return data ? toCamelCase(data) : null;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  },

  deleteClient: async (id: string): Promise<boolean> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Only delete client if it belongs to the authenticated user (HIPAA compliance)
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.user.id); // Critical: Ensure user can only delete their own clients

      if (error) {
        console.error('Error deleting client:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }
};
