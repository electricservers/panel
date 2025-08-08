<script lang="ts">
  import Card from '../../../routes/utils/widgets/Card.svelte';
  import { Chart } from 'flowbite-svelte';
  import type { ApexOptions } from 'apexcharts';
  import { browser } from '$app/environment';
  import { computeActivityHistograms, reorderWeekdayToMondayFirst, type ActivityHistograms } from '$lib/mge/activity';

  interface Props {
    gametimes: Array<string | number | Date>;
    loading?: boolean;
    days?: number;
    onDaysChange?: (days: number) => void;
  }
  let { gametimes, loading = false, days = 30, onDaysChange }: Props = $props();

  const hist: ActivityHistograms = $derived(computeActivityHistograms(gametimes || []));
  const weekdayValues = $derived(reorderWeekdayToMondayFirst(hist.byWeekday)); // Mon..Sun
  const weekdayLabels = $derived(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);

  // Track dark mode from the root <html class="dark"> toggled by Flowbite's DarkMode
  let isDark = $state(false);
  $effect(() => {
    if (!browser) return;
    const root = document.documentElement;
    const compute = () => root.classList.contains('dark');
    isDark = compute();
    const obs = new MutationObserver(() => { isDark = compute(); });
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  });

  const chartOptions: ApexOptions = $derived({
    chart: {
      type: 'bar',
      height: 260,
      toolbar: { show: false },
      background: 'transparent',
      foreColor: isDark ? '#9CA3AF' : '#6B7280'
    },
    plotOptions: {
      bar: { columnWidth: '45%', borderRadius: 3 }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: weekdayLabels,
      labels: { style: { fontSize: '11px', colors: isDark ? '#9CA3AF' : '#6B7280' } },
      axisBorder: { color: isDark ? '#374151' : '#E5E7EB' },
      axisTicks: { color: isDark ? '#374151' : '#E5E7EB' }
    },
    yaxis: {
      forceNiceScale: true,
      labels: { style: { fontSize: '11px', colors: isDark ? '#9CA3AF' : '#6B7280' } }
    },
    grid: { strokeDashArray: 4, borderColor: isDark ? '#374151' : '#E5E7EB' },
    colors: ['#10b981'],
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v: number) => `${v} matches` } },
    theme: { mode: isDark ? 'dark' : 'light' },
    series: [
      { name: 'Matches', data: weekdayValues }
    ]
  } as unknown as ApexOptions);
</script>

<Card title="Activity">
  {#if loading}
    <div class="py-4 text-center text-sm text-gray-500">Loading…</div>
  {:else}
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">By weekday</div>
        <div class="flex items-center gap-1">
          {#each [15,30,60,90] as d}
            <button class={`rounded px-2 py-1 text-xs ${days === d ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                    onclick={() => onDaysChange && onDaysChange(d)}>{d}d</button>
          {/each}
        </div>
      </div>
      <Chart options={chartOptions} />
    </div>
  {/if}
</Card>


