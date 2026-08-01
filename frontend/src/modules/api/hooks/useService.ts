// External libraries
import { useState, useCallback, useEffect } from 'react';

// Shared types
import type { Service, ServiceFormData } from '../types';

// Mock data
import { initialServices } from '../mock';

const SERVICES_STORAGE_KEY = 'testforge_services';

const loadServices = (): Service[] => {
  try {
    const stored = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Service[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors and fall back to initial data
  }
  return initialServices;
};

export const useService = (projectId?: string) => {
  const [services, setServices] = useState<Service[]>(loadServices);

  // Persist services to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
    } catch {
      // ignore storage errors
    }
  }, [services]);

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