<script>
  import { Chart, registerables } from 'chart.js';
  import { onMount } from 'svelte';
  
  Chart.register(...registerables);
  
  export let districtStats = {};
  
  let canvas;
  let chart;
  
  onMount(() => {
    const ctx = canvas.getContext('2d');
    
    const districts = Object.values(districtStats);
    const labels = districts.map(d => d.name);
    const totalData = districts.map(d => d.total);
    const damagedData = districts.map(d => d.damaged);
    const undamagedData = districts.map(d => d.total - d.damaged);
    
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '無被害',
            data: undamagedData,
            backgroundColor: '#10B981',
            stack: 'Stack 0'
          },
          {
            label: '被害あり',
            data: damagedData,
            backgroundColor: '#EF4444',
            stack: 'Stack 0'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label;
                const value = context.parsed.y;
                const total = totalData[context.dataIndex];
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toLocaleString()}棟 (${percentage}%)`;
              }
            }
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          x: {
            stacked: true
          },
          y: {
            stacked: true,
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
  
  $: if (chart && districtStats) {
    const districts = Object.values(districtStats);
    const damagedData = districts.map(d => d.damaged);
    const undamagedData = districts.map(d => d.total - d.damaged);
    
    chart.data.datasets[0].data = undamagedData;
    chart.data.datasets[1].data = damagedData;
    chart.update();
  }
</script>

<div class="h-64">
  <canvas bind:this={canvas}></canvas>
</div>