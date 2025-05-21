<script lang="ts">
  export let //
    options: any[] = [],
    value: any;
</script>

<div class="mb-3">
  <label for={$$restProps.id} class="form-label">Select Table:</label>
  <select id={$$restProps.id} class="form-select" bind:value on:change>
    {#each options as opt}
      <option value={opt}>{opt}</option>
    {/each}
  </select>
</div>

<style></style>
