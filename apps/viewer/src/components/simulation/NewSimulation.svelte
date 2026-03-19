<script lang="ts">
  import NewSimulationDialog from './NewSimulationDialog.svelte';

  let isDialogOpen = $state<boolean>(false);

  const openDialog = (): void => {
    isDialogOpen = true;
  };
</script>

<div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
  <div class="text-center">
    <div class="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
    </div>
    <h3 class="text-2xl font-bold text-gray-800 mb-4">新規シミュレーション</h3>
    <p class="text-gray-600 mb-6">
      建物のパラメータと地震波データを入力して、新しいシミュレーションを開始します。リアルタイムで振動解析を実行できます。
    </p>
    <button 
      onclick={openDialog}
      class="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
    >
      計算を開始
    </button>
  </div>
</div>

<NewSimulationDialog
  bind:isOpen={isDialogOpen}
/>