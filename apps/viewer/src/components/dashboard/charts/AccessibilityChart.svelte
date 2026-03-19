<script>
  import { Chart, registerables } from 'chart.js';
  import { onMount } from 'svelte';

  Chart.register(...registerables);

  export let shelterAccessibility = {
    good: 0,
    warning: 0,
    difficult: 0
  };

  let canvas;
  let chart;

  onMount(() => {
    const ctx = canvas.getContext('2d');

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['通行良好', '要注意', '通行困難'],
        datasets: [
          {
            label: '避難所数',
            data: [
              shelterAccessibility.good,
              shelterAccessibility.warning,
              shelterAccessibility.difficult
            ],
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
            borderWidth: 0
          }
        ]
      },
      options: {
        indexAxis: 'y', // 横向きの棒グラフ
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.parsed.x;
                const total =
                  shelterAccessibility.good +
                  shelterAccessibility.warning +
                  shelterAccessibility.difficult;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${value}箇所 (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            },
            title: {
              display: true,
              text: '避難所数'
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

  $: if (chart && shelterAccessibility) {
    chart.data.datasets[0].data = [
      shelterAccessibility.good,
      shelterAccessibility.warning,
      shelterAccessibility.difficult
    ];
    chart.update();
  }
</script>

<div class="h-48">
  <canvas bind:this={canvas}></canvas>
</div>

<!-- 説明 -->
<div class="mt-4 text-xs text-gray-600 space-y-1">
  <p>
    <span class="inline-block w-3 h-3 rounded" style="background-color: #10B981"></span>
    <strong>通行良好:</strong> 周辺道路の80%以上が通行可能
  </p>
  <p>
    <span class="inline-block w-3 h-3 rounded" style="background-color: #F59E0B"></span>
    <strong>要注意:</strong> 周辺道路の50-79%が通行可能
  </p>
  <p>
    <span class="inline-block w-3 h-3 rounded" style="background-color: #EF4444"></span>
    <strong>通行困難:</strong> 周辺道路の50%未満が通行可能
  </p>
  <p class="text-gray-500 mt-2">※ 避難所から500m以内の道路状況を評価</p>
</div>
