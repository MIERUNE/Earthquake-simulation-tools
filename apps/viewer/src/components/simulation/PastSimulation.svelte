<script lang="ts">
  import { onMount } from 'svelte';

  let debugMode = $state(false);

  onMount(() => {
    // URLにdebugパラメータがあるか確認
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      debugMode = params.get('debug') === 'true';
    }
  });

  const link = $derived(debugMode ? '/past-simulations?debug=true' : '/past-simulations');
</script>

<div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-100">
  <div class="text-center">
    <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
      </svg>
    </div>
    <h3 class="text-2xl font-bold text-gray-800 mb-4">過去のシミュレーション</h3>
    <p class="text-gray-600 mb-6">
      保存されたシミュレーション結果を閲覧・分析できます。過去のデータと比較して、建物の振動特性の変化を確認しましょう。
    </p>
    <a href={link} class="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300">
      結果を見る
    </a>
  </div>
</div>