import type { EdgeManifest, ManifestEntity, ManifestField } from '@edge-manifest/core';

/**
 * Generates SvelteKit admin UI components from manifest
 */
export async function generateAdminUI(manifest: EdgeManifest): Promise<{
  routes: Record<string, string>;
  components: Record<string, string>;
}> {
  const routes: Record<string, string> = {};
  const components: Record<string, string> = {};

  for (const entity of manifest.entities) {
    const entityLower = entity.name.toLowerCase();

    // Generate list page
    routes[`${entityLower}/+page.svelte`] = generateListPage(entity);

    // Generate create page
    routes[`${entityLower}/new/+page.svelte`] = generateCreatePage(entity);

    // Generate detail/edit page
    routes[`${entityLower}/[id]/+page.svelte`] = generateDetailPage(entity);

    // Generate form component
    components[`${entityLower}-form.svelte`] = generateFormComponent(entity);

    // Generate table component
    components[`${entityLower}-table.svelte`] = generateTableComponent(entity);
  }

  return { routes, components };
}

function generateListPage(entity: ManifestEntity): string {
  const entityName = entity.name;
  const entityLower = entity.name.toLowerCase();

  return `<script lang="ts">
  import { onMount } from 'svelte';
  import type { ${entityName} } from '$lib/types';

  let items: ${entityName}[] = [];
  let loading = true;
  let page = 1;
  let limit = 10;
  let total = 0;

  async function loadItems() {
    loading = true;
    try {
      const response = await fetch(\`/api/${entityLower}s?page=\${page}&limit=\${limit}\`);
      const data = await response.json();
      items = data.data;
      total = data.meta.total;
    } catch (error) {
      console.error('Failed to load ${entityLower}s:', error);
    } finally {
      loading = false;
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this ${entityLower}?')) return;

    try {
      await fetch(\`/api/${entityLower}s/\${id}\`, { method: 'DELETE' });
      await loadItems();
    } catch (error) {
      console.error('Failed to delete ${entityLower}:', error);
    }
  }

  onMount(loadItems);
</script>

<div class="container">
  <div class="header">
    <h1>${entityName}s</h1>
    <a href="/${entityLower}s/new" class="btn btn-primary">Create New</a>
  </div>

  {#if loading}
    <p>Loading...</p>
  {:else if items.length === 0}
    <p>No ${entityLower}s found.</p>
  {:else}
    <table class="table">
      <thead>
        <tr>
          ${entity.fields
            .filter((f) => f.kind !== 'relation')
            .slice(0, 4)
            .map((f) => `<th>${f.name}</th>`)
            .join('\n          ')}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item}
          <tr>
            ${entity.fields
              .filter((f) => f.kind !== 'relation')
              .slice(0, 4)
              .map((f) => `<td>{item.${f.name}}</td>`)
              .join('\n            ')}
            <td>
              <a href="/${entityLower}s/{item.id}">View</a>
              <button on:click={() => deleteItem(item.id)}>Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="pagination">
      <button disabled={page === 1} on:click={() => { page--; loadItems(); }}>Previous</button>
      <span>Page {page} of {Math.ceil(total / limit)}</span>
      <button disabled={page >= Math.ceil(total / limit)} on:click={() => { page++; loadItems(); }}>Next</button>
    </div>
  {/if}
</div>`;
}

function generateCreatePage(entity: ManifestEntity): string {
  const entityName = entity.name;
  const entityLower = entity.name.toLowerCase();

  return `<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Create${entityName}Input } from '$lib/types';

  let formData: Create${entityName}Input = {
    ${entity.fields
      .filter((f) => f.kind !== 'relation' && f.kind !== 'id')
      .map((f) => `${f.name}: ${getDefaultValue(f)}`)
      .join(',\n    ')}
  };
  let submitting = false;
  let error = '';

  async function handleSubmit() {
    submitting = true;
    error = '';

    try {
      const response = await fetch('/api/${entityLower}s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create ${entityLower}');

      const data = await response.json();
      goto(\`/${entityLower}s/\${data.data.id}\`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
      submitting = false;
    }
  }
</script>

<div class="container">
  <h1>Create New ${entityName}</h1>

  <form on:submit|preventDefault={handleSubmit}>
    ${entity.fields
      .filter((f) => f.kind !== 'relation' && f.kind !== 'id')
      .map((f) => generateFormField(f))
      .join('\n\n    ')}

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="actions">
      <button type="submit" disabled={submitting} class="btn btn-primary">
        {submitting ? 'Creating...' : 'Create'}
      </button>
      <a href="/${entityLower}s" class="btn btn-secondary">Cancel</a>
    </div>
  </form>
</div>`;
}

function generateDetailPage(entity: ManifestEntity): string {
  const entityName = entity.name;
  const entityLower = entity.name.toLowerCase();

  return `<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { ${entityName}, Update${entityName}Input } from '$lib/types';
  import { onMount } from 'svelte';

  let id: string;
  let item: ${entityName} | null = null;
  let editing = false;
  let loading = true;
  let submitting = false;
  let error = '';

  $: id = $page.params.id;

  async function loadItem() {
    loading = true;
    try {
      const response = await fetch(\`/api/${entityLower}s/\${id}\`);
      const data = await response.json();
      item = data.data;
    } catch (err) {
      error = 'Failed to load ${entityLower}';
    } finally {
      loading = false;
    }
  }

  async function handleUpdate() {
    if (!item) return;

    submitting = true;
    error = '';

    try {
      const response = await fetch(\`/api/${entityLower}s/\${id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (!response.ok) throw new Error('Failed to update ${entityLower}');

      editing = false;
      await loadItem();
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      submitting = false;
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this ${entityLower}?')) return;

    try {
      await fetch(\`/api/${entityLower}s/\${id}\`, { method: 'DELETE' });
      goto('/${entityLower}s');
    } catch (err) {
      error = 'Failed to delete ${entityLower}';
    }
  }

  onMount(loadItem);
</script>

<div class="container">
  {#if loading}
    <p>Loading...</p>
  {:else if !item}
    <p>Item not found</p>
  {:else}
    <div class="header">
      <h1>${entityName} Details</h1>
      <div class="actions">
        {#if editing}
          <button on:click={handleUpdate} disabled={submitting} class="btn btn-primary">
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button on:click={() => { editing = false; loadItem(); }} class="btn btn-secondary">
            Cancel
          </button>
        {:else}
          <button on:click={() => editing = true} class="btn btn-primary">Edit</button>
          <button on:click={handleDelete} class="btn btn-danger">Delete</button>
        {/if}
      </div>
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="details">
      ${entity.fields
        .filter((f) => f.kind !== 'relation')
        .map(
          (f) => `<div class="field">
        <label>${f.name}</label>
        {#if editing}
          ${generateEditField(f)}
        {:else}
          <span>{item.${f.name}}</span>
        {/if}
      </div>`,
        )
        .join('\n\n      ')}
    </div>
  {/if}
</div>`;
}

function generateFormField(field: ManifestField): string {
  if (field.kind === 'relation') return '';

  let inputElement = '';

  switch (field.kind) {
    case 'string':
      inputElement = `<input type="text" bind:value={formData.${field.name}} ${field.required ? 'required' : ''} />`;
      break;

    case 'number':
      inputElement = `<input type="number" bind:value={formData.${field.name}} ${field.required ? 'required' : ''} />`;
      break;

    case 'boolean':
      inputElement = `<input type="checkbox" bind:checked={formData.${field.name}} />`;
      break;

    case 'date':
      inputElement = `<input type="datetime-local" bind:value={formData.${field.name}} ${field.required ? 'required' : ''} />`;
      break;

    case 'json':
      inputElement = `<textarea bind:value={formData.${field.name}} ${field.required ? 'required' : ''}></textarea>`;
      break;

    default:
      inputElement = `<input type="text" bind:value={formData.${field.name}} />`;
  }

  return `<div class="form-field">
      <label for="${field.name}">${field.name}</label>
      ${inputElement}
    </div>`;
}

function generateEditField(field: ManifestField): string {
  if (field.kind === 'relation' || field.kind === 'id') return '';

  switch (field.kind) {
    case 'boolean':
      return `<input type="checkbox" bind:checked={item.${field.name}} />`;

    case 'number':
      return `<input type="number" bind:value={item.${field.name}} />`;

    case 'date':
      return `<input type="datetime-local" bind:value={item.${field.name}} />`;

    case 'json':
      return `<textarea bind:value={item.${field.name}}></textarea>`;

    default:
      return `<input type="text" bind:value={item.${field.name}} />`;
  }
}

function generateFormComponent(entity: ManifestEntity): string {
  return `<!-- This is a placeholder form component for ${entity.name} -->
<div class="form-component">
  <p>Form component for ${entity.name}</p>
</div>`;
}

function generateTableComponent(entity: ManifestEntity): string {
  return `<!-- This is a placeholder table component for ${entity.name} -->
<div class="table-component">
  <p>Table component for ${entity.name}</p>
</div>`;
}

function getDefaultValue(field: ManifestField): string {
  if (field.kind === 'relation') return 'null';

  switch (field.kind) {
    case 'string':
      return "''";
    case 'number':
      return '0';
    case 'boolean':
      return 'false';
    case 'date':
      return "''";
    case 'json':
      return '{}';
    default:
      return "''";
  }
}
