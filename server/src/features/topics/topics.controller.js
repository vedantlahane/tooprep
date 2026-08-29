import { topicsService } from './topics.service.js';

export const topicsController = {
  async getTopics(req, res) {
    try {
      const data = await topicsService.getTopicsHierarchy(req.user.id);
      return res.json(data);
    } catch (err) {
      console.error('GET /topics error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  async getTopicDetail(req, res) {
    try {
      const topicId = req.params.id;
      const data = await topicsService.getTopicDetail(req.user.id, topicId);
      if (!data) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      return res.json(data);
    } catch (err) {
      console.error('GET /topics/:id error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
};
