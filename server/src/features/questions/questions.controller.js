import { questionsService } from './questions.service.js';

export const questionsController = {
  async getQuestions(req, res) {
    try {
      const data = await questionsService.getQuestions(req.query);
      return res.json(data);
    } catch (err) {
      console.error('GET /questions error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  async createQuestion(req, res) {
    try {
      const data = await questionsService.createQuestion(req.body);
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST /questions error:', err);
      if (err.statusCode === 400) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
