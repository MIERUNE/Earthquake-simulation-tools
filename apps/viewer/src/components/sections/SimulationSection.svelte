<script lang="ts">
  import PastSimulation from '../simulation/PastSimulation.svelte'
  import NewSimulation from '../simulation/NewSimulation.svelte'
</script>

<section class="py-20 bg-gradient-to-b from-gray-50 to-gray-100">
  <div class="container mx-auto px-4">
    <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
      <PastSimulation />
      <NewSimulation />
    </div>
  </div>
</section>