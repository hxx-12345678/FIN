/**
 * Onboarding Workflow Configuration
 * Defines the step-by-step onboarding process with validation rules
 */

export type OnboardingStepId = 
  | 'industry_selection'
  | 'template_selection'
  | 'data_import'
  | 'driver_configuration'
  | 'model_creation'
  | 'complete';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  order: number;
  required: boolean;
  dependencies?: OnboardingStepId[]; // Steps that must be completed before this one
  dataSchema?: Record<string, any>; // Expected data structure for this step
}

/**
 * Onboarding workflow steps in order
 */
export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'industry_selection',
    title: 'Industry Selection',
    description: 'Select your industry type',
    order: 1,
    required: true,
    dataSchema: {
      industry: 'string', // saas | ecommerce | quickcommerce | services
    },
  },
  {
    id: 'template_selection',
    title: 'Template Selection',
    description: 'Choose a financial model template',
    order: 2,
    required: true,
    dependencies: ['industry_selection'],
    dataSchema: {
      templateId: 'string',
      industry: 'string',
    },
  },
  {
    id: 'data_import',
    title: 'Data Import',
    description: 'Import your financial data',
    order: 3,
    required: false,
    dependencies: ['template_selection'],
    dataSchema: {
      importStatus: 'string', // pending | completed | skipped
      importType: 'string', // csv | connector | manual
      uploadedFileKey: 'string?',
      connectorId: 'string?',
    },
  },
  {
    id: 'driver_configuration',
    title: 'Driver Configuration',
    description: 'Configure key financial drivers',
    order: 4,
    required: true,
    dependencies: ['template_selection'],
    dataSchema: {
      drivers: 'object',
      configured: 'boolean',
    },
  },
  {
    id: 'model_creation',
    title: 'Model Creation',
    description: 'Create your first financial model',
    order: 5,
    required: true,
    dependencies: ['driver_configuration'],
    dataSchema: {
      modelId: 'string?',
      status: 'string', // pending | created | failed
    },
  },
  {
    id: 'complete',
    title: 'Onboarding Complete',
    description: 'Setup complete',
    order: 6,
    required: false,
    dependencies: ['model_creation'],
    dataSchema: {
      completedAt: 'string',
    },
  },
];

/**
 * Get step by ID
 */
export const getStepById = (stepId: OnboardingStepId): OnboardingStep | undefined => {
  return onboardingSteps.find(step => step.id === stepId);
};

/**
 * Get step by order
 */
export const getStepByOrder = (order: number): OnboardingStep | undefined => {
  return onboardingSteps.find(step => step.order === order);
};

/**
 * Get next step
 */
export const getNextStep = (currentStepId: OnboardingStepId): OnboardingStep | null => {
  const currentStep = getStepById(currentStepId);
  if (!currentStep) return null;

  const nextOrder = currentStep.order + 1;
  return getStepByOrder(nextOrder) || null;
};

/**
 * Get previous step
 */
export const getPreviousStep = (currentStepId: OnboardingStepId): OnboardingStep | null => {
  const currentStep = getStepById(currentStepId);
  if (!currentStep) return null;

  const prevOrder = currentStep.order - 1;
  return getStepByOrder(prevOrder) || null;
};

/**
 * Get all steps up to and including the current step
 */
export const getCompletedSteps = (currentStepId: OnboardingStepId): OnboardingStepId[] => {
  const currentStep = getStepById(currentStepId);
  if (!currentStep) return [];

  return onboardingSteps
    .filter(step => step.order <= currentStep.order)
    .map(step => step.id);
};

/**
 * Validate step order (can't skip steps)
 */
export const validateStepOrder = (currentStepId: OnboardingStepId, targetStepId: OnboardingStepId): boolean => {
  const currentStep = getStepById(currentStepId);
  const targetStep = getStepById(targetStepId);

  if (!currentStep || !targetStep) return false;

  // Can move forward
  if (targetStep.order > currentStep.order) {
    // Check if all dependencies are met
    if (targetStep.dependencies) {
      const completedSteps = getCompletedSteps(currentStepId);
      return targetStep.dependencies.every(dep => completedSteps.includes(dep));
    }
    return true;
  }

  // Can always move backward
  if (targetStep.order < currentStep.order) {
    return true;
  }

  // Same step
  return true;
};

/**
 * Calculate completion percentage
 */
export const calculateCompletion = (completedSteps: OnboardingStepId[]): number => {
  const requiredSteps = onboardingSteps.filter(step => step.required);
  const totalRequired = requiredSteps.length;

  if (totalRequired === 0) return 100;

  const completedRequired = requiredSteps.filter(step => 
    completedSteps.includes(step.id)
  ).length;

  return Math.round((completedRequired / totalRequired) * 100);
};


