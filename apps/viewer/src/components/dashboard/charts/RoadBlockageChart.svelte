<script>
  import { Chart, registerables } from 'chart.js';
  import { onMount } from 'svelte';
  import { EMERGENCY_ROAD_TYPES } from '$lib/constants/roadColors';

  Chart.register(...registerables);

  export let roadStats = {};

  let canvas;
  let chart;

  onMount(() => {
    const ctx = canvas.getContext('2d');

    const labels = Object.values(EMERGENCY_ROAD_TYPES).map(type => type.label);
    const totalData = [];
    const passableData = [];
    const blockedData = [];

    Object.keys(EMERGENCY_ROAD_TYPES).forEach(key => {
      const stats = roadStats.byType?.[key] || {};
      const total = stats.totalLength || 0;
      const passable = stats.passableLength || 0;
      const blocked = stats.blockedLength || 0;

      totalData.push(total);
      passableData.push(passable);
      blockedData.push(blocked);
    });

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '通行可能',
            data: passableData,
            backgroundColor: '#10B981',
            stack: 'Stack 0'
          },
          {
            label: '通行不可',
            data: blockedData,
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
                return `${label}: ${value.toFixed(1)}km`;
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
            title: {
              display: true,
              text: '道路延長 (km)'
            },
            ticks: {
              callback: function(value) {
                return `${value.toFixed(0)}km`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  $: if (chart && roadStats.byType) {
    const passableData = [];
    const blockedData = [];

    Object.keys(EMERGENCY_ROAD_TYPES).forEach(key => {
      const stats = roadStats.byType[key] || {};
      const passable = stats.passableLength || 0;
      const blocked = stats.blockedLength || 0;

      passableData.push(passable);
      blockedData.push(blocked);
    });

    chart.data.datasets[0].data = passableData;
    chart.data.datasets[1].data = blockedData;
    chart.update();
  }
</script>

<div class="h-64">
  <canvas bind:this={canvas}></canvas>
</div>