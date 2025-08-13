<script lang="ts">
  import type { MgeDuel } from '$lib/mge/mgeduel';
  import { canonicalizeArenaName } from '$lib/mge/arenaNames';

  export interface Props {
    game: MgeDuel;
    subjectId2?: string;
    to64: (id?: string | null) => string | null;
    formatDate: (unixEpoch: string | null) => string;
  }

  let { game, subjectId2, to64, formatDate }: Props = $props();

  const hasSubject = $derived(Boolean(subjectId2));
  const win: boolean | null = $derived(hasSubject ? game.winner === subjectId2 : null);
  const isPlayerLeft = $derived(hasSubject && game.winner === subjectId2);
  const isPlayerRight = $derived(hasSubject && game.loser === subjectId2);
</script>

<div
  class={`group relative overflow-hidden rounded-xl border border-gray-200 p-4 shadow-sm transition-colors hover:bg-white/70 dark:border-gray-800 dark:hover:bg-gray-800 ${win === true ? 'bg-emerald-100/60 dark:bg-emerald-500/10' : win === false ? 'bg-rose-100/60 dark:bg-rose-500/10' : 'bg-gray-50 dark:bg-gray-900/30'}`}>
  <div class="pointer-events-none absolute inset-y-0 left-0 w-1" class:bg-emerald-300={win === true} class:bg-rose-300={win === false} class:bg-gray-300={!hasSubject} aria-hidden="true"></div>

  <div class="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2 md:gap-x-6">
    <!-- Left name (winner) -->
    <div class="col-start-1 row-start-1 min-w-0 text-left">
      {#if to64(game.winner)}
        <a
          class={`block truncate md:text-lg ${isPlayerLeft ? 'font-extrabold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'} hover:underline`}
          href={`/mge/players/${to64(game.winner)}`}>{game.winnername}</a>
      {:else}
        <span class={`block truncate md:text-lg ${isPlayerLeft ? 'font-extrabold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>{game.winnername}</span>
      {/if}
    </div>

    <!-- Center score -->
    <div class="col-start-2 row-span-2 row-start-1 self-center justify-self-center">
      <div class="flex flex-col items-center">
        <div class="text-2xl tracking-tight text-gray-900 dark:text-gray-100 md:text-3xl">
          <span class={isPlayerLeft ? 'font-extrabold' : 'font-medium'}>{game.winnerscore}</span>
          <span class="mx-2 text-gray-300 dark:text-gray-500">:</span>
          <span class={isPlayerRight ? 'font-extrabold' : 'font-medium'}>{game.loserscore}</span>
        </div>
      </div>
    </div>

    <!-- Right name (loser) -->
    <div class="col-start-3 row-start-1 min-w-0 text-right">
      {#if to64(game.loser)}
        <a
          class={`block truncate md:text-lg ${isPlayerRight ? 'font-extrabold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'} hover:underline`}
          href={`/mge/players/${to64(game.loser)}`}>{game.losername}</a>
      {:else}
        <span class={`block truncate md:text-lg ${isPlayerRight ? 'font-extrabold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>{game.losername}</span>
      {/if}
    </div>

    <!-- Meta line -->
    <div class="col-span-3 col-start-1 row-start-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 md:text-sm">
      <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{canonicalizeArenaName(game.arenaname)}</span>
      <div class="inline-flex items-center gap-2">
        {#if hasSubject}
          <span class="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{win ? 'Win' : 'Loss'}</span>
        {/if}
        <span>{formatDate(game.gametime)}</span>
      </div>
    </div>
  </div>
</div>
