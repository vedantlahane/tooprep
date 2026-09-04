import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../../middleware/auth.js';
import { contentController } from './content.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

router.use(requireAdmin);
router.post('/images/upload', imageUpload.single('file'), contentController.uploadImage);
router.get('/ingestion-jobs/:jobId/pages/:pageNum/render', contentController.renderPdfPage);
router.post('/ingestion-jobs/:jobId/pages/:pageNum/crop', contentController.cropPdfDiagram);

router.post('/questions', contentController.createDraft);
router.get('/questions/search', contentController.searchQuestions);
router.get('/questions/:questionId', contentController.getDraft);
router.post('/questions/:questionId/transitions', contentController.transitionQuestion);
router.post('/questions/:questionId/publish', contentController.publishQuestion);
router.post('/ingestion-jobs', contentController.createIngestionJob);
router.post('/ingestion-jobs/upload', upload.single('file'), contentController.uploadAndCreateIngestionJob);
router.get('/ingestion-jobs', contentController.listIngestionJobs);
router.get('/ingestion-jobs/:jobId', contentController.getIngestionJob);
router.get('/ingestion-jobs/:jobId/candidates', contentController.listCandidates);
router.post('/ingestion-jobs/:jobId/candidates/:candidateKey/accept', contentController.acceptCandidate);
router.post('/ingestion-jobs/:jobId/candidates/:candidateKey/reject', contentController.rejectCandidate);
router.post('/ingestion-jobs/:jobId/transitions', contentController.transitionIngestionJob);
router.get('/syncs/failed', contentController.listFailedSyncs);
router.post('/syncs/retry', contentController.retrySync);

export default router;
