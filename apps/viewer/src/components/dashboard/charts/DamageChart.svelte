<script>
  import { Chart, registerables } from 'chart.js';
  import { onMount } from 'svelte';
  import { damageTypes } from '../../../lib/shizuokaSimulationData.js';
  
  Chart.register(...registerables);
  
  export let damageDistribution = {};
  
  let canvas;
  let chart;
  
  onMount(() => {
    const ctx = canvas.getContext('2d');
    
    const labels = Object.values(damageTypes).map(type => type.label);
    const data = Object.keys(damageTypes).map(level => damageDistribution[level] || 0);
    const backgroundColors = Object.values(damageTypes).map(type => type.color);
    
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '建物数',
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y.toLocaleString()}棟`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        },
        animation: {
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
  
  $: if (chart && damageDistribution) {
    const data = Object.keys(damageTypes).map(level => damageDistribution[level] || 0);
    chart.data.datasets[0].data = data;
    chart.update();
  }
</script>

<div class="h-64">
  <canvas bind:this={canvas}></canvas>
</div>