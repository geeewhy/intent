<script lang="ts">
  import Header from './Header.svelte';
  import SidePanel from './SidePanel.svelte';
  import FooterLogs from './FooterLogs.svelte';
</script>

<div class="flex flex-col h-screen">
  <Header />
  <div class="flex flex-1 overflow-hidden">
    <SidePanel class="w-72 shrink-0 border-r border-base-content/10 overflow-y-auto" />
    <main class="flex-1 overflow-auto px-6 py-4">
      <slot />
    </main>
  </div>
  <FooterLogs />
</div>
