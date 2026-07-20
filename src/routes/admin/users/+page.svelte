<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Table from '$lib/components/ui/table/index.js';
	import Button from '$lib/components/ui/button/button.svelte';

	const ROLES = ['user', 'admin', 'owner'] as const;

	let { data, form } = $props();
</script>

<div class="flex flex-col gap-4">
	<h1 class="font-heading text-2xl font-semibold tracking-tight">Users</h1>

	{#if form?.message}
		<p class="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger">
			{form.message}
		</p>
	{/if}

	{#if data.users.length === 0}
		<p class="text-sm text-muted-foreground">No one has logged in yet.</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>SteamID</Table.Head>
					<Table.Head>Role</Table.Head>
					<Table.Head></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.users as user (user.steamId)}
					<Table.Row>
						<Table.Cell class="font-medium">{user.name ?? 'Unknown'}</Table.Cell>
						<Table.Cell class="font-mono text-xs text-muted-foreground">{user.steamId}</Table.Cell>
						<Table.Cell colspan={2}>
							<form method="POST" action="?/updateRole" use:enhance class="flex items-center gap-2">
								<input type="hidden" name="steamId" value={user.steamId} />
								<select
									name="role"
									class="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
								>
									{#each ROLES as role (role)}
										<option value={role} selected={role === user.role}>{role}</option>
									{/each}
								</select>
								<Button type="submit" variant="outline" size="sm">Save</Button>
							</form>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
