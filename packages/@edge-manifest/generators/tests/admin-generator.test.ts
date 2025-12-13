import { describe, expect, it } from 'vitest';
import { generateAdminUI } from '../src/admin-generator';
import { sampleManifest, simpleManifest } from './fixtures';

describe('Admin Generator', () => {
  describe('generateAdminUI', () => {
    it('should generate admin routes and components', async () => {
      const admin = await generateAdminUI(simpleManifest);

      expect(admin).toHaveProperty('routes');
      expect(admin).toHaveProperty('components');
    });

    it('should generate list page', async () => {
      const admin = await generateAdminUI(simpleManifest);

      expect(admin.routes['user/+page.svelte']).toBeDefined();
      expect(admin.routes['user/+page.svelte']).toContain('<script');
      expect(admin.routes['user/+page.svelte']).toContain('let items:');
    });

    it('should generate create page', async () => {
      const admin = await generateAdminUI(simpleManifest);

      expect(admin.routes['user/new/+page.svelte']).toBeDefined();
      expect(admin.routes['user/new/+page.svelte']).toContain('<script');
      expect(admin.routes['user/new/+page.svelte']).toContain('formData:');
    });

    it('should generate detail page', async () => {
      const admin = await generateAdminUI(simpleManifest);

      expect(admin.routes['user/[id]/+page.svelte']).toBeDefined();
      expect(admin.routes['user/[id]/+page.svelte']).toContain('<script');
      expect(admin.routes['user/[id]/+page.svelte']).toContain('let item:');
    });

    it('should generate form component', async () => {
      const admin = await generateAdminUI(simpleManifest);

      expect(admin.components['user-form.svelte']).toBeDefined();
      expect(admin.components['user-form.svelte']).toContain('form-component');
    });

    it('should generate table component', async () => {
      const admin = await generateAdminUI(simpleManifest);

      expect(admin.components['user-table.svelte']).toBeDefined();
      expect(admin.components['user-table.svelte']).toContain('table-component');
    });

    it('should include API calls', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const listPage = admin.routes['user/+page.svelte'];

      expect(listPage).toContain('fetch(');
      expect(listPage).toContain('/api/users');
    });

    it('should include pagination', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const listPage = admin.routes['user/+page.svelte'];

      expect(listPage).toContain('page');
      expect(listPage).toContain('limit');
      expect(listPage).toContain('Previous');
      expect(listPage).toContain('Next');
    });

    it('should include CRUD operations', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const listPage = admin.routes['user/+page.svelte'];

      expect(listPage).toContain('loadItems');
      expect(listPage).toContain('deleteItem');
    });

    it('should include form fields', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const createPage = admin.routes['user/new/+page.svelte'];

      expect(createPage).toContain('bind:value');
      expect(createPage).toContain('handleSubmit');
    });

    it('should handle different field types', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const createPage = admin.routes['user/new/+page.svelte'];

      expect(createPage).toContain('type="text"');
      expect(createPage).toContain('type="number"');
      expect(createPage).toContain('type="checkbox"');
    });

    it('should handle multiple entities', async () => {
      const admin = await generateAdminUI(sampleManifest);

      expect(admin.routes['user/+page.svelte']).toBeDefined();
      expect(admin.routes['post/+page.svelte']).toBeDefined();
    });

    it('should include error handling', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const createPage = admin.routes['user/new/+page.svelte'];

      expect(createPage).toContain('let error');
      expect(createPage).toContain('try {');
      expect(createPage).toContain('catch');
    });

    it('should include loading states', async () => {
      const admin = await generateAdminUI(simpleManifest);
      const listPage = admin.routes['user/+page.svelte'];

      expect(listPage).toContain('let loading');
      expect(listPage).toContain('{#if loading}');
    });
  });
});
