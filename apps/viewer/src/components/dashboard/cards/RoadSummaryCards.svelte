<script>
  let { stats = {} } = $props();

  function formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num);
  }

  function formatDistance(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  }

  // statsが更新されたら再計算されるようにderivedを使用
  const cards = $derived([
    {
      title: '総道路延長',
      value: formatDistance(stats.totalLength || 0),
      unit: '',
      icon: '🛣️',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: '予測通行可能延長',
      value: formatDistance(stats.passableLength || 0),
      unit: '',
      subtext: `予測通行可能率: ${(stats.passableRate || 0).toFixed(1)}%`,
      icon: '✅',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: '予測通行不可延長',
      value: formatDistance(stats.blockedLength || 0),
      unit: '',
      subtext: stats.blockedLength ? `通行不可率: ${((stats.blockedLength / stats.totalLength) * 100).toFixed(1)}%` : '',
      icon: '🚧',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    }
  ]);
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  {#each cards as card}
    <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div class="flex items-start justify-between mb-2">
        <div>
          <p class="text-sm text-gray-600">{card.title}</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            {card.value}<span class="text-base font-normal ml-1">{card.unit}</span>
          </p>
          {#if card.subtext}
            <p class="text-xs text-gray-500 mt-1">{card.subtext}</p>
          {/if}
        </div>
        <div class="{card.bgColor} p-2 rounded-lg">
          <span class="text-2xl {card.iconColor}">{card.icon}</span>
        </div>
      </div>
    </div>
  {/each}
</div>