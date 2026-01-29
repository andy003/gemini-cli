/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Static } from 'ink';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useAppContext } from '../contexts/AppContext.js';
import { AppHeader } from './AppHeader.js';
import { useAlternateBuffer } from '../hooks/useAlternateBuffer.js';
import {
  SCROLL_TO_ITEM_END,
  type VirtualizedListRef,
} from './shared/VirtualizedList.js';
import { ScrollableList } from './shared/ScrollableList.js';
import { useMemo, memo, useCallback, useEffect, useRef } from 'react';
import { MAX_GEMINI_MESSAGE_LINES } from '../constants.js';
import { useConfirmingTool } from '../hooks/useConfirmingTool.js';
import { ToolConfirmationQueue } from './ToolConfirmationQueue.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useAskUserActions } from '../contexts/AskUserActionsContext.js';
import { AskUserDialog } from './AskUserDialog.js';
import { PlanApprovalDialog } from './PlanApprovalDialog.js';
import { useUIActions } from '../contexts/UIActionsContext.js';

const MemoizedHistoryItemDisplay = memo(HistoryItemDisplay);
const MemoizedAppHeader = memo(AppHeader);

// Limit Gemini messages to a very high number of lines to mitigate performance
// issues in the worst case if we somehow get an enormous response from Gemini.
// This threshold is arbitrary but should be high enough to never impact normal
// usage.
export const MainContent = () => {
  const { version } = useAppContext();
  const uiState = useUIState();
  const uiActions = useUIActions();
  const config = useConfig();
  const isAlternateBuffer = useAlternateBuffer();
  const {
    request: askUserRequest,
    submit: askUserSubmit,
    cancel: askUserCancel,
  } = useAskUserActions();

  const confirmingTool = useConfirmingTool();
  const isEventDriven = config.isEventDrivenSchedulerEnabled();
  const showConfirmationQueue = isEventDriven && confirmingTool !== null;
  const showAskUserQueue = isEventDriven && askUserRequest !== null;
  const showPlanQueue = isEventDriven && !!uiState.planApprovalRequest;

  const scrollableListRef = useRef<VirtualizedListRef<unknown>>(null);

  useEffect(() => {
    if (showConfirmationQueue || showAskUserQueue || showPlanQueue) {
      scrollableListRef.current?.scrollToEnd();
    }
  }, [
    showConfirmationQueue,
    showAskUserQueue,
    showPlanQueue,
    confirmingTool,
    askUserRequest,
  ]);

  const {
    pendingHistoryItems,
    mainAreaWidth,
    staticAreaMaxItemHeight,
    availableTerminalHeight,
  } = uiState;

  const historyItems = useMemo(
    () =>
      uiState.history.map((h) => (
        <MemoizedHistoryItemDisplay
          terminalWidth={mainAreaWidth}
          availableTerminalHeight={staticAreaMaxItemHeight}
          availableTerminalHeightGemini={MAX_GEMINI_MESSAGE_LINES}
          key={h.id}
          item={h}
          isPending={false}
          commands={uiState.slashCommands}
        />
      )),
    [
      uiState.history,
      mainAreaWidth,
      staticAreaMaxItemHeight,
      uiState.slashCommands,
    ],
  );

  const pendingItems = useMemo(
    () => (
      <Box flexDirection="column">
        {pendingHistoryItems.map((item, i) => (
          <HistoryItemDisplay
            key={i}
            availableTerminalHeight={
              uiState.constrainHeight && !isAlternateBuffer
                ? availableTerminalHeight
                : undefined
            }
            terminalWidth={mainAreaWidth}
            item={{ ...item, id: 0 }}
            isPending={true}
            isFocused={!uiState.isEditorDialogOpen}
            activeShellPtyId={uiState.activePtyId}
            embeddedShellFocused={uiState.embeddedShellFocused}
          />
        ))}
        {showConfirmationQueue && confirmingTool && (
          <ToolConfirmationQueue confirmingTool={confirmingTool} />
        )}
        {showAskUserQueue && askUserRequest && (
          <AskUserDialog
            questions={askUserRequest.questions}
            onSubmit={askUserSubmit}
            onCancel={askUserCancel}
            inline={true}
            width={mainAreaWidth}
            shouldConstrainHeight={
              uiState.constrainHeight && !isAlternateBuffer
            }
          />
        )}
        {showPlanQueue && uiState.planApprovalRequest && (
          <PlanApprovalDialog
            planContent={uiState.planContent}
            onApprove={(mode) => uiActions.handlePlanApprove(mode)}
            onFeedback={uiActions.handlePlanFeedback}
            onCancel={uiActions.handlePlanCancel}
            inline={true}
            width={mainAreaWidth}
            shouldConstrainHeight={
              uiState.constrainHeight && !isAlternateBuffer
            }
          />
        )}
      </Box>
    ),
    [
      pendingHistoryItems,
      uiState.constrainHeight,
      isAlternateBuffer,
      availableTerminalHeight,
      mainAreaWidth,
      uiState.isEditorDialogOpen,
      uiState.activePtyId,
      uiState.embeddedShellFocused,
      showConfirmationQueue,
      confirmingTool,
      showAskUserQueue,
      askUserRequest,
      askUserSubmit,
      askUserCancel,
      showPlanQueue,
      uiState.planApprovalRequest,
      uiState.planContent,
      uiActions,
    ],
  );

  const virtualizedData = useMemo(
    () => [
      { type: 'header' as const },
      ...uiState.history.map((item) => ({ type: 'history' as const, item })),
      { type: 'pending' as const },
    ],
    [uiState.history],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof virtualizedData)[number] }) => {
      if (item.type === 'header') {
        return <MemoizedAppHeader key="app-header" version={version} />;
      } else if (item.type === 'history') {
        return (
          <MemoizedHistoryItemDisplay
            terminalWidth={mainAreaWidth}
            availableTerminalHeight={undefined}
            availableTerminalHeightGemini={MAX_GEMINI_MESSAGE_LINES}
            key={item.item.id}
            item={item.item}
            isPending={false}
            commands={uiState.slashCommands}
          />
        );
      } else {
        return pendingItems;
      }
    },
    [version, mainAreaWidth, uiState.slashCommands, pendingItems],
  );

  if (isAlternateBuffer) {
    return (
      <ScrollableList
        ref={scrollableListRef}
        hasFocus={!uiState.isEditorDialogOpen}
        width={uiState.terminalWidth}
        data={virtualizedData}
        renderItem={renderItem}
        estimatedItemHeight={() => 100}
        keyExtractor={(item, _index) => {
          if (item.type === 'header') return 'header';
          if (item.type === 'history') return item.item.id.toString();
          return 'pending';
        }}
        initialScrollIndex={SCROLL_TO_ITEM_END}
        initialScrollOffsetInIndex={SCROLL_TO_ITEM_END}
      />
    );
  }

  return (
    <>
      <Static
        key={uiState.historyRemountKey}
        items={[
          <AppHeader key="app-header" version={version} />,
          ...historyItems,
        ]}
      >
        {(item) => item}
      </Static>
      {pendingItems}
    </>
  );
};
