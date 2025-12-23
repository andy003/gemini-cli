/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../semantic-colors.js';
import { type SkillDefinition } from '../../types.js';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';

interface SkillsListProps {
  skills: readonly SkillDefinition[];
  showDescriptions: boolean;
  terminalWidth: number;
}

export const SkillsList: React.FC<SkillsListProps> = ({
  skills,
  showDescriptions,
  terminalWidth,
}) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color={theme.text.primary}>
      Available Agent Skills:
    </Text>
    <Box height={1} />
    {skills.length > 0 ? (
      skills.map((skill) => (
        <Box key={skill.name} flexDirection="row">
          <Text color={theme.text.primary}>{'  '}- </Text>
          <Box flexDirection="column">
            <Text bold color={theme.text.accent}>
              {skill.name}
            </Text>
            {showDescriptions && skill.description && (
              <MarkdownDisplay
                terminalWidth={terminalWidth}
                text={skill.description}
                isPending={false}
              />
            )}
          </Box>
        </Box>
      ))
    ) : (
      <Text color={theme.text.primary}> No skills available</Text>
    )}
  </Box>
);
