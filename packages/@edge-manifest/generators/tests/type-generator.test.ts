import { describe, expect, it } from 'vitest';
import { generateApiTypes, generateTypes } from '../src/type-generator';
import { sampleManifest, simpleManifest } from './fixtures';

describe('Type Generator', () => {
  describe('generateTypes', () => {
    it('should generate TypeScript interfaces', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('export interface User');
      expect(types).toContain('export type CreateUserInput');
      expect(types).toContain('export type UpdateUserInput');
    });

    it('should include all entity fields', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('id');
      expect(types).toContain('email');
      expect(types).toContain('name');
      expect(types).toContain('age');
    });

    it('should handle field types correctly', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('id: string');
      expect(types).toContain('email: string');
      expect(types).toContain('age?: number');
      expect(types).toContain('isActive?: boolean');
    });

    it('should include timestamps', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('createdAt?: Date');
      expect(types).toContain('updatedAt?: Date');
    });

    it('should generate query types', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('export interface ListUserQuery');
      expect(types).toContain('page?: number');
      expect(types).toContain('limit?: number');
      expect(types).toContain('sortBy?:');
      expect(types).toContain('order?:');
    });

    it('should generate API envelope types', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('export interface ApiResponse<T>');
      expect(types).toContain('export interface ApiError');
      expect(types).toContain('data: T');
      expect(types).toContain('meta?:');
      expect(types).toContain('error?: string');
    });

    it('should handle multiple entities', async () => {
      const types = await generateTypes(sampleManifest);

      expect(types).toContain('export interface User');
      expect(types).toContain('export interface Post');
    });

    it('should generate Create and Update input types', async () => {
      const types = await generateTypes(simpleManifest);

      expect(types).toContain('Omit<User');
      expect(types).toContain('Partial<CreateUserInput>');
    });
  });

  describe('generateApiTypes', () => {
    it('should generate API endpoint types', async () => {
      const types = await generateApiTypes(simpleManifest);

      expect(types).toContain('GetUserRequest');
      expect(types).toContain('GetUserResponse');
      expect(types).toContain('ListUserRequest');
      expect(types).toContain('ListUserResponse');
      expect(types).toContain('CreateUserRequest');
      expect(types).toContain('CreateUserResponse');
      expect(types).toContain('UpdateUserRequest');
      expect(types).toContain('UpdateUserResponse');
      expect(types).toContain('DeleteUserRequest');
      expect(types).toContain('DeleteUserResponse');
    });

    it('should include request/response structure', async () => {
      const types = await generateApiTypes(simpleManifest);

      expect(types).toContain('id: string');
      expect(types).toContain('data:');
    });

    it('should handle multiple entities', async () => {
      const types = await generateApiTypes(sampleManifest);

      expect(types).toContain('GetUserRequest');
      expect(types).toContain('GetPostRequest');
    });
  });
});
