import { supabase } from '@/integrations/supabase/client';

export interface AssessmentResult {
  id: string;
  clientId: string;
  assessmentType: 'PCL-5' | 'ACE' | 'TSQ';
  responses: Record<string, any>;
  score: number | null;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe' | null;
  notes?: string;
  completedAt: string;
  createdAt: string;
}

export interface CreateAssessmentData {
  clientId: string;
  assessmentType: 'PCL-5' | 'ACE' | 'TSQ';
  responses: Record<string, any>;
  score?: number;
  riskLevel?: 'low' | 'moderate' | 'high' | 'severe';
  notes?: string;
}

// Helper functions to convert between camelCase and snake_case
const toSnakeCase = (obj: any) => {
  const result: any = {};
  for (const key in obj) {
    if (key === 'clientId') {
      result['client_id'] = obj[key];
    } else if (key === 'assessmentType') {
      result['assessment_type'] = obj[key];
    } else if (key === 'riskLevel') {
      result['risk_level'] = obj[key];
    } else if (key === 'completedAt') {
      result['completed_at'] = obj[key];
    } else if (key === 'createdAt') {
      result['created_at'] = obj[key];
    } else {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
    }
  }
  return result;
};

const toCamelCase = (obj: any): AssessmentResult => {
  return {
    id: obj.id,
    clientId: obj.client_id,
    assessmentType: obj.assessment_type,
    responses: obj.responses,
    score: obj.score,
    riskLevel: obj.risk_level,
    notes: obj.notes,
    completedAt: obj.completed_at,
    createdAt: obj.created_at
  };
};

export const assessmentStorage = {
  // Get all assessment results for a specific client
  getAssessmentsByClient: async (clientId: string): Promise<AssessmentResult[]> => {
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('client_id', clientId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error loading assessments:', error);
        return [];
      }

      return (data || []).map(toCamelCase);
    } catch (error) {
      console.error('Error loading assessments:', error);
      return [];
    }
  },

  // Get all assessment results for the current user
  getAllAssessments: async (): Promise<AssessmentResult[]> => {
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error loading assessments:', error);
        return [];
      }

      return (data || []).map(toCamelCase);
    } catch (error) {
      console.error('Error loading assessments:', error);
      return [];
    }
  },

  // Save a new assessment result
  saveAssessment: async (assessmentData: CreateAssessmentData): Promise<AssessmentResult | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const snakeData = toSnakeCase(assessmentData);
      const { data, error } = await supabase
        .from('assessment_results')
        .insert([{
          ...snakeData,
          user_id: user.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving assessment:', error);
        return null;
      }

      return toCamelCase(data);
    } catch (error) {
      console.error('Error saving assessment:', error);
      return null;
    }
  },

  // Get a specific assessment result
  getAssessmentById: async (id: string): Promise<AssessmentResult | null> => {
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading assessment:', error);
        return null;
      }

      return data ? toCamelCase(data) : null;
    } catch (error) {
      console.error('Error loading assessment:', error);
      return null;
    }
  },

  // Update an existing assessment result
  updateAssessment: async (id: string, assessmentData: Partial<CreateAssessmentData>): Promise<AssessmentResult | null> => {
    try {
      const snakeData = toSnakeCase(assessmentData);
      const { data, error } = await supabase
        .from('assessment_results')
        .update(snakeData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating assessment:', error);
        return null;
      }

      return data ? toCamelCase(data) : null;
    } catch (error) {
      console.error('Error updating assessment:', error);
      return null;
    }
  },

  // Delete an assessment result
  deleteAssessment: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('assessment_results')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting assessment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting assessment:', error);
      return false;
    }
  },

  // Get assessment statistics for a client
  getClientStats: async (clientId: string): Promise<{
    totalAssessments: number;
    latestScore: number | null;
    riskTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    assessmentTypes: Record<string, number>;
  }> => {
    try {
      const assessments = await assessmentStorage.getAssessmentsByClient(clientId);
      
      if (assessments.length === 0) {
        return {
          totalAssessments: 0,
          latestScore: null,
          riskTrend: 'insufficient_data',
          assessmentTypes: {}
        };
      }

      // Count assessment types
      const assessmentTypes: Record<string, number> = {};
      assessments.forEach(assessment => {
        assessmentTypes[assessment.assessmentType] = (assessmentTypes[assessment.assessmentType] || 0) + 1;
      });

      // Get latest score
      const latestScore = assessments[0]?.score || null;

      // Calculate risk trend (simplified)
      let riskTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data' = 'insufficient_data';
      if (assessments.length >= 2) {
        const recent = assessments.slice(0, 2);
        if (recent[0].score && recent[1].score) {
          if (recent[0].score < recent[1].score) {
            riskTrend = 'improving';
          } else if (recent[0].score > recent[1].score) {
            riskTrend = 'worsening';
          } else {
            riskTrend = 'stable';
          }
        }
      }

      return {
        totalAssessments: assessments.length,
        latestScore,
        riskTrend,
        assessmentTypes
      };
    } catch (error) {
      console.error('Error calculating client stats:', error);
      return {
        totalAssessments: 0,
        latestScore: null,
        riskTrend: 'insufficient_data',
        assessmentTypes: {}
      };
    }
  }
};
