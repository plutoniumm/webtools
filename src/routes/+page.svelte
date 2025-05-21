<script>
  import { onMount } from "svelte";

  const links = [{ name: "Sqlite GUI", icon: "🗄️", url: "/sql" }];

  onMount(() => {});
</script>

<div class="container-fluid tc min-vh-100 al-ct j-ct bg-white">
  <h1 class="m-4">
    <img src="/icon.svg" height="48px" width="48px" alt="spanner" />
    WebTools
  </h1>

  <div class="row w-100 f fw g-4 j-ct">
    {#each links as { name, icon, url }}
      <div class="col-12 col-sm-6 col-md-4 col-lg-3 d-flex j-ct">
        <a class="c-card rx20 p20 w-100 h-100 f-col al-ct j-ct" href={url}>
          <span class="d-b mb-4 c-icon">{icon}</span>
          <strong>{name}</strong>
        </a>
      </div>
    {/each}
  </div>
</div>

<style>
  :global(:root) {
    --blue: #007bff;
  }

  .c-card {
    border: 1px solid var(--blue);
    font-weight: 400;
    color: var(--blue);
    background-color: white;
    text-decoration: none;

    transition: 0.2s ease-in-out;
  }

  .c-card:hover {
    background-color: var(--blue);
    color: white;
  }

  .c-icon {
    font-size: 3rem;
  }
</style>
