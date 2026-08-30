import { profileService } from '@/features/profile/services/profileService';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { topicsService } from '@/features/topics/services/topicsService';
import { confidenceService } from '@/features/confidence/services/confidenceService';
import { questionsService } from '@/features/questions/services/questionsService';
import { practiceService } from '@/features/practice/services/practiceService';
import { evaluationsService } from '@/features/evaluations/services/evaluationsService';
import { authService } from '@/features/auth/services/authService';
import { contentService } from '@/features/content/services/contentService';

export const api = {
  // Auth
  signUp: authService.signUp,
  signIn: authService.signIn,
  signOut: authService.signOut,
  getSession: authService.getSession,

  // Profile
  getProfile: profileService.getProfile,
  updateProfile: profileService.updateProfile,

  // Dashboard & Insights
  getDashboard: dashboardService.getDashboard,
  getBiggestGap: dashboardService.getBiggestGap,

  // Topics
  getTopics: topicsService.getTopics,
  getTopicDetail: topicsService.getTopicDetail,

  // Confidence
  setConfidence: confidenceService.setConfidence,
  getConfidenceHistory: confidenceService.getConfidenceHistory,

  // Questions
  getQuestions: questionsService.getQuestions,
  createQuestion: questionsService.createQuestion,

  // Practice
  startPractice: practiceService.startPractice,
  getPracticeSession: practiceService.getPracticeSession,
  submitPracticeAttempt: practiceService.submitPracticeAttempt,
  completePractice: practiceService.completePractice,

  // Evaluations
  startEvaluation: evaluationsService.startEvaluation,
  getEvaluation: evaluationsService.getEvaluation,
  submitEvalAttempt: evaluationsService.submitEvalAttempt,
  completeEvaluation: evaluationsService.completeEvaluation,

  // Admin content ingestion and review
  listIngestionJobs: contentService.listJobs,
  getIngestionCandidates: contentService.getCandidates,
  uploadIngestionPdf: contentService.uploadPdf,
  acceptIngestionCandidate: contentService.acceptCandidate,
  rejectIngestionCandidate: contentService.rejectCandidate,
};

export default api;
