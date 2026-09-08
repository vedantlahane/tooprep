/***
 * Admin — Controller Layer
 *
 * Feature domain : System Observability & Comprehensive Platform Management
 * Architecture   : Controller (HTTP ↔ Service bridge)
 ***/

import { adminService } from './admin.service.js';
import { deduplicationService } from './deduplication.service.js';

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
  },

  /**
   * GET /api/admin/duplicates — Retrieve flagged duplicate question pairs.
   */
  async listDuplicates(req, res) {
    try {
      const { status = 'PENDING', match_type } = req.query;
      const data = await deduplicationService.getDuplicates({ status, match_type });
      return res.json(data);
    } catch (err) {
      console.error('GET /api/admin/duplicates error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * POST /api/admin/duplicates/scan — Trigger an automated duplicate scan.
   */
  async scanDuplicates(req, res) {
    try {
      const { topic_id, force } = req.body || {};
      const results = await deduplicationService.scanQuestionBank({ topic_id, force: Boolean(force) });
      return res.json(results);
    } catch (err) {
      console.error('POST /api/admin/duplicates/scan error:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * POST /api/admin/duplicates/:id/resolve — Resolve a duplicate pair by deleting one question.
   */
  async resolveDuplicate(req, res) {
    try {
      const { id } = req.params;
      const { keep_id, delete_id } = req.body || {};
      const result = await deduplicationService.resolveDuplicate(id, {
        keep_id,
        delete_id,
        admin_user_id: req.user?.id
      });
      return res.json(result);
    } catch (err) {
      console.error('POST /api/admin/duplicates/:id/resolve error:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * POST /api/admin/duplicates/:id/dismiss — Dismiss a flagged pair as false positive.
   */
  async dismissDuplicate(req, res) {
    try {
      const { id } = req.params;
      const result = await deduplicationService.dismissDuplicate(id, req.user?.id);
      return res.json(result);
    } catch (err) {
      console.error('POST /api/admin/duplicates/:id/dismiss error:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * POST /api/admin/duplicates/:id/merge — Merge two questions and delete source question.
   */
  async mergeDuplicates(req, res) {
    try {
      const { id } = req.params;
      const { target_id, source_id, merged_fields } = req.body || {};
      const result = await deduplicationService.mergeQuestions(id, {
        target_id,
        source_id,
        merged_fields,
        admin_user_id: req.user?.id
      });
      return res.json(result);
    } catch (err) {
      console.error('POST /api/admin/duplicates/:id/merge error:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * GET /api/admin/students — List student cohort with aggregated metrics.
   */
  async getStudentsList(req, res) {
    try {
      const { search, target_year, sort } = req.query;
      const data = await adminService.getStudentsList({ search, target_year, sort });
      return res.json(data);
    } catch (err) {
      console.error('GET /api/admin/students error:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * GET /api/admin/students/:id — Deep Student Dossier.
   */
  async getStudentDetail(req, res) {
    try {
      const { id } = req.params;
      const data = await adminService.getStudentDetail(id);
      return res.json(data);
    } catch (err) {
      console.error('GET /api/admin/students/:id error:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
  },

  /**
   * PATCH /api/admin/students/:id/role — Grant or revoke admin privileges.
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { is_admin } = req.body || {};
      const data = await adminService.updateUserRole(id, { is_admin });
      return res.json({ success: true, profile: data });
    } catch (err) {
      console.error('PATCH /api/admin/students/:id/role error:', err);
      return res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
    }
  }
};

