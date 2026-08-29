import { confidenceService } from './confidence.service.js';

export const confidenceController = {
  async setConfidence(req, res) {
    try {
      const { confidence, trigger } = req.body;
      const data = await confidenceService.addConfidence(req.user.id, req.params.id, confidence, trigger);
      return res.status(201).json(data);
    } catch (err) {
      console.error('POST confidence error:', err);
      if (err.message.includes('Confidence must be') || err.message.includes('Trigger must be')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  async getConfidenceHistory(req, res) {
    try {
      const data = await confidenceService.getConfidenceHistory(req.user.id, req.params.id);
      return res.json(data);
    } catch (err) {
      console.error('GET confidence-history error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
