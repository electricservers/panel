<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import { onMount } from 'svelte';
  
  let mgeEnabled = $state(true);
  let whoisEnabled = $state(true);
  let tf2pickupEnabled = $state(false);
  let isSaving = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');

  // Load current module settings
  onMount(async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      
      if (response.ok) {
        const modules = result.enabledModules;
        mgeEnabled = modules?.mge ?? true;
        whoisEnabled = modules?.whois ?? true;
        tf2pickupEnabled = modules?.tf2pickup ?? false;
      }
    } catch (error) {
      console.error('Error loading module settings:', error);
      errorMessage = 'Failed to load current settings';
    }
  });

  // Save module settings
  async function saveSettings() {
    isSaving = true;
    errorMessage = '';
    
    try {
      const settings = {
        enabledModules: {
          mge: mgeEnabled,
          whois: whoisEnabled,
          tf2pickup: tf2pickupEnabled
        }
      };
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        successMessage = 'Module settings saved successfully!';
        setTimeout(() => {
          successMessage = '';
        }, 3000);
      } else {
        errorMessage = result.error || 'Failed to save settings';
      }
    } catch (error) {
      console.error('Error saving module settings:', error);
      errorMessage = 'Failed to save settings';
    } finally {
      isSaving = false;
    }
  }
</script>

<Title>Module Management</Title>

<!-- Success/Error Messages -->
{#if successMessage}
  <div class="mb-4 rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
    {successMessage}
  </div>
{/if}

{#if errorMessage}
  <div class="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-300">
    {errorMessage}
  </div>
{/if}

<div class="space-y-6">
  <div class="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
    <h2 class="mb-4 text-lg font-semibold">Available Modules</h2>
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-600">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">MGE (My Gaming Edge)</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">TF2 MGE statistics and leaderboards</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" bind:checked={mgeEnabled} class="peer sr-only" />
          <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
        </label>
      </div>

      <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-600">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Whois</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Steam profile lookup and player information</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" bind:checked={whoisEnabled} class="peer sr-only" />
          <div class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
        </label>
      </div>

      <div class="flex items-center justify-between pb-4">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">TF2 Pickup</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Community pickup game organization (Coming Soon)</p>
        </div>
        <label class="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" bind:checked={tf2pickupEnabled} disabled class="peer sr-only" />
          <div class="peer h-6 w-11 rounded-full bg-gray-200 opacity-50 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
        </label>
      </div>
    </div>
  </div>

  <div class="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
    <h2 class="mb-4 text-lg font-semibold">Module Configuration</h2>
    
    {#if mgeEnabled}
      <div class="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 class="font-medium text-blue-900 dark:text-blue-300">MGE Settings</h3>
        <div class="mt-2 space-y-2">
          <label class="flex items-center">
            <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span class="ml-2 text-sm text-blue-800 dark:text-blue-300">Show leaderboards</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" checked class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span class="ml-2 text-sm text-blue-800 dark:text-blue-300">Enable arena statistics</span>
          </label>
        </div>
      </div>
    {/if}

    {#if whoisEnabled}
      <div class="mb-4 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
        <h3 class="font-medium text-green-900 dark:text-green-300">Whois Settings</h3>
        <div class="mt-2 space-y-2">
          <label class="flex items-center">
            <input type="checkbox" checked class="rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <span class="ml-2 text-sm text-green-800 dark:text-green-300">Show Steam profile information</span>
          </label>
          <label class="flex items-center">
            <input type="checkbox" checked class="rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <span class="ml-2 text-sm text-green-800 dark:text-green-300">Enable alt account detection</span>
          </label>
        </div>
      </div>
    {/if}

    {#if !mgeEnabled && !whoisEnabled}
      <p class="text-gray-500 dark:text-gray-400">No modules are currently enabled.</p>
    {/if}
  </div>

  <div class="flex justify-end">
    <button
      type="button"
      onclick={saveSettings}
      disabled={isSaving}
      class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
    >
      {isSaving ? 'Saving...' : 'Save Changes'}
    </button>
  </div>
</div>
