<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Whois!</h1>
