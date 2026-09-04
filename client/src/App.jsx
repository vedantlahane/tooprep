import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import AdminRoute from '@/features/auth/components/AdminRoute';
import Layout from '@/shared/components/Layout';
import AuthPage from '@/features/auth/pages/AuthPage';
import LandingPage from '@/features/landing/pages/LandingPage';
import OnboardingPage from '@/features/auth/pages/OnboardingPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import StudyPlanPage from '@/features/dashboard/pages/StudyPlanPage';
import TimelineProgressPage from '@/features/dashboard/pages/TimelineProgressPage';
import SubjectMasteryPage from '@/features/dashboard/pages/SubjectMasteryPage';
import PerformanceTrendPage from '@/features/dashboard/pages/PerformanceTrendPage';
import TopicDetailPage from '@/features/topics/pages/TopicDetailPage';
import PracticePage from '@/features/practice/pages/PracticePage';
import EvaluationPage from '@/features/evaluations/pages/EvaluationPage';
import ResultsPage from '@/features/evaluations/pages/ResultsPage';
import InsightsPage from '@/features/insights/pages/InsightsPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import SessionHistoryPage from '@/features/profile/pages/SessionHistoryPage';
import ContentAdminPage from '@/features/content/pages/ContentAdminPage';
import QuestionsPage from '@/features/questions/pages/QuestionsPage';
import AdminQuestionsPage from '@/features/questions/pages/AdminQuestionsPage';

import ContentSyncPage from '@/features/content/pages/ContentSyncPage';


function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono text-primary uppercase tracking-widest">
            Loading TooPrep...
          </div>
        </div>
      </div>
    );
  }

  return user ? (
    <Layout>
      <DashboardPage />
    </Layout>
  ) : (
    <LandingPage />
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/about" element={<LandingPage defaultTab="overview" />} />
          <Route path="/install" element={<LandingPage defaultTab="install" />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route            path="/trends"
            element={
              <ProtectedRoute>
                <Layout>
                  <PerformanceTrendPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route            path="/plan"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudyPlanPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/timeline"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimelineProgressPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route            path="/subjects"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubjectMasteryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route            path="/topics/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TopicDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice"
            element={
              <ProtectedRoute>
                <Layout>
                  <PracticePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluate"
            element={
              <ProtectedRoute>
                <Layout>
                  <EvaluationPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ResultsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <Layout>
                  <InsightsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Layout>
                  <SessionHistoryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute>
                <Layout>
                  <QuestionsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <AdminRoute>
                <Layout>
                  <AdminQuestionsPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/content"
            element={<AdminRoute><Layout><ContentAdminPage /></Layout></AdminRoute>}
          />
          <Route
            path="/admin/syncs"
            element={<AdminRoute><Layout><ContentSyncPage /></Layout></AdminRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
