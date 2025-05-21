<script>
  import Toaster from "./toaster.svelte";
  import { toasts } from "$lib";
</script>

<main class="p-rel">
  <slot></slot>
</main>
{#if $toasts.length}
  <Toaster />
{/if}

<style>
</style>
