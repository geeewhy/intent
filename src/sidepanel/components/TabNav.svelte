<script lang="ts">
  import { page } from '$app/stores';
  $: path = $page.url.pathname;
</script>

<div class="tabs tabs-boxed bg-base-200">
  <a href="/commands" class="tab {path.startsWith('/commands') ? 'tab-active' : ''}">Commands</a>
  <a href="/events" class="tab {path.startsWith('/events') ? 'tab-active' : ''}">Events</a>
  <a href="/projections" class="tab {path.startsWith('/projections') ? 'tab-active' : ''}">Projections</a>
  <a href="/traces" class="tab {path.startsWith('/traces') ? 'tab-active' : ''}">Traces</a>
  <a href="/replay" class="tab {path.startsWith('/replay') ? 'tab-active' : ''}">Replay</a>
  <a href="/aggregates" class="tab {path.startsWith('/aggregates') ? 'tab-active' : ''}">Aggregates</a>
</div>
