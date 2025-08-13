<script lang="ts">
  interface Props {
    size?: string;
    color?: string;
    class?: string;
  }

  let { size = '24', color = 'currentColor', class: className = '' }: Props = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} class={className}>
  <path d="M3 1H1V3H3V1Z" fill={color} />
  <path d="M3 5H1V7H3V5Z" fill={color} />
  <path d="M1 9H3V11H1V9Z" fill={color} />
  <path d="M3 13H1V15H3V13Z" fill={color} />
  <path d="M15 1H5V3H15V1Z" fill={color} />
  <path d="M15 5H5V7H15V5Z" fill={color} />
  <path d="M5 9H15V11H5V9Z" fill={color} />
  <path d="M15 13H5V15H15V13Z" fill={color} />
</svg>
