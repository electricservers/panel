<script lang="ts">
  import { steamStore } from '$lib/stores/steamStore';
  import Hero from '$lib/components/home/Hero.svelte';
  import QuickStatsPlaceholder from '$lib/components/home/QuickStatsPlaceholder.svelte';
  import LeaderboardsPreviewPlaceholder from '$lib/components/home/LeaderboardsPreviewPlaceholder.svelte';
  import RecentDuelsPlaceholder from '$lib/components/home/RecentDuelsPlaceholder.svelte';
  import TrendingArenasPlaceholder from '$lib/components/home/TrendingArenasPlaceholder.svelte';
  import HowItWorks from '$lib/components/home/HowItWorks.svelte';
  import CommunityCTA from '$lib/components/home/CommunityCTA.svelte';
</script>

<div class="space-y-4 p-4">
  <Hero />

  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <div class="lg:col-span-8 space-y-4">
      <RecentDuelsPlaceholder />
      <TrendingArenasPlaceholder />
    </div>

    <div class="lg:col-span-4 space-y-4">
      <QuickStatsPlaceholder />
      <LeaderboardsPreviewPlaceholder />
      {#if $steamStore}
        <!-- TODO: Add PlayerSnapshot placeholder or link to profile -->
        <a class="block rounded border border-gray-200 p-4 text-sm dark:border-gray-800" href={`/mge/games/${$steamStore.steamid}`}>
          View my MGE profile →
        </a>
      {/if}
    </div>
  </div>

  <HowItWorks />
  <CommunityCTA />
</div>
