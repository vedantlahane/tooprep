import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import AdminRoute from '@/features/auth/components/AdminRoute';
import Layout from '@/shared/components/Layout';
import AdminLayout from '@/shared/components/AdminLayout';

// Core entry routes (eager for instant 0ms first render)
import AuthPage from '@/features/auth/pages/AuthPage';
import LandingPage from '@/features/landing/pages/LandingPage';

// Code-split lazy routes (loaded on-demand / proactively on hover)
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const StudyPlanPage = lazy(() => import('@/features/dashboard/pages/StudyPlanPage'));
const TimelineProgressPage = lazy(() => import('@/features/dashboard/pages/TimelineProgressPage'));
const SubjectMasteryPage = lazy(() => import('@/features/dashboard/pages/SubjectMasteryPage'));
const PerformanceTrendPage = lazy(() => import('@/features/dashboard/pages/PerformanceTrendPage'));
const TopicDetailPage = lazy(() => import('@/features/topics/pages/TopicDetailPage'));
const PracticePage = lazy(() => import('@/features/practice/pages/PracticePage'));
const EvaluationPage = lazy(() => import('@/features/evaluations/pages/EvaluationPage'));
const ResultsPage = lazy(() => import('@/features/evaluations/pages/ResultsPage'));
const InsightsPage = lazy(() => import('@/features/insights/pages/InsightsPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const SessionHistoryPage = lazy(() => import('@/features/profile/pages/SessionHistoryPage'));
const QuestionsPage = lazy(() => import('@/features/questions/pages/QuestionsPage'));

// Admin code-split lazy routes (heavy Cytoscape, PDF.js, and admin pipelines isolated)
const AdminOverviewPage = lazy(() => import('@/features/admin/pages/AdminOverviewPage'));
const AdminPipelinePage = lazy(() => import('@/features/admin/pages/AdminPipelinePage'));
const AdminStudentsPage = lazy(() => import('@/features/admin/pages/AdminStudentsPage'));
const AdminQuestionsPage = lazy(() => import('@/features/questions/pages/AdminQuestionsPage'));
const AdminCurriculumPage = lazy(() => import('@/features/admin/pages/AdminCurriculumPage'));
const AdminDuplicatesPage = lazy(() => import('@/features/admin/pages/AdminDuplicatesPage'));
const ContentAdminPage = lazy(() => import('@/features/content/pages/ContentAdminPage'));
const ContentSyncPage = lazy(() => import('@/features/content/pages/ContentSyncPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center gap-3 animate-fade-in">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <div className="text-xs font-mono text-primary uppercase tracking-widest">
        Loading View...
      </div>
    </div>
  );
}


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
        <Suspense fallback={<RouteLoadingFallback />}>
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
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminOverviewPage />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pipeline"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminPipelinePage />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminStudentsPage />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminQuestionsPage />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/duplicates"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminDuplicatesPage />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/curriculum"
            element={
              <AdminRoute>
                <AdminLayout>
                  <AdminCurriculumPage />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/content"
            element={<AdminRoute><AdminLayout><ContentAdminPage /></AdminLayout></AdminRoute>}
          />
          <Route
            path="/admin/syncs"
            element={<AdminRoute><AdminLayout><ContentSyncPage /></AdminLayout></AdminRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
