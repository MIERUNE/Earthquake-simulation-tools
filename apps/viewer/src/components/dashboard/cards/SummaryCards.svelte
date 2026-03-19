<script>
  let { summary = {} } = $props();

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const cards = $derived([
    {
      title: '総建物数',
      value: formatNumber(summary.total || 0),
      unit: '棟',
      icon: '🏢',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: '予測被害建物数',
      value: formatNumber(summary.damaged || 0),
      unit: '棟',
      subtext: summary.total > 0 ? `予測被害率: ${((summary.damaged / summary.total) * 100).toFixed(1)}%` : '',
      icon: '⚠️',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    {
      title: '予測大破・倒壊',
      value: formatNumber(summary.severelyDamaged || 0),
      unit: '棟',
      subtext: summary.damaged > 0 ? `被害建物の${((summary.severelyDamaged / summary.damaged) * 100).toFixed(1)}%` : '',
      icon: '🚨',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    {
      title: '応急仮設住宅必要数',
      value: formatNumber(summary.requiredHousing || 0),
      unit: '戸',
      subtext: summary.requiredHousing > 0 ? `半壊・全壊: ${formatNumber(summary.totalCollapsed || 0)}棟` : '',
      icon: '🏠',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    }
  ]);
</script>

<div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
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