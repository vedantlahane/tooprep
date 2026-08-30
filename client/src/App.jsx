import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import Layout from '@/shared/components/Layout';
import AuthPage from '@/features/auth/pages/AuthPage';
import OnboardingPage from '@/features/auth/pages/OnboardingPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import TopicDetailPage from '@/features/topics/pages/TopicDetailPage';
import PracticePage from '@/features/practice/pages/PracticePage';
import EvaluationPage from '@/features/evaluations/pages/EvaluationPage';
import ResultsPage from '@/features/evaluations/pages/ResultsPage';
import InsightsPage from '@/features/insights/pages/InsightsPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import ContentAdminPage from '@/features/content/pages/ContentAdminPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:id"
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
            path="/admin/content"
            element={<ProtectedRoute><Layout><ContentAdminPage /></Layout></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
