<script lang="ts">
  type LoginFilterType = 'all' | 'required' | 'notRequired';

  export let onSearch: (keyword: string) => void = () => {};
  export let onDateRangeChange: (startDate: string, endDate: string) => void = () => {};
  export let onLoginFilterChange: (filter: LoginFilterType) => void = () => {};

  let keyword = "";
  let startDate = "";
  let endDate = "";
  let loginFilter: LoginFilterType = "all";
</script>

<div class="bg-white rounded-lg shadow-md p-6 mb-6">
  <h3 class="text-lg font-semibold mb-4 text-gray-800">検索・フィルター</h3>
  
  <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- キーワード検索 -->
    <div>
      <label for="keyword" class="block text-sm font-medium text-gray-700 mb-1">
        キーワード
      </label>
      <input
        id="keyword"
        type="text"
        bind:value={keyword}
        on:input={() => onSearch(keyword)}
        placeholder="地域名・パラメーター名"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- 開始日 -->
    <div>
      <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
        開始日
      </label>
      <input
        id="startDate"
        type="date"
        bind:value={startDate}
        on:change={() => onDateRangeChange(startDate, endDate)}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- 終了日 -->
    <div>
      <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
        終了日
      </label>
      <input
        id="endDate"
        type="date"
        bind:value={endDate}
        on:change={() => onDateRangeChange(startDate, endDate)}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- ログイン要否フィルター -->
    <div>
      <label for="loginFilter" class="block text-sm font-medium text-gray-700 mb-1">
        ログイン要否
      </label>
      <select
        id="loginFilter"
        bind:value={loginFilter}
        on:change={() => onLoginFilterChange(loginFilter)}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">すべて</option>
        <option value="required">ログイン必要</option>
        <option value="notRequired">ログイン不要</option>
      </select>
    </div>
  </div>

  <!-- クリアボタン -->
  <div class="mt-4 text-right">
    <button
      on:click={() => {
        keyword = "";
        startDate = "";
        endDate = "";
        loginFilter = "all";
        onSearch("");
        onDateRangeChange("", "");
        onLoginFilterChange("all");
      }}
      class="text-sm text-blue-600 hover:text-blue-700 font-medium"
    >
      フィルターをクリア
    </button>
  </div>
</div>