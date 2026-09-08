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
  },

  // Student Observability & Management APIs
  getStudents: ({ search = '', target_year = '', sort = 'last_active' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (target_year && target_year !== 'ALL') params.append('target_year', target_year);
    if (sort) params.append('sort', sort);
    return request('GET', `/admin/students?${params.toString()}`);
  },

  getStudentDetail: (id) => {
    return request('GET', `/admin/students/${id}`);
  },

  updateUserRole: (id, is_admin) => {
    return request('PATCH', `/admin/students/${id}/role`, { is_admin });
  }
};

