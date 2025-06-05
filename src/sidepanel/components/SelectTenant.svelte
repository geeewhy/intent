<script lang="ts">
  let tenant = 'default';
</script>

<select bind:value={tenant} class="select select-bordered select-sm">
  <option value="default">Default</option>
  <option value="acme">Acme</option>
</select>
