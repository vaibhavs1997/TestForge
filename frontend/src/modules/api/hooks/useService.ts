// External libraries
import { useState, useCallback } from 'react';

// Shared types
import type { Service, ServiceFormData } from '../types';

// Mock data
import { initialServices } from '../mock';

export const useService = (projectId?: string) => {
  const [services, setServices] = useState<Service[]>(initialServices);

  const create = useCallback((data: ServiceFormData) => {
    const now = new Date().toISOString();
    const service: Service = {
      id: crypto.randomUUID(),
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      protocol: data.protocol,
      baseUrl: data.baseUrl,
      version: data.version,
      status: data.status,
      createdDate: now,
      updatedDate: now,
    };
    setServices((prev) => [service, ...prev]);
    return service;
  }, []);

  const update = useCallback((id: string, data: ServiceFormData) => {
    const now = new Date().toISOString();
    setServices((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...data, updatedDate: now } : s
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const filtered = projectId
    ? services.filter((s) => s.projectId === projectId)
    : services;

  return {
    services: filtered,
    allServices: services,
    create,
    update,
    remove,
  };
};

export default useService;