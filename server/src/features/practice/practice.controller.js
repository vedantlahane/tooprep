import { practiceService } from './practice.service.js';

export const practiceController = {
  async startSession(req, res) {
    try {
      const { topic_id, question_count = 15 } = req.body;
      const data = await practiceService.startSession(req.user.id, topic_id, question_count);
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /practice-sessions error:', err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async getSession(req, res) {
    try {
      const data = await practiceService.getSession(req.user.id, req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.json(data);
    } catch (err) {
      console.error('GET /practice-sessions/:id error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async recordAttempt(req, res) {
    try {
      const { question_id, selected_answer, time_spent_seconds, mistake_type } = req.body;
      const data = await practiceService.recordAttempt(req.user.id, req.params.id, {
        question_id,
        selected_answer,
        time_spent_seconds,
        mistake_type
      });
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /practice-sessions/:id/attempts error:', err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async completeSession(req, res) {
    try {
      const data = await practiceService.completeSession(req.user.id, req.params.id);
      return res.json(data);
    } catch (err) {
      console.error('POST /practice-sessions/:id/complete error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
