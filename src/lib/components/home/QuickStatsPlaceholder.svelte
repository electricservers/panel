<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  // TODO: Replace zeros with real counters aggregated by region/time window
  const stats = [
    { label: 'Duels today', value: 0 },
    { label: 'Active players', value: 0 },
    { label: 'Arenas played', value: 0 },
    { label: 'Total duels', value: 0 }
  ];
</script>

<Card title="Quick stats" subtitle="Live counts (placeholder)">
  <div class="grid grid-cols-2 gap-4">
    {#each stats as s}
      <div>
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</div>
        <div class="text-2xl font-semibold">{s.value}</div>
      </div>
    {/each}
  </div>
</Card>


