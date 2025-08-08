<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';

  // TODO: Replace placeholder data with real data from backend.
  // Expected shape later on:
  // export interface ArenaStat { name: string; matches: number; winrate: number }
  const placeholders = [
    { name: 'Process', matches: 0, winrate: 0 },
    { name: 'Snakewater', matches: 0, winrate: 0 },
    { name: 'Gullywash', matches: 0, winrate: 0 },
    { name: 'Badlands', matches: 0, winrate: 0 },
    { name: 'Sunshine', matches: 0, winrate: 0 }
  ];
</script>

<Card title="Most played arenas" subtitle="Top 5 by matches (placeholder)">
  <div class="mt-2 space-y-3">
    {#each placeholders as a, idx}
      <div class="flex items-center gap-3">
        <div class="w-6 text-right text-sm tabular-nums text-gray-500">{idx + 1}.</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <span class="truncate font-medium text-gray-900 dark:text-gray-100">{a.name}</span>
            <span class="text-xs text-gray-500">{a.matches} matches</span>
          </div>
          <div class="mt-1 h-2 rounded bg-gray-200 dark:bg-gray-700">
            <div class="h-2 rounded bg-emerald-500" style="width: 0%"></div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</Card>

<!-- TODO: Wire up props and real data once backend endpoints are available. -->


