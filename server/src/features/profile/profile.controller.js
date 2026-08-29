import { profileService } from './profile.service.js';

export const profileController = {
  async getProfile(req, res) {
    try {
      const data = await profileService.getProfile(req.user.id);
      return res.json(data);
    } catch (err) {
      console.error('GET /profile error:', err);
      return res.status(404).json({ error: 'Profile not found' });
    }
  },

  async updateProfile(req, res) {
    try {
      const { display_name, target_exam_year } = req.body;
      const data = await profileService.upsertProfile(req.user.id, { display_name, target_exam_year });
      return res.json(data);
    } catch (err) {
      console.error('POST /profile error:', err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
};
