/**
 * Onboarding Workflow Service
 * Manages step-by-step onboarding process with persistence
 * 
 * Architecture:
 * - Configuration-driven workflow
 * - Step validation and ordering
 * - Progress tracking
 * - Data persistence in UserPreferences.onboardingJson
 */

import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  onboardingSteps,
  getStepById,
  validateStepOrder,
  getNextStep,
  getPreviousStep,
  calculateCompletion,
  getCompletedSteps,
  OnboardingStepId,
} from '../config/onboarding-workflow.config';

export interface OnboardingData {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  stepData: Partial<Record<OnboardingStepId, any>>;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface StartOnboardingParams {
  orgId?: string;
  initialData?: {
    industry?: string;
    templateId?: string;
  };
}

export interface UpdateStepParams {
  stepId: OnboardingStepId;
  stepData: any;
  moveToStep?: OnboardingStepId; // Optional: explicitly move to a step
}

/**
 * Get or initialize onboarding data
 */
const getOrCreateOnboardingData = async (userId: string, orgId?: string): Promise<OnboardingData> => {
  // Get user preferences
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  // Check if onboarding data exists
  const onboardingJson = preferences?.appearanceJson as any;
  const existingOnboarding = onboardingJson?.onboarding as OnboardingData;

  if (existingOnboarding && existingOnboarding.currentStep) {
    return existingOnboarding;
  }

  // Initialize new onboarding
  const initialData: OnboardingData = {
    currentStep: 'industry_selection',
    completedSteps: [],
    stepData: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to preferences
  const updatedAppearance = {
    ...(onboardingJson || {}),
    onboarding: initialData,
  };

  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      appearanceJson: updatedAppearance,
    },
    update: {
      appearanceJson: updatedAppearance,
    },
  });

  return initialData;
};

/**
 * Save onboarding data
 */
const saveOnboardingData = async (userId: string, data: OnboardingData): Promise<void> => {
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  const appearanceJson = preferences?.appearanceJson as any || {};
  const updatedAppearance = {
    ...appearanceJson,
    onboarding: {
      ...data,
      updatedAt: new Date().toISOString(),
    },
  };

  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      appearanceJson: updatedAppearance,
    },
    update: {
      appearanceJson: updatedAppearance,
    },
  });
};

export const onboardingService = {
  /**
   * Start onboarding workflow
   */
  startOnboarding: async (userId: string, params?: StartOnboardingParams): Promise<OnboardingData> => {
    logger.info(`Starting onboarding for user ${userId}`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Initialize or reset onboarding data
    const onboardingData: OnboardingData = {
      currentStep: 'industry_selection',
      completedSteps: [],
      stepData: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If initial data provided, mark industry_selection as completed
    if (params?.initialData?.industry) {
      onboardingData.stepData.industry_selection = {
        industry: params.initialData.industry,
      };
      if (params.initialData.templateId) {
        onboardingData.stepData.template_selection = {
          templateId: params.initialData.templateId,
          industry: params.initialData.industry,
        };
      }
      onboardingData.completedSteps.push('industry_selection');
      onboardingData.currentStep = 'template_selection';
    }

    await saveOnboardingData(userId, onboardingData);

    logger.info(`Onboarding started for user ${userId}, current step: ${onboardingData.currentStep}`);
    return onboardingData;
  },

  /**
   * Update onboarding step
   */
  updateStep: async (
    userId: string,
    params: UpdateStepParams
  ): Promise<OnboardingData> => {
    logger.info(`Updating onboarding step for user ${userId}: ${params.stepId}`);

    // Get current onboarding data
    const currentData = await getOrCreateOnboardingData(userId);

    // Validate step exists
    const step = getStepById(params.stepId);
    if (!step) {
      throw new ValidationError(`Invalid step ID: ${params.stepId}`);
    }

    // Validate step order if moving to a new step
    const targetStepId = params.moveToStep || params.stepId;
    if (targetStepId !== currentData.currentStep) {
      const isValidOrder = validateStepOrder(currentData.currentStep, targetStepId);
      if (!isValidOrder) {
        throw new ValidationError(
          `Cannot move from step ${currentData.currentStep} to ${targetStepId}. Invalid step order.`
        );
      }
    }

    // Update step data
    const updatedData: OnboardingData = {
      ...currentData,
      stepData: {
        ...currentData.stepData,
        [params.stepId]: params.stepData,
      },
    };

    // Update current step if moving forward
    if (targetStepId !== currentData.currentStep) {
      updatedData.currentStep = targetStepId;

      // If moving forward, mark previous steps as completed
      const currentStepOrder = getStepById(currentData.currentStep)?.order || 0;
      const targetStepOrder = getStepById(targetStepId)?.order || 0;

      if (targetStepOrder > currentStepOrder) {
        // Moving forward - mark all steps up to target as completed
        onboardingSteps.forEach(step => {
          if (step.order <= targetStepOrder && !updatedData.completedSteps.includes(step.id)) {
            updatedData.completedSteps.push(step.id);
          }
        });
      } else if (targetStepOrder < currentStepOrder) {
        // Rolling back - remove completed steps after target
        updatedData.completedSteps = updatedData.completedSteps.filter(stepId => {
          const stepOrder = getStepById(stepId)?.order || 0;
          return stepOrder <= targetStepOrder;
        });
      }
    } else {
      // Same step - just update data
      if (!updatedData.completedSteps.includes(params.stepId)) {
        updatedData.completedSteps.push(params.stepId);
      }
    }

    // Mark as complete if reached final step
    if (targetStepId === 'complete') {
      updatedData.completedAt = new Date().toISOString();
      updatedData.completedSteps.push('complete');
    }

    await saveOnboardingData(userId, updatedData);

    logger.info(`Onboarding step updated for user ${userId}, new step: ${updatedData.currentStep}`);
    return updatedData;
  },

  /**
   * Get onboarding status
   */
  getStatus: async (userId: string): Promise<{
    currentStep: OnboardingStepId;
    completedSteps: OnboardingStepId[];
    completionPercentage: number;
    stepData: Record<OnboardingStepId, any>;
    startedAt: string;
    updatedAt: string;
    completedAt?: string;
    nextStep?: OnboardingStepId;
    previousStep?: OnboardingStepId;
  }> => {
    const data = await getOrCreateOnboardingData(userId);

    const currentStep = getStepById(data.currentStep);
    const nextStep = getNextStep(data.currentStep);
    const previousStep = getPreviousStep(data.currentStep);

    const completionPercentage = calculateCompletion(data.completedSteps);

    return {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      completionPercentage,
      stepData: data.stepData as Record<OnboardingStepId, any>,
      startedAt: data.startedAt,
      updatedAt: data.updatedAt,
      completedAt: data.completedAt,
      nextStep: nextStep?.id,
      previousStep: previousStep?.id,
    };
  },

  /**
   * Rollback to previous step
   */
  rollbackStep: async (userId: string, targetStepId?: OnboardingStepId): Promise<OnboardingData> => {
    logger.info(`Rolling back onboarding for user ${userId} to step ${targetStepId || 'previous'}`);

    const currentData = await getOrCreateOnboardingData(userId);

    let targetStep: OnboardingStepId;
    if (targetStepId) {
      // Validate target step
      const step = getStepById(targetStepId);
      if (!step) {
        throw new ValidationError(`Invalid step ID: ${targetStepId}`);
      }

      // Validate it's a rollback (can't rollback to future step)
      const currentOrder = getStepById(currentData.currentStep)?.order || 0;
      if (step.order > currentOrder) {
        throw new ValidationError(`Cannot rollback to a future step: ${targetStepId}`);
      }

      targetStep = targetStepId;
    } else {
      // Rollback to previous step
      const prevStep = getPreviousStep(currentData.currentStep);
      if (!prevStep) {
        throw new ValidationError('No previous step to rollback to');
      }
      targetStep = prevStep.id;
    }

    // Update to target step
    const updatedData: OnboardingData = {
      ...currentData,
      currentStep: targetStep,
      completedSteps: currentData.completedSteps.filter(stepId => {
        const stepOrder = getStepById(stepId)?.order || 0;
        const targetOrder = getStepById(targetStep)?.order || 0;
        return stepOrder <= targetOrder;
      }),
    };

    await saveOnboardingData(userId, updatedData);

    logger.info(`Onboarding rolled back for user ${userId} to step ${targetStep}`);
    return updatedData;
  },

  /**
   * Reset onboarding (start over)
   */
  resetOnboarding: async (userId: string): Promise<OnboardingData> => {
    logger.info(`Resetting onboarding for user ${userId}`);

    return await onboardingService.startOnboarding(userId);
  },
};

