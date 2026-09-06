import { request } from '@/shared/lib/apiClient';

export const adminService = {
  getObservability: () => request('GET', '/admin/observability'),
  getCurriculumCoverage: () => request('GET', '/admin/curriculum'),

  // Deduplication & Quality APIs
  getDuplicates: ({ status = 'PENDING', match_type = null } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (match_type && match_type !== 'ALL') params.append('match_type', match_type);
    return request('GET', `/admin/duplicates?${params.toString()}`);
  },

  scanDuplicates: ({ topic_id = null, force = false } = {}) => {
    return request('POST', '/admin/duplicates/scan', { topic_id, force });
  },

  resolveDuplicate: (id, { keep_id, delete_id }) => {
    return request('POST', `/admin/duplicates/${id}/resolve`, { keep_id, delete_id });
  },

  dismissDuplicate: (id) => {
    return request('POST', `/admin/duplicates/${id}/dismiss`);
  },

  mergeDuplicates: (id, { target_id, source_id, merged_fields = {} }) => {
    return request('POST', `/admin/duplicates/${id}/merge`, { target_id, source_id, merged_fields });
  }
};

