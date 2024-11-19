<script lang="ts">
  import { imagesPath } from '../../utils/variables';
  import { Avatar, Indicator } from 'flowbite-svelte';
  interface Props {
    src?: string;
    color?: Indicator['color'];
    children?: import('svelte').Snippet;
  }

  let { src = '', color = 'dark', children }: Props = $props();
</script>

<Avatar size="none" class="h-11 w-11">
  <img alt="" src={imagesPath(src, 'users')} class="rounded-full" />
  <Indicator placement="bottom-right" class="h-5 w-5 translate-y-0" {color}>
    {@render children?.()}
  </Indicator>
</Avatar>
