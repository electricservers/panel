<script lang="ts">
  import Title from '$lib/components/Title.svelte';
  import { onMount } from 'svelte';
  import { updateSiteSettings } from '$lib/stores/siteSettingsStore';

  // Form data
  let siteName = $state('');
  let siteDescription = $state('');
  let currentFaviconPath = $state('/images/favicon.png');
  let enabledRegions = $state(['ar', 'br']);
  
  // Upload state
  let faviconFile = $state<File | null>(null);
  let faviconPreview = $state('');
  let isUploading = $state(false);
  let isSaving = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');

  // Load current settings
  onMount(async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      
      if (response.ok) {
        const settings = result;
        siteName = settings.siteName || 'Electric Panel';
        siteDescription = settings.siteDescription || '';
        currentFaviconPath = settings.faviconPath || '/images/favicon.png';
        enabledRegions = settings.enabledRegions || ['ar', 'br'];
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      errorMessage = 'Failed to load current settings';
    }
  });

  // Handle favicon file selection
  function handleFaviconChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      faviconFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        faviconPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Upload favicon
  async function uploadFavicon() {
    if (!faviconFile) return;

    isUploading = true;
    errorMessage = '';
    
    try {
      const formData = new FormData();
      formData.append('favicon', faviconFile);
      
      const response = await fetch('/api/admin/favicon', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        currentFaviconPath = result.faviconPath;
        faviconPreview = '';
        faviconFile = null;
        successMessage = 'Favicon uploaded successfully!';
        // Update store to reflect changes immediately
        updateSiteSettings({
          faviconPath: result.faviconPath
        });
        // Clear file input
        const input = document.getElementById('favicon-input') as HTMLInputElement;
        if (input) input.value = '';
      } else {
        errorMessage = result.error || 'Failed to upload favicon';
      }
    } catch (error) {
      console.error('Error uploading favicon:', error);
      errorMessage = 'Failed to upload favicon';
    } finally {
      isUploading = false;
    }
  }

  // Save settings
  async function saveSettings() {
    isSaving = true;
    errorMessage = '';
    
    try {
      const settings = {
        siteName,
        siteDescription,
        enabledRegions
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
        successMessage = 'Settings saved successfully!';
        // Update store to reflect changes immediately
        updateSiteSettings({
          siteName,
          siteDescription,
          enabledRegions
        });
        setTimeout(() => {
          successMessage = '';
        }, 3000);
      } else {
        errorMessage = result.error || 'Failed to save settings';
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      errorMessage = 'Failed to save settings';
    } finally {
      isSaving = false;
    }
  }

  // Handle region toggle
  function toggleRegion(region: string) {
    if (enabledRegions.includes(region)) {
      enabledRegions = enabledRegions.filter(r => r !== region);
    } else {
      enabledRegions = [...enabledRegions, region];
    }
  }
</script>

<Title>Site Configuration</Title>

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
  <!-- General Settings -->
  <div class="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
    <h2 class="mb-4 text-lg font-semibold">General Settings</h2>
    <div class="space-y-4">
      <div>
        <label for="site-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Name</label>
        <input
          type="text"
          id="site-name"
          bind:value={siteName}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Enter site name..."
        />
      </div>
      <div>
        <label for="site-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Description</label>
        <textarea
          id="site-description"
          bind:value={siteDescription}
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Enter site description..."
        ></textarea>
      </div>
    </div>
  </div>

  <!-- Favicon Settings -->
  <div class="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
    <h2 class="mb-4 text-lg font-semibold">Site Icon (Favicon)</h2>
    <div class="space-y-4">
      <div class="flex items-center space-x-4">
        <div>
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Favicon</span>
          <img src={currentFaviconPath} alt="Current favicon" class="h-8 w-8 rounded border" />
        </div>
        {#if faviconPreview}
          <div>
            <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</span>
            <img src={faviconPreview} alt="Favicon preview" class="h-8 w-8 rounded border" />
          </div>
        {/if}
      </div>
      
      <div>
        <label for="favicon-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload New Favicon</label>
        <input
          type="file"
          id="favicon-input"
          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/jpg"
          onchange={handleFaviconChange}
          class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-300 dark:file:bg-blue-900/20 dark:file:text-blue-400"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">PNG, ICO, or JPEG files up to 2MB</p>
      </div>
      
      {#if faviconFile}
        <button
          type="button"
          onclick={uploadFavicon}
          disabled={isUploading}
          class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Favicon'}
        </button>
      {/if}
    </div>
  </div>

  <!-- Regional Settings -->
  <div class="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
    <h2 class="mb-4 text-lg font-semibold">Regional Settings</h2>
    <div class="space-y-4">
      <div>
        <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Available Regions</span>
        <div class="mt-2 space-y-2">
          <label class="flex items-center">
            <input 
              type="checkbox" 
              checked={enabledRegions.includes('ar')}
              onchange={() => toggleRegion('ar')}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Argentina (AR)</span>
          </label>
          <label class="flex items-center">
            <input 
              type="checkbox" 
              checked={enabledRegions.includes('br')}
              onchange={() => toggleRegion('br')}
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Brasil (BR)</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Save Button -->
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
