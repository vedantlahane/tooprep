import { request } from '@/shared/lib/apiClient';

export const dashboardService = {
  getDashboard: () => request('GET', '/dashboard'),
  getBiggestGap: () => request('GET', '/dashboard/insights/biggest-gap'),
};
