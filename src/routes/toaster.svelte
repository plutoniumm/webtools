<script lang="ts">
  import { onMount } from "svelte";
  import { toasts } from "$lib";

  const INTERVAL = 3000;

  let x: any = null;

  onMount(() => {
    x = setInterval(() => toasts.set($toasts.slice(1)), INTERVAL);

    return () => clearInterval(x);
  });
</script>

<div id="toasts" class="p10 p-fix f-col fw6">
  {#each $toasts as toast}
    <div class="p5 o-0 t tc rx10 s-{toast.type}">
      {toast.text}
    </div>
  {/each}
</div>

<style>
  @keyframes fade {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  #toasts {
    color: #fff;
    bottom: 0;
    width: calc(100% - 20px);
  }

  .s-200 {
    background: #4f4;
  }

  .s-400 {
    background: #f44;
  }

  .t {
    margin: 5px auto;
    width: min(200px, 100%);
    animation: fade ease-in 0.1s forwards;
  }
</style>
