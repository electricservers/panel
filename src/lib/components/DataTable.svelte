<script lang="ts">
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Button } from 'flowbite-svelte';
  import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';

  export type SortDirection = 'asc' | 'desc';

  export interface Column {
    id: string;
    title: string;
    accessor?: string | ((row: any, index: number) => any);
    sortable?: boolean;
    sortKey?: string; // when provided, used instead of id for sort callbacks
    defaultSortDir?: SortDirection; // default when switching to this column
    headerClass?: string;
    cellClass?: string;
    widthClass?: string;
  }

  type RowColor = 'green' | 'red' | 'default' | 'blue' | 'yellow' | 'purple' | 'custom' | undefined;

  interface Props {
    columns: Column[];
    rows: any[];
    loading?: boolean;
    emptyText?: string;
    striped?: boolean;
    hoverable?: boolean;
    currentPage?: number;
    totalPages?: number;
    showPagination?: boolean;
    // Callbacks
    onPageChange?: (page: number) => void;
    sortKey?: string;
    sortDir?: SortDirection;
    onSortChange?: (key: string, dir: SortDirection) => void;
    // Row helpers
    getRowKey?: (row: any, index: number) => string | number;
    getRowColor?: (row: any, index: number) => RowColor;
  }

  let {
    columns,
    rows,
    loading = false,
    emptyText = 'No data.',
    striped = true,
    hoverable = true,
    currentPage = 1,
    totalPages = 1,
    showPagination = true,
    onPageChange,
    sortKey = '',
    sortDir = 'asc',
    onSortChange,
    getRowKey,
    getRowColor
  }: Props = $props();

  const clampPage = (p: number) => Math.max(1, Math.min(totalPages || 1, p));

  function goTo(page: number) {
    const next = clampPage(page);
    if (onPageChange) onPageChange(next);
  }

  function resolveCellValue(col: Column, row: any, index: number) {
    if (typeof col.accessor === 'function') return col.accessor(row, index);
    if (typeof col.accessor === 'string' && col.accessor in row) return (row as any)[col.accessor];
    return '';
  }

  function handleSort(col: Column) {
    const canSort = col.sortable || Boolean(col.sortKey);
    if (!canSort || !onSortChange) return;
    const key = col.sortKey ?? col.id;
    const isActive = sortKey === key;
    const nextDir: SortDirection = isActive
      ? (sortDir === 'asc' ? 'desc' : 'asc')
      : (col.defaultSortDir ?? (key.toLowerCase() === 'name' ? 'asc' : 'desc'));
    onSortChange(key, nextDir);
  }
</script>

{#if loading}
  <div class="py-8 text-center text-sm text-gray-500">Loading…</div>
{:else if !rows || rows.length === 0}
  <div class="py-8 text-center text-sm text-gray-500">{emptyText}</div>
{:else}
  <Table striped={striped} hoverable={hoverable} class="w-full">
    <TableHead class="select-none">
      {#each columns as col}
        <TableHeadCell
          class={`${col.headerClass ?? ''} ${(col.sortable || col.sortKey) ? 'cursor-pointer' : ''} ${col.widthClass ?? ''}`}
          on:click={() => handleSort(col)}
        >
          <span class="inline-flex items-center gap-1">
            {col.title}
            {#if sortKey === (col.sortKey ?? col.id)}
              <span class="text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>
            {/if}
          </span>
        </TableHeadCell>
      {/each}
    </TableHead>
    <TableBody>
      {#each rows as row, i (getRowKey ? getRowKey(row, i) : i)}
        <TableBodyRow color={getRowColor ? getRowColor(row, i) : undefined}>
          {#each columns as col}
            <TableBodyCell class={col.cellClass}>
              <slot name="cell" row={row} index={i} col={col} value={resolveCellValue(col, row, i)}>
                {resolveCellValue(col, row, i)}
              </slot>
            </TableBodyCell>
          {/each}
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
{/if}

{#if showPagination}
  <div class="mt-4 flex justify-center">
    <div class="flex items-center gap-2">
      <Button color="light" aria-label="Previous page" title="Previous" on:click={() => goTo(currentPage - 1)} disabled={currentPage <= 1}>
        <ChevronLeftOutline class="h-5 w-5" />
      </Button>
      <span class="text-sm">{currentPage} / {Math.max(1, totalPages)}</span>
      <Button color="light" aria-label="Next page" title="Next" on:click={() => goTo(currentPage + 1)} disabled={currentPage >= (totalPages || 1)}>
        <ChevronRightOutline class="h-5 w-5" />
      </Button>
    </div>
  </div>
{/if}

<style>
  :global(.table-fixed-layout) {
    table-layout: fixed;
  }
</style>


