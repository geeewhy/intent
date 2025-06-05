<script lang="ts">
  import TabNav from '../components/TabNav.svelte';
  import SelectTenant from '../components/SelectTenant.svelte';
  import SelectRole from '../components/SelectRole.svelte';
  import GlobalSearchInput from '../components/GlobalSearchInput.svelte';
</script>

<header class="navbar bg-base-100 shadow-md border-b border-base-content/10">
  <div class="navbar-start gap-4">
    <img src="/docs/assets/logo-text.svg" alt="logo" class="h-6 opacity-80" />
    <TabNav />
  </div>
  <div class="navbar-end gap-2">
    <SelectTenant />
    <SelectRole />
    <GlobalSearchInput />
  </div>
</header>
