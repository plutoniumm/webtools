<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Grid, html } from "gridjs";
  import "gridjs/dist/theme/mermaid.css";
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
  let currentTable: string | null = null;
  let gridInstance: Grid | null = null;
  let offset: number = 0;
  let limit: number = 100;
  let tableData: Record<string, any>[] = [];
  let schema: { name: string; type: string }[] = [];
  let primaryKey: string = "id"; // Default primary key, can be adjusted if needed

  onMount(async () => {
    try {
      await init();
      initialized = true;
    } catch (error) {
      console.error("Failed to initialize SQL.js:", error);
    }
  });

  function handleCreateNewDB() {
    try {
      createDB();
      dbLoaded = true;
      refreshTableList();
    } catch (error) {
      console.error("Failed to create database:", error);
    }
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      await loadDB(file);
      dbLoaded = true;
      refreshTableList();
    } catch (error) {
      console.error("Failed to load database:", error);
    }
  }

  async function refreshTableList() {
    try {
      tables = listTables();
      if (tables.length > 0) {
        await selectTable(tables[0]);
      } else {
        currentTable = null;
        tableData = [];
        schema = [];
        if (gridInstance) {
          gridInstance.destroy();
          gridInstance = null;
        }
      }
    } catch (error) {
      console.error("Failed to list tables:", error);
    }
  }

  async function selectTable(tableName) {
    try {
      currentTable = tableName;
      schema = getSchema(tableName);

      // Try to identify primary key from schema
      const pkColumn = schema.find(
        (col) =>
          col.name.toLowerCase() === "id" ||
          col.name.toLowerCase().includes("_id") ||
          col.name.toLowerCase() === `${tableName.toLowerCase()}_id`,
      );
      if (pkColumn) {
        primaryKey = pkColumn.name;
      }

      await loadTableData();
    } catch (error) {
      console.error(`Failed to select table ${tableName}:`, error);
    }
  }

  async function loadTableData() {
    if (!currentTable) return;

    try {
      tableData = readTable(currentTable, offset, limit);
      // Wait for Svelte to update the DOM before initializing the grid
      await tick();
      initGrid();
    } catch (error) {
      console.error(`Failed to load data from table ${currentTable}:`, error);
    }
  }

  function initGrid() {
    if (!currentTable || tableData.length === 0) return;

    // Use timeout to ensure the DOM element exists before rendering
    setTimeout(() => {
      const gridElement = document.getElementById("grid");
      if (!gridElement) {
        console.error("Grid container element not found");
        return;
      }

      const columns = schema.map((col) => ({
        id: col.name,
        name: col.name,
        formatter: (cell: any, row: any) => {
          return html(`<input type="text" class="form-control form-control-sm" value="${cell !== null ? cell : ""}"
                      data-row="${row.cells[0].data}" data-column="${col.name}"
                      onchange="this.dispatchEvent(new CustomEvent('cell-edit', {bubbles: true, detail: {value: this.value, row: this.dataset.row, column: this.dataset.column}}))">`);
        },
      }));

      // Add action column for row deletion
      columns.push({
        id: "actions",
        name: "Actions",
        formatter: (_: any, row: any) => {
          return html(`<button class="btn btn-danger btn-sm"
                      data-row="${row.cells[0].data}"
                      onclick="this.dispatchEvent(new CustomEvent('delete-row', {bubbles: true, detail: {row: this.dataset.row}}))">
                      Delete</button>`);
        },
      });

      if (gridInstance) {
        gridInstance.destroy();
      }

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

      // Event listeners for edit and delete
      gridElement.addEventListener(
        "cell-edit",
        handleCellEdit as EventListener,
      );
      gridElement.addEventListener(
        "delete-row",
        handleDeleteRow as EventListener,
      );
    }, 0);
  }

  function handleCellEdit(event: CustomEvent) {
    const { value, row, column } = event.detail;

    try {
      // Create data object for the update
      const data: Record<string, any> = {};
      data[column] = value;

      // Update the database
      upd(currentTable as string, data, primaryKey, row);

      // Update local data
      const rowIndex = tableData.findIndex(
        (r) => r[primaryKey].toString() === row.toString(),
      );
      if (rowIndex >= 0) {
        tableData[rowIndex][column] = value;
      }
    } catch (error) {
      console.error("Failed to update cell:", error);
      // Reload data to revert changes
      loadTableData();
    }
  }

  function handleDeleteRow(event: CustomEvent) {
    const { row } = event.detail;

    try {
      // Delete from database
      del(currentTable as string, primaryKey, row);

      // Remove from local data
      tableData = tableData.filter(
        (r) => r[primaryKey].toString() !== row.toString(),
      );

      // Refresh grid
      loadTableData();
    } catch (error) {
      console.error("Failed to delete row:", error);
    }
  }

  function handleExportDB() {
    try {
      exportDB();
    } catch (error) {
      console.error("Failed to export database:", error);
    }
  }
</script>

<div class="container mt-4">
  <h1 class="mb-4">SQLite Database Manager</h1>

  {#if !initialized}
    <div class="alert alert-info">Initializing SQL.js...</div>
  {:else if !dbLoaded}
    <div class="row">
      <div class="col-md-6">
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
            Create New Database
          </div>
          <div class="card-body">
            <p>Create a new, empty SQLite database.</p>
            <button class="btn btn-primary" on:click={handleCreateNewDB}>
              Create New Database
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
            Load Existing Database
          </div>
          <div class="card-body">
            <p>Load an existing SQLite database file.</p>
            <div class="mb-3">
              <input
                type="file"
                class="form-control"
                id="fileInput"
                accept=".sqlite,.db,.sqlite3"
                on:change={handleFileSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="row mb-4">
      <div class="col-md-12">
        <div class="card shadow-sm">
          <div
            class="card-header bg-primary text-white d-flex justify-content-between align-items-center"
          >
            <span>Database Operations</span>
            <div>
              <button class="btn btn-light me-2" on:click={handleExportDB}>
                Export Database
              </button>
              <button class="btn btn-light" on:click={() => (dbLoaded = false)}>
                Load Different Database
              </button>
            </div>
          </div>
          <div class="card-body">
            {#if tables.length === 0}
              <div class="alert alert-warning">
                No tables found in this database. You may need to create tables
                first.
              </div>
            {:else}
              <div class="mb-3">
                <label for="tableSelect" class="form-label">Select Table:</label
                >
                <select
                  id="tableSelect"
                  class="form-select"
                  bind:value={currentTable}
                  on:change={(e) => selectTable(e.target.value)}
                >
                  {#each tables as table}
                    <option value={table}>{table}</option>
                  {/each}
                </select>
              </div>

              {#if currentTable}
                <h3 class="mb-3">Table: {currentTable}</h3>
                <div id="grid" class="mb-4"></div>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.gridjs-wrapper) {
    border: 1px solid #dee2e6;
    border-radius: 0.25rem;
  }

  :global(.gridjs-footer) {
    border: 1px solid #dee2e6;
    border-top: none;
  }

  :global(.gridjs-th) {
    background-color: #0d6efd;
    color: white;
  }

  :global(.gridjs-search) {
    margin-bottom: 1rem;
  }

  :global(.gridjs-pagination .gridjs-pages button.gridjs-currentPage) {
    background-color: #0d6efd;
    color: white;
  }
</style>
