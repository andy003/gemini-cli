/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ProjectRegistry } from './projectRegistry.js';

describe('ProjectRegistry', () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-registry-test-'));
    registryPath = path.join(tempDir, 'projects.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates a short ID from the basename', () => {
    const registry = new ProjectRegistry(registryPath);
    const shortId = registry.getShortId('/path/to/my-project');
    expect(shortId).toBe('my-project');
  });

  it('slugifies the project name', () => {
    const registry = new ProjectRegistry(registryPath);
    const shortId = registry.getShortId('/path/to/My Project! @2025');
    expect(shortId).toBe('my-project-2025');
  });

  it('handles collisions with unique suffixes', () => {
    const registry = new ProjectRegistry(registryPath);

    const id1 = registry.getShortId('/path/one/gemini');
    const id2 = registry.getShortId('/path/two/gemini');
    const id3 = registry.getShortId('/path/three/gemini');

    expect(id1).toBe('gemini');
    expect(id2).toBe('gemini-1');
    expect(id3).toBe('gemini-2');
  });

  it('persists and reloads the registry', () => {
    const registry1 = new ProjectRegistry(registryPath);
    registry1.getShortId('/path/to/project-a');

    const registry2 = new ProjectRegistry(registryPath);
    const id = registry2.getShortId('/path/to/project-a');

    expect(id).toBe('project-a');

    const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    expect(Object.values(data.projects)).toContain('project-a');
  });

  it('normalizes paths', () => {
    const registry = new ProjectRegistry(registryPath);
    const path1 = path.resolve('/path/to/project');
    const path2 = path.join(path1, '..', 'project');

    const id1 = registry.getShortId(path1);
    const id2 = registry.getShortId(path2);

    expect(id1).toBe(id2);
  });
});
