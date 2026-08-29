import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async getDashboard(req, res) {
    try {
      const data = await dashboardService.getDashboardData(req.user.id);
      return res.json(data);
    } catch (err) {
      console.error('GET /dashboard error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  },

  async getBiggestGap(req, res) {
    try {
      const biggestGapTopic = await dashboardService.getBiggestGap(req.user.id);
      if (!biggestGapTopic) {
        return res.json({ message: 'No topics with sufficient data to compute gaps' });
      }
      return res.json(biggestGapTopic);
    } catch (err) {
      console.error('GET /insights/biggest-gap error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
};
