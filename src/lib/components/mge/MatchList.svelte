<script lang="ts">
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { Button } from 'flowbite-svelte';
  import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
  import { ID } from '@node-steam/id';
  import MatchCard from './MatchCard.svelte';

  interface Props {
    items: MgeDuel[];
    subjectId2: string; // Steam2 id of the profile owner, to determine W/L
    loading?: boolean;
    emptyText?: string;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
  }

  let {
    items,
    subjectId2,
    loading = false,
    emptyText = 'No matches in this region.',
    currentPage = 1,
    totalPages = 1,
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

  function isWin(game: MgeDuel): boolean {
    return game.winner === subjectId2;
  }
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
        <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goTo(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" title="Previous">
          <ChevronLeftOutline class="h-4 w-4" />
        </button>
        <span>{currentPage}/{Math.max(1, totalPages)}</span>
        <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goTo(currentPage + 1)} disabled={currentPage >= (totalPages || 1)} aria-label="Next page" title="Next">
          <ChevronRightOutline class="h-4 w-4" />
        </button>
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
        <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goTo(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" title="Previous">
          <ChevronLeftOutline class="h-4 w-4" />
        </button>
        <span>{currentPage}/{Math.max(1, totalPages)}</span>
        <button class="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800" onclick={() => goTo(currentPage + 1)} disabled={currentPage >= (totalPages || 1)} aria-label="Next page" title="Next">
          <ChevronRightOutline class="h-4 w-4" />
        </button>
      </div>
    </div>
  {/if}
{/if}


