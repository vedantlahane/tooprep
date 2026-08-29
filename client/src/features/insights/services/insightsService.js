import { dashboardService } from '@/features/dashboard/services/dashboardService';

export const insightsService = {
  getInsights: () => dashboardService.getDashboard(),
  getBiggestGap: () => dashboardService.getBiggestGap(),
};
