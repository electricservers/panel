<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';

  // TODO: Replace with real heatmap data. Target: 7xN grid (Mon..Sun by week)
  const weeks = 10;
  const days = 7;
  const cells = Array.from({ length: weeks * days }, (_, i) => ({ level: 0 }));
</script>

<Card title="Activity" subtitle="Weekly heatmap (placeholder)">
  <div class="mt-2 grid grid-cols-10 gap-1">
    {#each Array.from({ length: weeks }) as _, w}
      <div class="grid grid-rows-7 gap-1">
        {#each Array.from({ length: days }) as __, d}
          <div class="h-4 w-4 rounded bg-gray-800/50 dark:bg-gray-700" title={`W${w + 1} D${d + 1}`}></div>
        {/each}
      </div>
    {/each}
  </div>
</Card>

<!-- TODO: Accept props for starting week, buckets, and legend; render levels via bg color scale. -->


