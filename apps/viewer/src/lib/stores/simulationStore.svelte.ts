import type { SimulationData, ValidationError } from '../types/simulation';

// Svelte 5 runes を使用した状態管理
class SimulationStore {
  // 基本的な状態
  formData = $state<Partial<SimulationData>>({
    region: '',
    meshCodes: [],
    parameters: null,
    selectedScenarioId: undefined,
    requiresLogin: false
  });
  
  currentStep = $state(1);
  isSubmitting = $state(false);
  submissionError = $state<string | null>(null);
  validationErrors = $state<ValidationError[]>([]);
  
  // 派生状態
  get isFormValid() {
    if (this.validationErrors.length > 0) return false;

    const hasRegion = !!this.formData.region;
    const hasMeshCodes = this.formData.meshCodes && this.formData.meshCodes.length > 0;
    const hasScenario = !!this.formData.selectedScenarioId;

    return hasRegion && hasMeshCodes && hasScenario;
  }
  
  get canProceedStep1() {
    return !!this.formData.region;
  }
  
  get canProceedStep2() {
    return this.formData.meshCodes && 
      Array.isArray(this.formData.meshCodes) && 
      this.formData.meshCodes.length > 0;
  }
  
  get canProceedStep3() {
    return !!this.formData.selectedScenarioId;
  }
  
  get canProceedStep4() {
    return this.isFormValid;
  }
  
  // 現在のステップに応じたボタンの有効/無効状態
  get isNextButtonDisabled() {
    switch (this.currentStep) {
      case 1: return !this.canProceedStep1 || this.isSubmitting;
      case 2: return !this.canProceedStep2 || this.isSubmitting;
      case 3: return !this.canProceedStep3 || this.isSubmitting;
      case 4: return !this.canProceedStep4 || this.isSubmitting;
      default: return this.isSubmitting;
    }
  }
  
  // メソッド
  updateFormData(data: Partial<SimulationData>) {
    this.formData = { ...this.formData, ...data };
  }
  
  resetForm() {
    this.formData = {
      region: '',
      meshCodes: [],
      parameters: null,
      selectedScenarioId: undefined,
      requiresLogin: false
    };
    this.currentStep = 1;
    this.isSubmitting = false;
    this.submissionError = null;
    this.validationErrors = [];
  }
  
  addValidationError(error: ValidationError) {
    this.validationErrors = [...this.validationErrors, error];
  }
  
  clearValidationErrors() {
    this.validationErrors = [];
  }
  
  removeValidationError(field: string) {
    this.validationErrors = this.validationErrors.filter(error => error.field !== field);
  }
  
  // ローカルストレージ関連
  private STORAGE_KEY = 'earthquake_simulation_form';
  
  saveToLocalStorage() {
    if (Object.keys(this.formData).length > 0) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.formData));
    }
  }
  
  loadFromLocalStorage() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.formData = data;
      } catch (error) {
        console.error('Failed to load form data from localStorage:', error);
      }
    }
  }
  
  clearLocalStorage() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// シングルトンインスタンスをエクスポート
export const simulationStore = new SimulationStore();