import { request } from '@/shared/lib/apiClient';

export const adminService = {
  getObservability: () => request('GET', '/admin/observability'),
  getCurriculumCoverage: () => request('GET', '/admin/curriculum'),
};
