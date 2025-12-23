/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { skillsCommand } from './skillsCommand.js';
import { MessageType } from '../types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import type { CommandContext } from './types.js';
import type { Config } from '@google/gemini-cli-core';

describe('skillsCommand', () => {
  let context: CommandContext;

  beforeEach(() => {
    context = createMockCommandContext({
      services: {
        config: {
          getSkillManager: vi.fn().mockReturnValue({
            getSkills: vi.fn().mockReturnValue([
              { name: 'skill1', description: 'desc1' },
              { name: 'skill2', description: 'desc2' },
            ]),
          }),
        } as unknown as Config,
      },
    });
  });

  it('should add a SKILLS_LIST item to UI', async () => {
    await skillsCommand.action(context);

    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MessageType.SKILLS_LIST,
        skills: [
          { name: 'skill1', description: 'desc1' },
          { name: 'skill2', description: 'desc2' },
        ],
        showDescriptions: false,
      }),
      expect.any(Number),
    );
  });

  it('should enable descriptions if "desc" arg is provided', async () => {
    await skillsCommand.action(context, 'desc');

    expect(context.ui.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        showDescriptions: true,
      }),
      expect.any(Number),
    );
  });
});
