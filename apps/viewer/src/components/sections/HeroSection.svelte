<script lang="ts">
  import heroImage from "../../assets/kanban.jpeg";
</script>

<section class="relative text-white py-24 md:py-32 overflow-hidden">
  <div class="absolute inset-0">
    <img
      src={heroImage}
      alt="建物振動シミュレーション"
      class="w-full h-full object-cover"
    />
    <div
      class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"
    ></div>
  </div>
  <div class="container mx-auto px-4 text-center relative z-10">
    <h1
      class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in drop-shadow-lg"
    >
      建物振動シミュレーション
    </h1>
    <p
      class="text-lg md:text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto drop-shadow-md"
    >
      地震による建物の揺れをリアルタイムで解析・可視化
    </p>
  </div>
</section>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.8s ease-out;
  }

  .delay-75 {
    animation-delay: 75ms;
  }

  .delay-150 {
    animation-delay: 150ms;
  }
</style>
