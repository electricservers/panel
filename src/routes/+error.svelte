<script lang="ts">
  import '../app.pcss';
  import { page } from '$app/stores';
  import NotFound from './utils/pages/NotFound.svelte';
  import Maintenance from './utils/pages/Maintenance.svelte';
  import ServerError from './utils/pages/ServerError.svelte';

  const pages = {
    400: Maintenance,
    404: NotFound,
    500: ServerError
  } as const;

  const status = +$page.status;
  const index = ([400, 404, 500].find((code) => status <= code) ?? 500) as keyof typeof pages;
  const component = pages[index];

  import MetaTag from './utils/MetaTag.svelte';

  const path: string = `/errors/${index}`;
  const description: string = `${index} - Flowbite Svelte Admin Dashboard`;
  const title: string = `Flowbite Svelte Admin Dashboard - ${index} page`;
  const subtitle: string = `${index} page`;

  const SvelteComponent = $derived(component);
</script>

<MetaTag {path} {description} {title} {subtitle} />

<SvelteComponent></SvelteComponent>
