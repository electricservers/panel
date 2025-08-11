<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import { Avatar } from 'flowbite-svelte';

  // TODO: Replace placeholder with real foe stats and pagination/expandable list.
  // Expected later: { steamid: string; name: string; wins: number; losses: number; matches: number }
  const foes = [
    { steamid: '0', name: 'Player A', wins: 0, losses: 0 },
    { steamid: '1', name: 'Player B', wins: 0, losses: 0 },
    { steamid: '2', name: 'Player C', wins: 0, losses: 0 },
    { steamid: '3', name: 'Player D', wins: 0, losses: 0 },
    { steamid: '4', name: 'Player E', wins: 0, losses: 0 }
  ];
</script>

<Card title="Top foes" subtitle="Top 5 opponents (placeholder)">
  <div class="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
    {#each foes as f}
      <div class="flex items-center gap-3 py-2">
        <Avatar size="sm" rounded src={`/images/favicon.png`} />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <span class="truncate font-medium text-gray-900 dark:text-gray-100">{f.name}</span>
            <span class="text-xs text-gray-500">{f.wins}-{f.losses}</span>
          </div>
          <div class="mt-1 h-2 rounded bg-gray-200 dark:bg-gray-700">
            <div class="h-2 rounded bg-rose-500" style="width: 0%"></div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</Card>

<!-- TODO: Replace Avatar src with steam avatars and add link to expandable foes list. -->
