<script lang="ts">
  let active = 'chat';
</script>

<aside class="menu bg-base-200 h-full text-base-content p-2">
  <p class="menu-title">DevX Companion</p>
  <ul>
    <li><a class="active:bg-primary" on:click={() => active = 'chat'}>Chat</a></li>
    <li><a class="active:bg-primary" on:click={() => active = 'scaffold'}>Scaffold Wizard</a></li>
    <li><a class="active:bg-primary" on:click={() => active = 'simulate'}>What-if Simulator</a></li>
  </ul>
</aside>
