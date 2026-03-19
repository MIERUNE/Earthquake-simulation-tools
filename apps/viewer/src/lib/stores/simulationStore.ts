import { writable, derived } from 'svelte/store';
import type { SimulationData, ValidationError } from '../types/simulation';

export const simulationFormData = writable<Partial<SimulationData>>({
  region: '',
  meshCodes: [],
  parameters: null,
  selectedScenarioId: undefined,
  priority: 'medium'
});

export const currentStep = writable<number>(1);

export const isSubmitting = writable<boolean>(false);

export const submissionError = writable<string | null>(null);

export const validationErrors = writable<ValidationError[]>([]);

export const isFormValid = derived(
  [simulationFormData, validationErrors],
  ([$formData, $errors]) => {
    if ($errors.length > 0) return false;
    
    const hasRegion = !!$formData.region;
    const hasMeshCodes = $formData.meshCodes && $formData.meshCodes.length > 0;
    const hasParameters = $formData.parameters !== null && $formData.selectedScenarioId !== undefined;
    
    return hasRegion && hasMeshCodes && hasParameters;
  }
);

export function resetSimulationForm() {
  simulationFormData.set({
    region: '',
    meshCodes: [],
    parameters: null,
    selectedScenarioId: undefined,
    priority: 'medium'
  });
  currentStep.set(1);
  isSubmitting.set(false);
  submissionError.set(null);
  validationErrors.set([]);
}

export function updateFormData(data: Partial<SimulationData>) {
  simulationFormData.update(current => ({
    ...current,
    ...data
  }));
}

export function addValidationError(error: ValidationError) {
  validationErrors.update(errors => [...errors, error]);
}

export function clearValidationErrors() {
  validationErrors.set([]);
}

export function removeValidationError(field: string) {
  validationErrors.update(errors => 
    errors.filter(error => error.field !== field)
  );
}

const STORAGE_KEY = 'earthquake_simulation_form';

export function saveFormToLocalStorage() {
  simulationFormData.subscribe(data => {
    if (Object.keys(data).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  });
}

export function loadFormFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      simulationFormData.set(data);
    } catch (error) {
      console.error('Failed to load form data from localStorage:', error);
    }
  }
}

export function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
}