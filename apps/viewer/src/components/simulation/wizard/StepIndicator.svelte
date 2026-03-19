<script lang="ts">
  import type { StepInfo } from '../../../lib/types/simulation';

  type StepStatus = 'completed' | 'active' | 'pending';

  let {
    currentStep = 1,
    totalSteps = 5,
    steps = [
      { id: 1, label: "都道府県・市区町村", icon: "location" },
      { id: 2, label: "地区選択", icon: "grid" },
      { id: 3, label: "パラメータ設定", icon: "settings" },
      { id: 4, label: "確認", icon: "check" },
      { id: 5, label: "完了", icon: "done" }
    ]
  }: {
    currentStep?: number;
    totalSteps?: number;
    steps?: StepInfo[];
  } = $props();

  const getStepStatus = (stepId: number): StepStatus => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  const getIcon = (icon?: string): string => {
    switch (icon) {
      case 'location':
        return 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z';
      case 'grid':
        return 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z';
      case 'settings':
        return 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z';
      case 'check':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'done':
        return 'M5 13l4 4L19 7';
      default:
        return 'M13 10V3L4 14h7v7l9-11h-7z';
    }
  };

  let progressWidth: number = $derived(((currentStep - 1) / (totalSteps - 1)) * 100);
</script>

<div class="w-full py-4">
  <div class="flex items-center justify-between relative">
    <div class="absolute left-0 top-1/2 h-0.5 w-full bg-gray-200 -translate-y-1/2"></div>
    <div 
      class="absolute left-0 top-1/2 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-500"
      style="width: {progressWidth}%"
    ></div>
    
    {#each steps as step}
      {@const status = getStepStatus(step.id)}
      <div class="relative flex flex-col items-center">
        <button
          class="relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 {
            status === 'completed' ? 'bg-blue-600 text-white' :
            status === 'active' ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
            'bg-white border-2 border-gray-300 text-gray-400'
          }"
          disabled={status === 'pending'}
          aria-label={step.label}
        >
          {#if status === 'completed'}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(step.icon)} />
            </svg>
          {/if}
        </button>
        
        <span class="absolute top-14 text-xs font-medium whitespace-nowrap {
          status === 'active' ? 'text-blue-600' : 'text-gray-500'
        }">
          {step.label}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  button:disabled {
    cursor: not-allowed;
  }
</style>