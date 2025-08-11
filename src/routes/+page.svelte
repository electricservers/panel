<script lang="ts">
  import Hero from '$lib/components/home/Hero.svelte';
  import QuickStats from '$lib/components/home/QuickStats.svelte';
  import LeaderboardsPreviewPlaceholder from '$lib/components/home/LeaderboardsPreviewPlaceholder.svelte';
  import RecentDuelsPlaceholder from '$lib/components/home/RecentDuelsPlaceholder.svelte';
  import TrendingArenas from '$lib/components/home/TrendingArenas.svelte';
</script>

<div class="space-y-4 p-4">
  <Hero />

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div class="space-y-4 lg:col-span-8">
      <RecentDuelsPlaceholder />
    </div>

    <div class="space-y-4 lg:col-span-4">
      <LeaderboardsPreviewPlaceholder />
      <QuickStats />
      <TrendingArenas />
    </div>
  </div>
</div>
