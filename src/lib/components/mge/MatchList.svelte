<script lang="ts">
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
  import { ID } from '@node-steam/id';
  import MatchCard from './MatchCard.svelte';

  interface Props {
    items: MgeDuel[];
    subjectId2?: string; // Optional; when omitted, cards render neutral style
    loading?: boolean;
    emptyText?: string;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageSizeChange?: (n: number) => void;
    onPageChange?: (page: number) => void;
  }

  let {
    items,
    subjectId2,
    loading = false,
    emptyText = 'No matches in this region.',
    currentPage = 1,
    totalPages = 1,
    pageSize = undefined,
    pageSizeOptions = [10, 25, 50],
    onPageSizeChange,
    onPageChange
  }: Props = $props();

  const clampPage = (p: number) => Math.max(1, Math.min(totalPages || 1, p));
  function goTo(page: number) {
    const next = clampPage(page);
    if (onPageChange) onPageChange(next);
  }

  function to64(id?: string | null): string | null {
    try {
      return id ? new ID(id).get64() : null;
    } catch {
      return null;
    }
  }

  function formatDate(unixEpoch: string | null): string {
    const date = new Date(Number(unixEpoch) * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  }

  // isWin derived inside MatchCard; no local helper needed
</script>

{#if loading}
  <div class="py-6 text-center text-sm text-gray-500">Loading…</div>
{:else if !items || items.length === 0}
  <div class="py-6 text-center text-sm text-gray-500">{emptyText}</div>
{:else}
  <!-- Top pagination -->
  {#if totalPages > 1}
    <div class="mb-2 flex justify-center">
      <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <button
          class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          onclick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          title="Previous">
          <ChevronLeftOutline class="h-4 w-4" />
        </button>
        <span>{currentPage}/{Math.max(1, totalPages)}</span>
        <button
          class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          onclick={() => goTo(currentPage + 1)}
          disabled={currentPage >= (totalPages || 1)}
          aria-label="Next page"
          title="Next">
          <ChevronRightOutline class="h-4 w-4" />
        </button>
        {#if pageSize}
          <div class="ml-3 flex items-center gap-2">
            <label for="pageSizeTop" class="text-[11px] text-gray-500 dark:text-gray-400">Per page:</label>
            <select
              id="pageSizeTop"
              class="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={String(pageSize)}
              onchange={(e) => {
                const v = Number((e.target as HTMLSelectElement).value);
                if (onPageSizeChange) onPageSizeChange(v);
              }}>
              {#each pageSizeOptions as opt}
                <option value={String(opt)}>{opt}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="space-y-3">
    {#each items as game (game.id)}
      <MatchCard {game} {subjectId2} {formatDate} {to64} />
    {/each}
  </div>

  <!-- Bottom pagination -->
  {#if totalPages > 1}
    <div class="mt-2 flex justify-center">
      <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <button
          class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          onclick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          title="Previous">
          <ChevronLeftOutline class="h-4 w-4" />
        </button>
        <span>{currentPage}/{Math.max(1, totalPages)}</span>
        <button
          class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          onclick={() => goTo(currentPage + 1)}
          disabled={currentPage >= (totalPages || 1)}
          aria-label="Next page"
          title="Next">
          <ChevronRightOutline class="h-4 w-4" />
        </button>
        {#if pageSize}
          <div class="ml-3 flex items-center gap-2">
            <label for="pageSizeBottom" class="text-[11px] text-gray-500 dark:text-gray-400">Per page:</label>
            <select
              id="pageSizeBottom"
              class="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              value={String(pageSize)}
              onchange={(e) => {
                const v = Number((e.target as HTMLSelectElement).value);
                if (onPageSizeChange) onPageSizeChange(v);
              }}>
              {#each pageSizeOptions as opt}
                <option value={String(opt)}>{opt}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
    </div>
  {/if}
{/if}
