/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderWithProviders } from '../../test-utils/render.js';
import { waitFor } from '../../test-utils/async.js';
import { MainContent } from './MainContent.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Box, Text } from 'ink';
import type React from 'react';

// Mock dependencies
vi.mock('../contexts/AppContext.js', async () => {
  const actual = await vi.importActual('../contexts/AppContext.js');
  return {
    ...actual,
    useAppContext: () => ({
      version: '1.0.0',
    }),
  };
});

vi.mock('../contexts/UIStateContext.js', async () => {
  const actual = await vi.importActual('../contexts/UIStateContext.js');
  return {
    ...actual,
    useUIState: () => ({
      history: [
        { id: 1, role: 'user', content: 'Hello' },
        { id: 2, role: 'model', content: 'Hi there' },
      ],
      pendingHistoryItems: [],
      mainAreaWidth: 80,
      staticAreaMaxItemHeight: 20,
      availableTerminalHeight: 24,
      slashCommands: [],
      constrainHeight: false,
      isEditorDialogOpen: false,
      activePtyId: undefined,
      embeddedShellFocused: false,
      historyRemountKey: 0,
    }),
  };
});

vi.mock('../hooks/useAlternateBuffer.js', () => ({
  useAlternateBuffer: vi.fn(),
}));

vi.mock('./HistoryItemDisplay.js', () => ({
  HistoryItemDisplay: ({
    item,
    availableTerminalHeight,
  }: {
    item: { content: string };
    availableTerminalHeight?: number;
  }) => (
    <Box>
      <Text>
        HistoryItem: {item.content} (height:{' '}
        {availableTerminalHeight === undefined
          ? 'undefined'
          : availableTerminalHeight}
        )
      </Text>
    </Box>
  ),
}));

vi.mock('./AppHeader.js', () => ({
  AppHeader: () => <Text>AppHeader</Text>,
}));

vi.mock('./ShowMoreLines.js', () => ({
  ShowMoreLines: () => <Text>ShowMoreLines</Text>,
}));

vi.mock('../contexts/AskUserActionsContext.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../contexts/AskUserActionsContext.js')
    >();
  return {
    ...actual,
    useAskUserActions: vi.fn().mockReturnValue({
      request: null,
      submit: vi.fn(),
      cancel: vi.fn(),
    }),
  };
});

vi.mock('./AskUserDialog.js', () => ({
  AskUserDialog: ({ inline }: { inline?: boolean }) => (
    <Text>AskUserDialog (inline: {String(inline)})</Text>
  ),
}));

vi.mock('../contexts/ConfigContext.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../contexts/ConfigContext.js')>();
  return {
    ...actual,
    useConfig: vi.fn().mockReturnValue({
      isEventDrivenSchedulerEnabled: () => false,
    }),
  };
});

vi.mock('./shared/ScrollableList.js', () => ({
  ScrollableList: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (props: { item: unknown }) => React.JSX.Element;
  }) => (
    <Box flexDirection="column">
      <Text>ScrollableList</Text>
      {data.map((item: unknown, index: number) => (
        <Box key={index}>{renderItem({ item })}</Box>
      ))}
    </Box>
  ),
  SCROLL_TO_ITEM_END: 0,
}));

import { useAlternateBuffer } from '../hooks/useAlternateBuffer.js';
import { useAskUserActions } from '../contexts/AskUserActionsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { type Config } from '@google/gemini-cli-core';

describe('MainContent', () => {
  beforeEach(() => {
    vi.mocked(useAlternateBuffer).mockReturnValue(false);
    vi.mocked(useAskUserActions).mockReturnValue({
      request: null,
      submit: vi.fn(),
      cancel: vi.fn(),
    });
    vi.mocked(useConfig).mockReturnValue({
      isEventDrivenSchedulerEnabled: () => false,
    } as unknown as Config);
  });

  it('renders in normal buffer mode', async () => {
    const { lastFrame } = renderWithProviders(<MainContent />);
    await waitFor(() => expect(lastFrame()).toContain('AppHeader'));
    const output = lastFrame();

    expect(output).toContain('HistoryItem: Hello (height: 20)');
    expect(output).toContain('HistoryItem: Hi there (height: 20)');
  });

  it('renders in alternate buffer mode', async () => {
    vi.mocked(useAlternateBuffer).mockReturnValue(true);
    const { lastFrame } = renderWithProviders(<MainContent />);
    await waitFor(() => expect(lastFrame()).toContain('ScrollableList'));
    const output = lastFrame();

    expect(output).toContain('AppHeader');
    expect(output).toContain('HistoryItem: Hello (height: undefined)');
    expect(output).toContain('HistoryItem: Hi there (height: undefined)');
  });

  it('does not constrain height in alternate buffer mode', async () => {
    vi.mocked(useAlternateBuffer).mockReturnValue(true);
    const { lastFrame } = renderWithProviders(<MainContent />);
    await waitFor(() => expect(lastFrame()).toContain('HistoryItem: Hello'));
    const output = lastFrame();

    expect(output).toMatchSnapshot();
  });

  it('renders AskUserDialog when event-driven scheduler is enabled and request is present', async () => {
    vi.mocked(useConfig).mockReturnValue({
      isEventDrivenSchedulerEnabled: () => true,
    } as unknown as Config);
    vi.mocked(useAskUserActions).mockReturnValue({
      request: { questions: [], correlationId: '123' },
      submit: vi.fn(),
      cancel: vi.fn(),
    });

    const { lastFrame } = renderWithProviders(<MainContent />);
    await waitFor(() =>
      expect(lastFrame()).toContain('AskUserDialog (inline: true)'),
    );
  });

  it('does not render AskUserDialog when event-driven scheduler is disabled', async () => {
    vi.mocked(useConfig).mockReturnValue({
      isEventDrivenSchedulerEnabled: () => false,
    } as unknown as Config);
    vi.mocked(useAskUserActions).mockReturnValue({
      request: { questions: [], correlationId: '123' },
      submit: vi.fn(),
      cancel: vi.fn(),
    });

    const { lastFrame } = renderWithProviders(<MainContent />);
    await waitFor(() => expect(lastFrame()).not.toContain('AskUserDialog'));
  });
});
