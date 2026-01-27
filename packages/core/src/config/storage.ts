/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { GEMINI_DIR, homedir } from '../utils/paths.js';
import { ProjectRegistry } from './projectRegistry.js';
import { debugLogger } from 'src/utils/debugLogger.js';

export const GOOGLE_ACCOUNTS_FILENAME = 'google_accounts.json';
export const OAUTH_FILE = 'oauth_creds.json';
const TMP_DIR_NAME = 'tmp';
const BIN_DIR_NAME = 'bin';

export class Storage {
  private readonly targetDir: string;
  private projectIdentifier: string | undefined;

  constructor(targetDir: string) {
    this.targetDir = targetDir;
  }

  static getGlobalGeminiDir(): string {
    const homeDir = homedir();
    if (!homeDir) {
      return path.join(os.tmpdir(), GEMINI_DIR);
    }
    return path.join(homeDir, GEMINI_DIR);
  }

  static getMcpOAuthTokensPath(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'mcp-oauth-tokens.json');
  }

  static getGlobalSettingsPath(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'settings.json');
  }

  static getInstallationIdPath(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'installation_id');
  }

  static getGoogleAccountsPath(): string {
    return path.join(Storage.getGlobalGeminiDir(), GOOGLE_ACCOUNTS_FILENAME);
  }

  static getUserCommandsDir(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'commands');
  }

  static getUserSkillsDir(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'skills');
  }

  static getGlobalMemoryFilePath(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'memory.md');
  }

  static getUserPoliciesDir(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'policies');
  }

  static getUserAgentsDir(): string {
    return path.join(Storage.getGlobalGeminiDir(), 'agents');
  }

  static getAcknowledgedAgentsPath(): string {
    return path.join(
      Storage.getGlobalGeminiDir(),
      'acknowledgments',
      'agents.json',
    );
  }

  private static getSystemConfigDir(): string {
    if (os.platform() === 'darwin') {
      return '/Library/Application Support/GeminiCli';
    } else if (os.platform() === 'win32') {
      return 'C:\\ProgramData\\gemini-cli';
    } else {
      return '/etc/gemini-cli';
    }
  }

  static getSystemSettingsPath(): string {
    if (process.env['GEMINI_CLI_SYSTEM_SETTINGS_PATH']) {
      return process.env['GEMINI_CLI_SYSTEM_SETTINGS_PATH'];
    }
    return path.join(Storage.getSystemConfigDir(), 'settings.json');
  }

  static getSystemPoliciesDir(): string {
    return path.join(Storage.getSystemConfigDir(), 'policies');
  }

  static getGlobalTempDir(): string {
    return path.join(Storage.getGlobalGeminiDir(), TMP_DIR_NAME);
  }

  static getGlobalBinDir(): string {
    return path.join(Storage.getGlobalTempDir(), BIN_DIR_NAME);
  }

  getGeminiDir(): string {
    return path.join(this.targetDir, GEMINI_DIR);
  }

  getProjectTempDir(): string {
    const identifier = this.getProjectIdentifier();
    const tempDir = Storage.getGlobalTempDir();
    return path.join(tempDir, identifier);
  }

  ensureProjectTempDirExists(): void {
    fs.mkdirSync(this.getProjectTempDir(), { recursive: true });
  }

  static getOAuthCredsPath(): string {
    return path.join(Storage.getGlobalGeminiDir(), OAUTH_FILE);
  }

  getProjectRoot(): string {
    return this.targetDir;
  }

  private getFilePathHash(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }

  private getProjectIdentifier(): string {
    if (this.projectIdentifier) {
      return this.projectIdentifier;
    }

    const registryPath = path.join(
      Storage.getGlobalGeminiDir(),
      'projects.json',
    );
    const registry = new ProjectRegistry(registryPath);
    const shortId = registry.getShortId(this.getProjectRoot());

    // Migration logic to move old hash-based directories to new slug-based directories
    const oldHash = this.getFilePathHash(this.getProjectRoot());

    // Migrate Temp Dir
    const newTempDir = path.join(Storage.getGlobalTempDir(), shortId);
    if (!fs.existsSync(newTempDir)) {
      const oldTempDir = path.join(Storage.getGlobalTempDir(), oldHash);
      if (fs.existsSync(oldTempDir)) {
        try {
          fs.renameSync(oldTempDir, newTempDir);
        } catch (e) {
          debugLogger.debug('Failed to migrate temp directories: ', e);
        }
      }
    }

    // Migrate History Dir
    const historyDir = path.join(Storage.getGlobalGeminiDir(), 'history');
    const newHistoryDir = path.join(historyDir, shortId);
    if (!fs.existsSync(newHistoryDir)) {
      const oldHistoryDir = path.join(historyDir, oldHash);
      if (fs.existsSync(oldHistoryDir)) {
        try {
          // Ensure parent directory exists for history
          if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
          }
          fs.renameSync(oldHistoryDir, newHistoryDir);
        } catch (e) {
          debugLogger.debug('Failed to migrate temp directories: ', e);
        }
      }
    }

    this.projectIdentifier = shortId;
    return shortId;
  }

  getHistoryDir(): string {
    const identifier = this.getProjectIdentifier();
    const historyDir = path.join(Storage.getGlobalGeminiDir(), 'history');
    return path.join(historyDir, identifier);
  }

  getWorkspaceSettingsPath(): string {
    return path.join(this.getGeminiDir(), 'settings.json');
  }

  getProjectCommandsDir(): string {
    return path.join(this.getGeminiDir(), 'commands');
  }

  getProjectSkillsDir(): string {
    return path.join(this.getGeminiDir(), 'skills');
  }

  getProjectAgentsDir(): string {
    return path.join(this.getGeminiDir(), 'agents');
  }

  getProjectTempCheckpointsDir(): string {
    return path.join(this.getProjectTempDir(), 'checkpoints');
  }

  getProjectTempLogsDir(): string {
    return path.join(this.getProjectTempDir(), 'logs');
  }

  getProjectTempPlansDir(): string {
    return path.join(this.getProjectTempDir(), 'plans');
  }

  getExtensionsDir(): string {
    return path.join(this.getGeminiDir(), 'extensions');
  }

  getExtensionsConfigPath(): string {
    return path.join(this.getExtensionsDir(), 'gemini-extension.json');
  }

  getHistoryFilePath(): string {
    return path.join(this.getProjectTempDir(), 'shell_history');
  }
}
