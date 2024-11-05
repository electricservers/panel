<script>
    /** @type {{children?: import('svelte').Snippet}} */
    let { children } = $props();
</script>

<h1 class="text-4xl font-bold text-gray-900 dark:text-white">
    {@render children?.()}
</h1>

