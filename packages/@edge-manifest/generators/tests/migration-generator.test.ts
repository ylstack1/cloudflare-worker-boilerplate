import { describe, expect, it } from 'vitest';
import { generateMigrationMetadata, generateMigrations, generateRollback } from '../src/migration-generator';
import { sampleManifest, simpleManifest } from './fixtures';

describe('Migration Generator', () => {
  describe('generateMigrations', () => {
    it('should generate SQL migration', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('-- Migration:');
      expect(migration).toContain('-- Timestamp:');
      expect(migration).toContain('CREATE TABLE');
    });

    it('should include all entity tables', async () => {
      const migration = await generateMigrations(sampleManifest);

      expect(migration).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(migration).toContain('CREATE TABLE IF NOT EXISTS posts');
    });

    it('should include all fields', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('id TEXT');
      expect(migration).toContain('email TEXT');
      expect(migration).toContain('name TEXT');
      expect(migration).toContain('age REAL');
      expect(migration).toContain('isActive INTEGER');
    });

    it('should include timestamps', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('created_at TEXT');
      expect(migration).toContain('updated_at TEXT');
      expect(migration).toContain('DEFAULT CURRENT_TIMESTAMP');
    });

    it('should include constraints', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('PRIMARY KEY');
      expect(migration).toContain('NOT NULL');
      expect(migration).toContain('UNIQUE');
    });

    it('should include default values', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('DEFAULT 1'); // boolean true
    });

    it('should generate indexes', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('CREATE UNIQUE INDEX');
      expect(migration).toContain('idx_users_email');
    });

    it('should use IF NOT EXISTS', async () => {
      const migration = await generateMigrations(simpleManifest);

      expect(migration).toContain('IF NOT EXISTS');
    });
  });

  describe('generateRollback', () => {
    it('should generate rollback migration', async () => {
      const rollback = await generateRollback(simpleManifest);

      expect(rollback).toContain('-- Migration:');
      expect(rollback).toContain('_rollback');
      expect(rollback).toContain('DROP TABLE');
    });

    it('should drop all entity tables', async () => {
      const rollback = await generateRollback(sampleManifest);

      expect(rollback).toContain('DROP TABLE IF EXISTS users');
      expect(rollback).toContain('DROP TABLE IF EXISTS posts');
    });

    it('should use IF EXISTS', async () => {
      const rollback = await generateRollback(simpleManifest);

      expect(rollback).toContain('IF EXISTS');
    });
  });

  describe('generateMigrationMetadata', () => {
    it('should generate migration metadata', () => {
      const metadata = generateMigrationMetadata(simpleManifest);

      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('timestamp');
      expect(metadata).toHaveProperty('entities');
    });

    it('should include all entities', () => {
      const metadata = generateMigrationMetadata(sampleManifest);

      expect(metadata.entities).toContain('User');
      expect(metadata.entities).toContain('Post');
    });

    it('should have valid timestamp', () => {
      const metadata = generateMigrationMetadata(simpleManifest);

      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should have numeric version', () => {
      const metadata = generateMigrationMetadata(simpleManifest);

      expect(typeof metadata.version).toBe('string');
      expect(Number(metadata.version)).toBeGreaterThan(0);
    });
  });
});
