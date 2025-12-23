/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type CommandContext,
  type SlashCommand,
  CommandKind,
} from './types.js';
import { MessageType, type HistoryItemSkillsList } from '../types.js';

export const skillsCommand: SlashCommand = {
  name: 'skills',
  description: 'List available Gemini CLI agent skills. Usage: /skills [desc]',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  action: async (context: CommandContext, args?: string): Promise<void> => {
    const subCommand = args?.trim();

    // Default to NOT showing descriptions. The user must opt in with an argument.
    let useShowDescriptions = false;
    if (subCommand === 'desc' || subCommand === 'descriptions') {
      useShowDescriptions = true;
    }

    const skillManager = context.services.config?.getSkillManager();
    if (!skillManager) {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Could not retrieve skill manager.',
        },
        Date.now(),
      );
      return;
    }

    const skills = skillManager.getSkills();

    const skillsListItem: HistoryItemSkillsList = {
      type: MessageType.SKILLS_LIST,
      skills: skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
      })),
      showDescriptions: useShowDescriptions,
    };

    context.ui.addItem(skillsListItem, Date.now());
  },
};
