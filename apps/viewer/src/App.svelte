<script lang="ts">
  import HomePage from './pages/HomePage.svelte';
  import PastSimulationsPage from './pages/PastSimulationsPage.svelte';
  import DashboardPage from './pages/DashboardPage.svelte';
  import MapTestPage from './pages/MapTestPage.svelte';

  type PageType = 'home' | 'past-simulations' | 'dashboard' | 'map-test';

  // 簡易的なルーティング
  let currentPage: PageType = $state('home');

  const updatePage = (): void => {
    const hash: string = window.location.hash;
    if (hash === '#past-simulations') {
      currentPage = 'past-simulations';
    } else if (hash === '#dashboard') {
      currentPage = 'dashboard';
    } else if (hash === '#map-test') {
      currentPage = 'map-test';
    } else {
      currentPage = 'home';
    }
  };

  $effect(() => {
    updatePage();
    window.addEventListener('hashchange', updatePage);

    return (): void => {
      window.removeEventListener('hashchange', updatePage);
    };
  });
</script>

{#if currentPage === 'home'}
  <HomePage />
{:else if currentPage === 'past-simulations'}
  <PastSimulationsPage />
{:else if currentPage === 'dashboard'}
  <DashboardPage />
{:else if currentPage === 'map-test'}
  <MapTestPage />
{/if}