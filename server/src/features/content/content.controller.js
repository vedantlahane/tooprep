import { contentService } from './content.service.js';

function sendError(res, req, error) {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    console.error('Content API error:', error);
    return res.status(statusCode).json({ error: 'Content service unavailable', request_id: req.requestId });
  }
  return res.status(statusCode).json({ error: error.message, request_id: req.requestId });
}

export const contentController = {
  async createDraft(req, res) {
    try { return res.status(201).json(await contentService.createDraft(req.body, req.user.id)); }
    catch (error) { return sendError(res, req, error); }
  },
  async getDraft(req, res) {
    try { return res.json(await contentService.getDraft(req.params.questionId)); }
    catch (error) { return sendError(res, req, error); }
  },
  async transitionQuestion(req, res) {
    try { return res.json(await contentService.transitionQuestion(req.params.questionId, req.body.status, req.user.id, req.body.reason)); }
    catch (error) { return sendError(res, req, error); }
  },
  async publishQuestion(req, res) {
    try { return res.json(await contentService.publishQuestion(req.params.questionId, req.user.id)); }
    catch (error) { return sendError(res, req, error); }
  },
  async createIngestionJob(req, res) {
    try { return res.status(201).json(await contentService.createIngestionJob(req.body, req.user.id)); }
    catch (error) { return sendError(res, req, error); }
  },
  async uploadAndCreateIngestionJob(req, res) {
    try {
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      const job = await contentService.createIngestionJobFromUpload(req.file, {
        filename: req.body.filename,
        exam: req.body.exam,
        year: req.body.year ? Number(req.body.year) : undefined,
        metadata
      }, req.user.id);

      // Automatically trigger background worker processing asynchronously
      import('./content.worker.js').then(({ processOneIngestionJob }) => {
        processOneIngestionJob().catch(err => console.error('Background ingestion error:', err));
      }).catch(() => {});

      return res.status(201).json(job);
    } catch (error) {
      if (error instanceof SyntaxError) error.statusCode = 400;
      return sendError(res, req, error);
    }
  },
  async getIngestionJob(req, res) {
    try { return res.json(await contentService.getIngestionJob(req.params.jobId)); }
    catch (error) { return sendError(res, req, error); }
  },
  async listIngestionJobs(req, res) {
    try { return res.json(await contentService.listIngestionJobs(req.query.limit)); }
    catch (error) { return sendError(res, req, error); }
  },
  async listCandidates(req, res) {
    try { return res.json(await contentService.listCandidates(req.params.jobId)); }
    catch (error) { return sendError(res, req, error); }
  },
  async acceptCandidate(req, res) {
    try {
      return res.status(201).json(await contentService.acceptCandidate(
        req.params.jobId, req.params.candidateKey, req.body, req.user.id
      ));
    } catch (error) { return sendError(res, req, error); }
  },
  async rejectCandidate(req, res) {
    try {
      return res.json(await contentService.rejectCandidate(
        req.params.jobId, req.params.candidateKey, req.body.reason, req.user.id
      ));
    } catch (error) { return sendError(res, req, error); }
  },
  async transitionIngestionJob(req, res) {
    try {
      return res.json(await contentService.transitionIngestionJob(
        req.params.jobId, req.body.stage, req.user.id, req.body.reason
      ));
    } catch (error) { return sendError(res, req, error); }
  },
  async searchQuestions(req, res) {
    try {
      return res.json(await contentService.searchQuestions(req.query.q, req.query.limit ? Number(req.query.limit) : 10));
    } catch (error) { return sendError(res, req, error); }
  },
  async listFailedSyncs(req, res) {
    try {
      return res.json(await contentService.listFailedSyncs());
    } catch (error) { return sendError(res, req, error); }
  },
  async retrySync(req, res) {
    try {
      return res.json(await contentService.retrySync(req.body.type, req.body.id, req.user.id));
    } catch (error) { return sendError(res, req, error); }
  },
  async uploadImage(req, res) {
    try {
      const result = await contentService.uploadQuestionImage({
        file: req.file,
        dataUrl: req.body?.dataUrl,
        filename: req.body?.filename
      });
      return res.status(201).json(result);
    } catch (error) { return sendError(res, req, error); }
  },
  async renderPdfPage(req, res) {
    try {
      const pageNum = parseInt(req.params.pageNum, 10) || 1;
      const dpi = parseInt(req.query.dpi, 10) || 150;
      const result = await contentService.renderPdfPage(req.params.jobId, pageNum, dpi);
      return res.json(result);
    } catch (error) { return sendError(res, req, error); }
  },
  async cropPdfDiagram(req, res) {
    try {
      const pageNum = parseInt(req.params.pageNum, 10) || 1;
      const dpi = parseInt(req.body.dpi, 10) || 300;
      const result = await contentService.cropPdfDiagram(req.params.jobId, pageNum, req.body.rect, dpi);
      return res.status(201).json(result);
    } catch (error) { return sendError(res, req, error); }
  }
};
