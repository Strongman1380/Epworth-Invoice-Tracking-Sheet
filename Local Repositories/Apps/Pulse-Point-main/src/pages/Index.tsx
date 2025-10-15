import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AssessmentLibrarySimplified from '../components/AssessmentLibrarySimplified';
import AceAssessment from '../components/AceAssessment';
import Pcl5Assessment from '../components/Pcl5Assessment';
import PcPtsd5Assessment from '../components/PcPtsd5Assessment';
import TsqAssessment from '../components/TsqAssessment';
import CdRisc10Assessment from '../components/CdRisc10Assessment';
import Phq9Assessment from '../components/Phq9Assessment';
import Gad7Assessment from '../components/Gad7Assessment';
import IesrAssessment from '../components/IesrAssessment';
import Resources from '../components/Resources';
import Layout from '../components/Layout';
import NotFound from './NotFound';
import SettingsPage from './SettingsPage';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <Routes>
        {/* All routes with layout - No authentication required for privacy-first approach */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<AssessmentLibrarySimplified />} />
              <Route path="/assessments" element={<AssessmentLibrarySimplified />} />
              <Route path="/assessment/ace" element={<AceAssessment />} />
              <Route path="/assessment/pcl5" element={<Pcl5Assessment />} />
              <Route path="/assessment/pc-ptsd-5" element={<PcPtsd5Assessment />} />
              <Route path="/assessment/tsq" element={<TsqAssessment />} />
              <Route path="/assessment/cd-risc-10" element={<CdRisc10Assessment />} />
              <Route path="/assessment/phq-9" element={<Phq9Assessment />} />
              <Route path="/assessment/gad-7" element={<Gad7Assessment />} />
              <Route path="/assessment/ies-r" element={<IesrAssessment />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </div>
  );
};

export default Index;
