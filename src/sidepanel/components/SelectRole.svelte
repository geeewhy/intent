<script lang="ts">
  let role = 'admin';
</script>

<select bind:value={role} class="select select-bordered select-sm">
  <option value="admin">Admin</option>
  <option value="viewer">Viewer</option>
</select>
