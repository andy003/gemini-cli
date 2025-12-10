/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// packages/core/src/a2a/a2a-tool.ts

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
  type ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
} from '../tools/tools.js';
import { A2AClientManager } from './a2a-client-manager.js';
import type { Message, TextPart, DataPart, FilePart, Task } from '@a2a-js/sdk';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { MessageBusType } from '../confirmation-bus/types.js';

class A2AToolInvocation extends BaseToolInvocation<
  { message: string },
  ToolResult
> {
  constructor(
    private readonly agentName: string,
    params: { message: string },
    messageBus?: MessageBus,
  ) {
    super(params, messageBus, agentName, agentName);
  }

  getDescription(): string {
    return `Calling agent ${this.agentName} with message: ${this.params.message}`;
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    const confirmationDetails: ToolCallConfirmationDetails = {
      type: 'info',
      title: `Confirm: ${this._toolDisplayName || this._toolName}`,
      prompt: this.getDescription(),
      onConfirm: async (outcome: ToolConfirmationOutcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          if (this.messageBus && this._toolName) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.messageBus.publish({
              type: MessageBusType.UPDATE_POLICY,
              toolName: this._toolName,
            });
          }
        }
      },
    };
    return confirmationDetails;
  }

  async execute(): Promise<ToolResult> {
    const clientManager = A2AClientManager.getInstance();
    const response = await clientManager.sendMessage(
      this.agentName,
      this.params.message,
    );

    if ('error' in response) {
      const error = `Error from agent ${this.agentName}: ${response.error.message}`;
      return {
        llmContent: error,
        returnDisplay: error,
      };
    }

    if (response.result.kind === 'message') {
      const messageText = extractMessageText(response.result);
      return {
        llmContent: messageText,
        returnDisplay: messageText,
      };
    }

    const taskText = extractTaskText(response.result);
    return {
      llmContent: taskText,
      returnDisplay: taskText,
    };
  }
}

export class A2ATool extends BaseDeclarativeTool<
  { message: string },
  ToolResult
> {
  constructor(
    private readonly agentName: string,
    description: string,
    messageBus?: MessageBus,
  ) {
    super(
      agentName,
      agentName,
      description,
      Kind.Other, // Using Kind.Other as requested
      {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to send to the agent.',
          },
        },
        required: ['message'],
      },
      undefined, // isOutputMarkdown
      undefined, // canUpdateOutput
      messageBus,
    );
  }

  protected createInvocation(params: {
    message: string;
  }): BaseToolInvocation<{ message: string }, ToolResult> {
    return new A2AToolInvocation(this.agentName, params, this.messageBus);
  }
}

export function extractMessageText(message: Message | undefined): string {
  if (!message) {
    return '';
  }

  const textParts = message.parts
    .filter((p): p is TextPart => p.kind === 'text')
    .map((p) => p.text)
    .filter(Boolean);

  if (textParts.length > 0) {
    return textParts.join(' ');
  }

  const dataParts = message.parts
    .filter((p): p is DataPart => p.kind === 'data')
    .map((p) => p.data)
    .filter(Boolean);

  if (dataParts.length > 0) {
    const responses = dataParts.map((data) => `Data: ${JSON.stringify(data)}`);
    return responses.join('\n');
  }

  const fileParts = message.parts
    .filter((p): p is FilePart => p.kind === 'file')
    .filter(Boolean);

  if (fileParts.length > 0) {
    const files = fileParts.map((fp) => {
      const fileData = fp.file;
      if (fileData.name) {
        return `File: ${fileData.name}`;
      }
      if ('uri' in fileData) {
        return `File: ${fileData.uri}`;
      }
      if ('bytes' in fileData) {
        return `File: [unnamed file with bytes]`;
      }
      return '[unknown file part]';
    });
    return files.join('\n');
  }

  if (message.parts.length > 0) {
    const responses = message.parts.map((part) => `${JSON.stringify(part)}`);
    return responses.join('\n');
  }

  return '';
}

export function extractTaskText(task: Task): string {
  let output = `ID:      ${task.id}\n`;
  output += `State:   ${task.status.state}\n`;

  // Extract message from task status
  const statusMessageText = extractMessageText(task.status.message);
  if (statusMessageText) {
    output += `Status Message: ${statusMessageText}\n`;
  }

  // Extract artifacts
  if (task.artifacts && task.artifacts.length > 0) {
    output += `Artifacts:\n`;
    for (const artifact of task.artifacts) {
      output += `  - Name: ${artifact.name}\n`;
      if (artifact.parts && artifact.parts.length > 0) {
        const artifactText = extractMessageText({
          kind: 'message',
          parts: artifact.parts,
          messageId: '',
        } as Message);
        if (artifactText) {
          output += `    Content: ${artifactText}\n`;
        }
      }
    }
  }

  // if (task.history && task.history.length > 0) {
  //   output += `\nHistory:\n ${task.history.length} messages\n`;
  // }

  return output;
}
