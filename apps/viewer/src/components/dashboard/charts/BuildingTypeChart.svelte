<script>
  import { Chart, registerables } from 'chart.js';
  import { onMount } from 'svelte';
  
  Chart.register(...registerables);
  
  export let buildingTypeStats = {};
  
  let canvas;
  let chart;
  
  const colors = {
    residential: '#3B82F6',
    commercial: '#10B981',
    public: '#F59E0B',
    industrial: '#8B5CF6'
  };
  
  onMount(() => {
    const ctx = canvas.getContext('2d');
    
    const types = Object.values(buildingTypeStats);
    const labels = types.map(t => t.label);
    const data = types.map(t => t.damaged);
    const backgroundColors = Object.keys(buildingTypeStats).map(key => colors[key]);
    
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 10,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label;
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toLocaleString()}棟 (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: false,
          duration: 1000
        }
      }
    });
    
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });
  
  $: if (chart && buildingTypeStats) {
    const types = Object.values(buildingTypeStats);
    const data = types.map(t => t.damaged);
    chart.data.datasets[0].data = data;
    chart.update();
  }
</script>

<div class="h-64">
  <canvas bind:this={canvas}></canvas>
</div>