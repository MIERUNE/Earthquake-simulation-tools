<script lang="ts">
  import { MapLibre, NavigationControl, ScaleControl } from 'svelte-maplibre-gl';
  
  interface Props {
    center?: [number, number];
    zoom?: number;
    class?: string;
  }
  
  let {
    center = [139.7, 35.7], // 東京の座標
    zoom = 10,
    class: className = ''
  }: Props = $props();
</script>

<MapLibre 
  style="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
  {center}
  {zoom}
  class="h-full w-full {className}"
>
  <NavigationControl position="top-right" />
  <ScaleControl position="bottom-left" />
</MapLibre>