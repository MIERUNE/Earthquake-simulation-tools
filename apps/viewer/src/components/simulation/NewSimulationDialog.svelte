<script lang="ts">
  import { untrack } from 'svelte';
  import { simulationStore } from '../../lib/stores/simulationStore.svelte';
  import { createSimulationReservation } from '$lib/api/simulations.client';
  import StepIndicator from './wizard/StepIndicator.svelte';
  import RegionSelector from './wizard/RegionSelector.svelte';
  import AreaSelector from './wizard/AreaSelector.svelte';
  import EarthquakeParameterForm from './wizard/EarthquakeParameterForm.svelte';
  import SimulationConfirmation from './wizard/SimulationConfirmation.svelte';
  import type { SimulationData, SimulationReservation } from '../../lib/types/simulation';

  interface Props {
    isOpen?: boolean;
    onSubmit?: (data: Partial<SimulationData> & { userId: string; createdAt: Date }) => Promise<SimulationReservation>;
  }

  let { isOpen = $bindable(false), onSubmit = createSimulationReservation }: Props = $props();

  let dialogRef = $state<HTMLDivElement | undefined>();
  let completionData = $state<SimulationReservation | null>(null);

  // Effects
  $effect(() => {
    if (isOpen && dialogRef) {
      dialogRef.focus();
    }
  });

  $effect(() => {
    simulationStore.loadFromLocalStorage();

    return () => {
      // クリーンアップは不要
    };
  });

  $effect(() => {
    // フォームデータが変更されたら保存
    simulationStore.saveToLocalStorage();
  });

  const handleClose = (): void => {
    if (!simulationStore.isSubmitting) {
      isOpen = false;
    }
  };

  const handleBackdropClick = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !simulationStore.isSubmitting) {
      handleClose();
    }
  };

  const goToStep = (step: number): void => {
    if (step >= 1 && step <= 5 && !simulationStore.isSubmitting) {
      simulationStore.currentStep = step;
    }
  };

  const nextStep = (): void => {
    console.log('nextStep called, currentStep:', simulationStore.currentStep);
    console.log('isNextButtonDisabled:', simulationStore.isNextButtonDisabled);
    console.log('canProceedStep1:', simulationStore.canProceedStep1);
    console.log('formData:', simulationStore.formData);
    if (simulationStore.currentStep < 4) {
      simulationStore.currentStep++;
    } else if (simulationStore.currentStep === 4) {
      handleSubmit();
    }
  };

  const prevStep = (): void => {
    if (simulationStore.currentStep > 1 && simulationStore.currentStep < 5) {
      simulationStore.currentStep--;
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      simulationStore.isSubmitting = true;
      simulationStore.submissionError = null;

      const formData = {
        ...simulationStore.formData,
        userId: 'user123',
        createdAt: new Date()
      };

      const result = await onSubmit(formData);

      completionData = result;
      simulationStore.currentStep = 5;
      simulationStore.clearLocalStorage();
    } catch (error) {
      simulationStore.submissionError = (error instanceof Error ? error.message : null) || 'シミュレーション予約に失敗しました';
    } finally {
      simulationStore.isSubmitting = false;
    }
  };

  const handleComplete = (): void => {
    simulationStore.resetForm();
    completionData = null;
    handleClose();
  };

  const handleViewList = (): void => {
    handleComplete();
    // dispatch equivalent in Svelte 5
    window.dispatchEvent(new CustomEvent('view-list'));
  };
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div
      bind:this={dialogRef}
      class="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[95vh] max-h-[950px] overflow-hidden flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      tabindex="-1"
    >
      <div class="flex items-center justify-between p-6 border-b">
        <h2 id="dialog-title" class="text-2xl font-bold text-gray-800">
          新規シミュレーション作成
        </h2>
        {#if simulationStore.currentStep < 5}
          <button
            onclick={handleClose}
            disabled={simulationStore.isSubmitting}
            class="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="閉じる"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>

      <div class="px-6 py-4">
        {#if simulationStore.currentStep < 5}
          <StepIndicator currentStep={simulationStore.currentStep} />
        {/if}
      </div>

      <div class="flex-1 overflow-y-auto px-6 pb-6">
        {#if simulationStore.currentStep === 1}
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">ステップ 1: 都道府県・市区町村選択</h3>
            <p class="text-gray-600">シミュレーション対象の都道府県と市区町村を選択してください。</p>
            <RegionSelector />
          </div>
        {:else if simulationStore.currentStep === 2}
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">ステップ 2: 地区選択</h3>
            <p class="text-gray-600">対象となる地区を地図上で選択してください。</p>
            <AreaSelector />
          </div>
        {:else if simulationStore.currentStep === 3}
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">ステップ 3: 地震動パラメータ設定</h3>
            <p class="text-gray-600">地震動のパラメータを入力してください。</p>
            <EarthquakeParameterForm />
          </div>
        {:else if simulationStore.currentStep === 4}
          <div class="space-y-4">
            <h3 class="text-lg font-semibold">ステップ 4: 確認</h3>
            <p class="text-gray-600">入力内容を確認してください。</p>
            <SimulationConfirmation onEdit={goToStep} />
          </div>
        {:else if simulationStore.currentStep === 5}
          <div class="space-y-4 text-center">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-800">予約が完了しました</h3>
            <p class="text-gray-600">
              シミュレーションの実行予約が正常に登録されました。
            </p>
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
              <div class="flex items-start text-left">
                <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div class="text-sm text-gray-700">
                  <p class="font-semibold text-blue-800">メール通知について</p>
                  <p class="mt-1">
                    シミュレーションの開始時と完了時に、ご登録のメールアドレスに通知が送信されます。
                  </p>
                  <p class="mt-1">
                    また、予約状況はダッシュボードからいつでも確認できます。
                  </p>
                </div>
              </div>
            </div>
            {#if completionData}
              <div class="bg-gray-100 rounded-lg p-4 mt-4">
                <p class="text-sm text-gray-600">予約ID:</p>
                <p class="font-mono font-semibold">{completionData.reservationId}</p>
                <p class="text-sm text-gray-600 mt-2">推定開始時刻:</p>
                <p class="font-semibold">{new Date(completionData.estimatedStartTime).toLocaleString('ja-JP')}</p>
              </div>
            {/if}
          </div>
        {/if}

        {#if simulationStore.submissionError}
          <div class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {simulationStore.submissionError}
          </div>
        {/if}
      </div>

      <div class="border-t p-6">
        {#if simulationStore.currentStep < 5}
          <div class="flex justify-between items-center">
            <button
              onclick={prevStep}
              disabled={simulationStore.currentStep === 1 || simulationStore.isSubmitting}
              class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              戻る
            </button>
            
            <button
              onclick={() => {
                console.log('Next button clicked');
                console.log('Current step:', simulationStore.currentStep);
                console.log('Form data:', simulationStore.formData);
                console.log('canProceedStep1:', simulationStore.canProceedStep1);
                console.log('isNextButtonDisabled:', simulationStore.isNextButtonDisabled);
                if (!simulationStore.isNextButtonDisabled) {
                  nextStep();
                }
              }}
              disabled={simulationStore.isNextButtonDisabled}
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {#if simulationStore.isSubmitting}
                <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              {:else if simulationStore.currentStep === 4}
                実行する
              {:else}
                次へ
              {/if}
            </button>
          </div>
        {:else}
          <div class="flex justify-center space-x-4">
            <button
              onclick={handleComplete}
              class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              閉じる
            </button>
            <button
              onclick={handleViewList}
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              予約一覧を見る
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .fixed {
    animation: fadeIn 0.2s ease-out;
  }

  .bg-white {
    animation: slideIn 0.3s ease-out;
  }
</style>