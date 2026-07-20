<script lang="ts">
	let {
		sourceLabel,
		variant = 'panel',
		detail
	}: {
		sourceLabel: string;
		variant?: 'panel' | 'inline' | 'badge';
		detail?: string;
	} = $props();
</script>

{#if variant === 'panel'}
	<section class="flex flex-col gap-2 rounded-lg border border-danger/40 p-4" title={detail}>
		<h2 class="text-sm font-medium">{sourceLabel}</h2>
		<p class="text-sm text-danger">Couldn't reach this source.</p>
	</section>
{:else if variant === 'badge'}
	<span
		class="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
		title={detail}
	>
		{sourceLabel} unavailable
	</span>
{:else}
	<p class="text-sm text-danger" title={detail}>{sourceLabel}: couldn't reach this source.</p>
{/if}
