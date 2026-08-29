import { request } from '@/shared/lib/apiClient';

export const profileService = {
  getProfile: () => request('GET', '/profile'),
  updateProfile: (body) => request('POST', '/profile', body),
};
