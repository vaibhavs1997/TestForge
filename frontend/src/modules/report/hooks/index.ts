// TanStack Query hooks for Report module
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services';
import type { ReportGeneratePayload } from '../types';
import { queryKeys } from '../../../constants';

export const useReports = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.reports(projectId || '');

  const { data: reports = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return reportService.listReports(projectId);
    },
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: ({ projectId, ...payload }: { projectId: string } & ReportGeneratePayload) =>
      reportService.generateReport(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, reportId }: { projectId: string; reportId: string }) =>
      reportService.deleteReport(projectId, reportId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    reports,
    isLoading,
    isError,
    error,
    generateReport: generateMutation.mutate,
    generateReportAsync: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    deleteReport: deleteMutation.mutate,
    deleteReportAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const useReport = (projectId?: string, reportId?: string) => {
  return useQuery({
    queryKey: queryKeys.report(projectId || '', reportId || ''),
    queryFn: async () => {
      if (!projectId || !reportId) return null;
      return reportService.getReport(projectId, reportId);
    },
    enabled: !!projectId && !!reportId,
  });
};

export default useReports;