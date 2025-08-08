<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  // TODO: Replace with real aggregation for the last 7d.
  const arenas = [
    { name: 'Process', count: 0 },
    { name: 'Snakewater', count: 0 },
    { name: 'Gullywash', count: 0 },
    { name: 'Badlands', count: 0 },
    { name: 'Sunshine', count: 0 }
  ];
</script>

<Card title="Trending arenas" subtitle="Last 7 days (placeholder)">
  <div class="space-y-2">
    {#each arenas as a}
      <div>
        <div class="flex items-center justify-between text-sm">
          <span>{a.name}</span>
          <span class="text-gray-500">{a.count}</span>
        </div>
        <div class="mt-1 h-2 rounded bg-gray-200 dark:bg-gray-700">
          <div class="h-2 rounded bg-emerald-500" style="width: 0%"></div>
        </div>
      </div>
    {/each}
  </div>
</Card>


