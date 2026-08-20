<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
</script>

<div class="rounded-lg border border-border bg-card p-4">
	<div class="mb-3 flex items-baseline justify-between">
		<h3 class="text-sm font-medium">Rating over time</h3>
		<Skeleton class="h-3 w-32" />
	</div>
	<Skeleton class="aspect-[3/1] w-full" />
</div>
