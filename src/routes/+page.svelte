<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Grid, html } from "gridjs";
  import "gridjs/dist/theme/mermaid.css";
  import "$style/db.css";

  import Dropdown from "$cpt/dropdown.svelte";
  import Alert from "$cpt/alert.svelte";

  import {
    init,
    createDB,
    loadDB,
    readTable,
    listTables,
    getSchema,
    upd,
    del,
    exportDB,
  } from "$lib/db";

  let initialized: boolean = false;
  let dbLoaded: boolean = false;
  let tables: string[] = [];
  let current: N<string> = null;
  let gridInstance: N<Grid> = null;
  let offset: number = 0;
  let limit: number = 100;
  let tableData: KV<any>[] = [];
  let schema: { name: string; type: string }[] = [];
  let primaryKey: string = "id";

  onMount(() => init().then((r) => (initialized = r)));

  function resolveDB(func: () => void = () => {}) {
    try {
      func();
      dbLoaded = true;
      refreshTables();
    } catch (error) {
      console.error("Failed to create database:", error);
    }
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    loadDB(file).then(resolveDB);
  }

  async function refreshTables() {
    tables = listTables();
    if (tables.length > 0) {
      await selectTable(tables[0]);
    } else {
      current = null;
      tableData = [];
      schema = [];
      if (!gridInstance) return;
      gridInstance.destroy();
      gridInstance = null;
    }
  }

  async function selectTable(tableName: string) {
    try {
      current = tableName;
      schema = getSchema(tableName);

      const pkCol = schema.find((col) => col.name.toLowerCase().includes("id"));
      if (pkCol) primaryKey = pkCol.name;

      await loadData();
    } catch (error) {
      console.error(`Failed to select table ${tableName}:`, error);
    }
  }

  async function loadData() {
    if (!current) return;

    try {
      tableData = readTable(current, offset, limit);
      // Wait for DOM update
      await tick();
      initGrid();
    } catch (error) {
      console.error(`Failed to load data from table ${current}:`, error);
    }
  }

  function initGrid() {
    if (!current || tableData.length === 0) return;

    setTimeout(() => {
      const gridElement = document.getElementById("grid");
      if (!gridElement) {
        console.error("Grid container element not found");
        return;
      }

      const columns = schema.map(({ name }) => ({
        id: name,
        name,
        formatter: (cell: any, row: any) => {
          return html(`<input type="text" class="form-control form-control-sm" value="${cell !== null ? cell : ""}"
                      data-row="${row.cells[0].data}" data-column="${name}"
                      onchange="this.dispatchEvent(new CustomEvent('cell-edit', {bubbles: true, detail: {value: this.value, row: this.dataset.row, column: this.dataset.column}}))">`);
        },
      }));

      columns.push({
        id: "actions",
        name: "Actions",
        formatter: (_: any, row: any) => {
          return html(`<button class="button button-danger button-sm"
                      data-row="${row.cells[0].data}"
                      onclick="this.dispatchEvent(new CustomEvent('delete-row', {bubbles: true, detail: {row: this.dataset.row}}))">
                      Delete</button>`);
        },
      });

      if (gridInstance) gridInstance.destroy();
      gridInstance = new Grid({
        columns,
        data: tableData,
        sort: true,
        search: true,
        pagination: {
          limit: 10,
          summary: true,
        },
        className: {
          table: "table table-striped table-hover",
        },
      }).render(gridElement);

      gridElement.addEventListener("cell-edit", editCell as EventListener);
      gridElement.addEventListener("delete-row", delRow as EventListener);
    }, 0);
  }

  function editCell(event: CustomEvent) {
    const { value, row, column } = event.detail;

    try {
      const data: KV<any> = {};
      data[column] = value;

      upd(current as string, data, primaryKey, row);

      const rowIndex = tableData.findIndex(
        (r) => r[primaryKey].toString() === row.toString(),
      );
      if (rowIndex >= 0) {
        tableData[rowIndex][column] = value;
      }
    } catch (error) {
      console.error("Failed to update cell:", error);
      loadData();
    }
  }

  function delRow(event: CustomEvent) {
    const { row } = event.detail;

    try {
      del(current as string, primaryKey, row);

      tableData = tableData.filter(
        (r) => r[primaryKey].toString() !== row.toString(),
      );

      loadData();
    } catch (error) {
      console.error("Failed to delete row:", error);
    }
  }
</script>

<div class="container mt-4">
  {#if !initialized}
    <Alert>Initializing SQL.js...</Alert>
  {:else if !dbLoaded}
    <div class="card card-body shadow-sm mb-4">
      <p>Create empty DB</p>
      <button class="btn btn-light" on:click={() => resolveDB(createDB)}>
        New DB
      </button>

      <hr />

      <p>Or, Load existing</p>
      <input
        type="file"
        class="form-control"
        id="fileInput"
        accept=".sqlite,.db,.sqlite3"
        on:change={handleFileSelect}
      />
    </div>
  {:else}
    <div class="row mb-4">
      <div class="card p0 m0">
        <div class="card-header d-flex j-bw al-ct">
          <span>Database Operations</span>
          <button class="btn btn-secondary" on:click={exportDB}>
            Export
          </button>
        </div>
        <div class="card-body">
          {#if tables.length === 0}
            <Alert type="warning">
              No tables found in this database. You may need to create tables
              first.
            </Alert>
          {:else}
            <Dropdown
              options={tables}
              bind:value={current}
              on:change={(e) => selectTable(e.target.value)}
            ></Dropdown>

            {#if current}
              <div id="grid" class="mb-4"></div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
</style>
