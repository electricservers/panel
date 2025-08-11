<script lang="ts">
  import { Card, Heading } from 'flowbite-svelte';

  interface Props {
    title: string;
    subtitle?: string;
    class?: string;
    children?: import('svelte').Snippet;
    titleSuffix?: import('svelte').Snippet;
  }

  let { title, subtitle = '', class: clazz = '', children, titleSuffix }: Props = $props();
</script>

<Card size="xl" class="shadow-sm {clazz}">
  <div class="mb-4 mt-px lg:mb-0">
    <Heading tag="h3" class="-ml-0.25 mb-2 flex items-center gap-2 text-xl font-semibold dark:text-white">
      <span>{title}</span>
      {@render titleSuffix?.()}
    </Heading>
    {#if subtitle}
      <span class="text-base font-normal text-gray-500 dark:text-gray-400">
        {subtitle}
      </span>
    {/if}
  </div>
  {@render children?.()}
</Card>
