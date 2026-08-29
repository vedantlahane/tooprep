import { evaluationsService } from './evaluations.service.js';

export const evaluationsController = {
  async startEvaluation(req, res) {
    try {
      const { topic_id, question_count = 15, duration_seconds = 1800 } = req.body;
      const data = await evaluationsService.startEvaluation(req.user.id, {
        topic_id,
        question_count,
        duration_seconds
      });
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /evaluations error:', err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async getEvaluation(req, res) {
    try {
      const data = await evaluationsService.getEvaluation(req.user.id, req.params.id);
      if (!data) {
        return res.status(404).json({ error: 'Evaluation not found' });
      }
      return res.json(data);
    } catch (err) {
      console.error('GET /evaluations/:id error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async recordAttempt(req, res) {
    try {
      const { question_id, selected_answer, time_spent_seconds } = req.body;
      const data = await evaluationsService.recordAttempt(req.user.id, req.params.id, {
        question_id,
        selected_answer,
        time_spent_seconds
      });
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /evaluations/:id/attempts error:', err);
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async completeEvaluation(req, res) {
    try {
      const data = await evaluationsService.completeEvaluation(req.user.id, req.params.id);
      return res.json(data);
    } catch (err) {
      console.error('POST /evaluations/:id/complete error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
