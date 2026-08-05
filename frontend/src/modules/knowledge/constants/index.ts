// Knowledge Hub constants
export const FLOW_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Deprecated', label: 'Deprecated' },
];

export const KNOWLEDGE_SECTIONS = [
  { id: 'flows', label: 'Business Flows', icon: 'ArrowRightLeft' },
  { id: 'rules', label: 'Business Rules', icon: 'Scale' },
  { id: 'dependencies', label: 'Dependencies', icon: 'Share2' },
  { id: 'variables', label: 'Runtime Variables', icon: 'Variable' },
  { id: 'documentation', label: 'Documentation', icon: 'FileText' },
] as const;