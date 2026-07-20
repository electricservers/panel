<script lang="ts">
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
</script>

<div class="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
	<div
		class="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left"
	>
		<Skeleton class="size-20 rounded-full" />
		<div class="flex flex-1 flex-col items-center gap-2 sm:items-start">
			<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-6 w-20 rounded-full" />
			</div>
			<Skeleton class="h-4 w-72" />
		</div>
	</div>
</div>
