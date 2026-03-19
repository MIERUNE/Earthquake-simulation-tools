<script lang="ts">
  interface NewsItem {
    id: number;
    title: string;
    date: string;
  }

  const newsItems: NewsItem[] = [
    { id: 1,
      title: "対象地域を追加しました",
      date: "2026-02-18" 
    },
  ];
</script>

<section class="py-20 bg-white">
  <div class="container mx-auto px-4">
    <h2 class="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
      <span class="inline-block border-b-4 border-blue-600 pb-2">お知らせ</span>
    </h2>
    <div class="max-w-4xl mx-auto">
      <div class="grid gap-4">
        {#each newsItems as item, index}
          <div
            class="group bg-gray-50 hover:bg-blue-50 rounded-lg p-6 transition-all duration-300 cursor-pointer border border-transparent hover:border-blue-200 hover:shadow-md"
          >
            <div
              class="flex flex-col md:flex-row md:items-center md:justify-between"
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex-shrink-0 w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <span class="text-blue-600 font-bold text-sm"
                    >{index + 1}</span
                  >
                </div>
                <h3
                  class="text-lg font-semibold text-gray-800 group-hover:text-blue-700 transition-colors"
                >
                  {item.title}
                </h3>
              </div>
              <span
                class="text-sm text-gray-500 mt-2 md:mt-0 md:ml-4 flex-shrink-0"
              >
                {item.date}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
