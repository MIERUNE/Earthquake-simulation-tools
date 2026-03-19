<script>
  export let activeTab = "building";

  const tabs = [
    { id: "building", label: "建物の被害予測（集計）", icon: "🏢" },
    { id: "road", label: "道路状況の予測（集計）", icon: "🛣️" },
    { id: "interactive", label: "個別建物の被害予測", icon: "🗺️" },
  ];

  function handleTabClick(tabId) {
    activeTab = tabId;
  }
</script>

<div class="bg-white border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <nav class="flex space-x-8" aria-label="Tabs">
      {#each tabs as tab}
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
            {activeTab === tab.id
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => handleTabClick(tab.id)}
        >
          <span class="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      {/each}
    </nav>
  </div>
</div>
