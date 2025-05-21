<script>
  export let type = "info";
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="alert alert-{type} {$$restProps.class || ''}" on:click>
  <slot></slot>
</div>

<style></style>
