/***
 * Admin — Controller Layer
 *
 * Feature domain : System Observability & Comprehensive Platform Management
 * Architecture   : Controller (HTTP ↔ Service bridge)
 ***/

import { adminService } from './admin.service.js';

export const adminController = {
  /**
   * GET /api/admin/observability — Real-time telemetry, questions breakdown,
   * evaluation metrics, pipeline stats, and infrastructure state.
   */
  async getObservability(req, res) {
    try {
      const data = await adminService.getSystemObservability();
      return res.json(data);
    } catch (err) {
      console.error('GET /api/admin/observability error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * GET /api/admin/curriculum — Complete syllabus tree annotated with
   * question distribution and coverage gap alerts.
   */
  async getCurriculumCoverage(req, res) {
    try {
      const data = await adminService.getCurriculumCoverage();
      return res.json(data);
    } catch (err) {
      console.error('GET /api/admin/curriculum error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }
};
