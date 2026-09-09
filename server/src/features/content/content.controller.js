import { contentService } from './content.service.js';
import { ingestionEvents } from './ingestion-events.js';


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
  async bulkAcceptCandidates(req, res) {
    try {
      return res.status(201).json(await contentService.bulkAcceptCandidates(
        req.params.jobId, req.body.candidates, req.user.id
      ));
    } catch (error) { return sendError(res, req, error); }
  },
  async bulkRejectCandidates(req, res) {
    try {
      return res.json(await contentService.bulkRejectCandidates(
        req.params.jobId, req.body.candidateKeys || req.body.candidate_keys, req.body.reason, req.user.id
      ));
    } catch (error) { return sendError(res, req, error); }
  },
  async bulkAssignTopic(req, res) {
    try {
      return res.json(await contentService.bulkAssignTopic(
        req.params.jobId, req.body.candidateKeys || req.body.candidate_keys, req.body.topicId || req.body.topic_id, req.body.curriculum, req.user.id
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
  },
  async deleteIngestionJob(req, res) {
    try {
      const deleteQuestions = req.query.delete_questions === 'true' || req.body?.delete_questions === true;
      const result = await contentService.deleteIngestionJob(req.params.jobId, req.user.id, deleteQuestions);
      return res.json(result);
    } catch (error) { return sendError(res, req, error); }
  },
  async aiResearchQuestion(req, res) {
    try {
      const { question_text, options, current_answer, current_solution, subject } = req.body;
      if (!question_text) throw Object.assign(new Error('question_text is required'), { statusCode: 400 });
      const result = await contentService.researchQuestionWithTavily({
        questionText: question_text,
        options,
        currentAnswer: current_answer,
        currentSolution: current_solution,
        subject
      });
      return res.json(result);
    } catch (error) { return sendError(res, req, error); }
  },
  async aiFormatQuestion(req, res) {
    try {
      const {
        question_text,
        options,
        current_answer,
        solution_text,
        raw_text,
        subject,
        user_instruction,
        conversation_history,
        skip_tavily
      } = req.body;

      if (!question_text && !raw_text && !user_instruction) {
        throw Object.assign(new Error('question_text, raw_text, or user_instruction is required'), { statusCode: 400 });
      }

      // 1. Fetch authentic JEE reference context from Tavily search (skip during quick chat follow-ups if requested)
      let webContext = '';
      let sources = [];
      const shouldSearchTavily = !skip_tavily && !user_instruction;
      if (shouldSearchTavily) {
        try {
          const { fetchTavilyContext } = await import('./tavily.provider.js');
          const tavilyData = await fetchTavilyContext(question_text || raw_text);
          if (tavilyData) {
            webContext = tavilyData.webContext || '';
            sources = tavilyData.sources || [];
          }
        } catch (tavErr) {
          console.warn('[contentController] Tavily lookup in aiFormatQuestion skipped:', tavErr.message);
        }
      }

      // 2. Perform deep STEM solving, verification, and KaTeX repair via Gemini 3.8 Flash
      const { verifyAndFormatQuestion } = await import('./ai-service.js');
      const formatted = await verifyAndFormatQuestion({
        questionText: question_text,
        options,
        currentAnswer: current_answer,
        solutionText: solution_text,
        rawText: raw_text,
        webContext,
        subject,
        userInstruction: user_instruction,
        conversationHistory: conversation_history
      });

      if (sources.length > 0) {
        formatted.sources = sources;
      }

      if (formatted?.suggested_topic) {
        try {
          const { supabaseAdmin } = await import('../../lib/supabase.js');
          const { data: dbTopics } = await supabaseAdmin
            .from('topics')
            .select('id, name, chapter_id, chapters(name, subjects(name))');
          if (dbTopics && dbTopics.length > 0) {
            const allTopics = dbTopics.map(t => ({
              id: t.id,
              name: t.name,
              chapter: t.chapters?.name,
              subject: t.chapters?.subjects?.name
            }));
            const matched = allTopics.find(t =>
              t.name.toLowerCase().includes(formatted.suggested_topic.toLowerCase()) ||
              formatted.suggested_topic.toLowerCase().includes(t.name.toLowerCase())
            );
            if (matched) {
              formatted.suggested_topic_id = matched.id;
              formatted.suggested_topic = matched.name;
              formatted.suggested_chapter = matched.chapter;
            }
          }
        } catch {
          // ignore topic lookup failure
        }
      }

      return res.json(formatted);
    } catch (error) { return sendError(res, req, error); }
  },
  async uploadSourcePdf(req, res) {
    try {
      const result = await contentService.uploadSourcePdf(req.params.jobId, req.file, req.user.id);
      return res.status(201).json(result);
    } catch (error) { return sendError(res, req, error); }
  },
  async getSourcePdf(req, res) {
    try {
      const buffer = await contentService.getSourcePdfBuffer(req.params.jobId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${req.params.jobId}.pdf"`);
      return res.send(buffer);
    } catch (error) { return sendError(res, req, error); }
  },

  /**
   * SSE: Stream live pipeline progress events for a specific ingestion job.
   * GET /admin/content/ingestion-jobs/:jobId/events
   *
   * - Sends any buffered events first (so late-connecting clients catch up)
   * - Then subscribes to live events from ingestionEvents bus
   * - Sends a keepalive comment every 15s to prevent proxy timeouts
   * - Unsubscribes and closes on client disconnect
   */
  streamJobEvents(req, res) {
    const { jobId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    const sendEvent = (event) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {}
    };

    // 1. Replay historical buffer for this job (last 200 events)
    const history = ingestionEvents.getHistory(jobId, 200);
    for (const ev of history) {
      sendEvent(ev);
    }

    // 2. Send a connection-established sentinel event
    sendEvent({
      job_id: jobId,
      stage: 'CONNECTED',
      step: 'sse_connected',
      message: `Connected to live event stream for job ${jobId}. ${history.length} historical event(s) replayed.`,
      detail: { history_replayed: history.length },
      level: 'info',
      timestamp: new Date().toISOString()
    });

    // 3. Subscribe to live events
    const unsubscribe = ingestionEvents.subscribe(jobId, sendEvent);

    // 4. Keepalive ping every 15 seconds to prevent proxy timeouts
    const keepalive = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch { clearInterval(keepalive); }
    }, 15_000);

    // 5. Cleanup on disconnect
    req.on('close', () => {
      clearInterval(keepalive);
      unsubscribe();
    });
  }
};
