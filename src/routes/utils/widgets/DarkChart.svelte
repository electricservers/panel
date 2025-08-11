<script lang="ts">
    import { browser } from '$app/environment';
    import type { ApexOptions } from 'apexcharts';
    import { Chart } from 'flowbite-svelte';
    import { onMount } from 'svelte';

    type ConfigFunc = (dark: boolean) => ApexOptions;
    interface Props {
        configFunc: ConfigFunc;
        [key: string]: any;
    }

    let { configFunc, ...props }: Props = $props();

    let dark = $state(browser ? document.documentElement.classList.contains('dark') : false);

    let options: ApexOptions = $derived(configFunc(dark));
    

    function handler(ev: Event) {
        if ('detail' in ev) {
            dark = !!ev.detail;
        }
    }

    onMount(() => {
        document.addEventListener('dark', handler);
        return () => document.removeEventListener('dark', handler);
    });
</script>

<Chart {options} class={props.class} />
