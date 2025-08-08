<script lang="ts">
  import { steamStore } from '$lib/stores/steamStore';
  import Hero from '$lib/components/home/Hero.svelte';
  import QuickStats from '$lib/components/home/QuickStats.svelte';
  import LeaderboardsPreviewPlaceholder from '$lib/components/home/LeaderboardsPreviewPlaceholder.svelte';
  import RecentDuelsPlaceholder from '$lib/components/home/RecentDuelsPlaceholder.svelte';
  import TrendingArenasPlaceholder from '$lib/components/home/TrendingArenasPlaceholder.svelte';
</script>

<div class="space-y-4 p-4">
  <Hero />

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div class="space-y-4 lg:col-span-8">
      <RecentDuelsPlaceholder />
      <TrendingArenasPlaceholder />
    </div>

    <div class="space-y-4 lg:col-span-4">
      <QuickStats />
      <LeaderboardsPreviewPlaceholder />
    </div>
  </div>
</div>
