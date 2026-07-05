import * as fs from 'fs/promises';
import * as path from 'path';
import type { PresetsLock } from './types.js';
import { removePresetFromSettings } from './composer.js';

export interface UninstallResult {
  success: boolean;
  presetName: string;
  filesRemoved: string[];
}

export async function uninstallPreset(
  presetName: string,
  projectRoot: string
): Promise<UninstallResult> {
  const claudeDir = path.join(projectRoot, '.claude');
  const lock = await readLock(claudeDir);
  const filesRemoved: string[] = [];

  const installed = lock.installed[presetName];
  if (!installed) {
    throw new Error(`Preset "${presetName}" is not installed.`);
  }

  // Remove hook scripts and command files (not CLAUDE.md — handled separately)
  for (const filePath of installed.files) {
    if (filePath.endsWith('CLAUDE.md')) continue;
    try {
      await fs.unlink(filePath);
      filesRemoved.push(filePath);
    } catch {
      // File already removed
    }
  }

  // Remove snippet block from CLAUDE.md
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  try {
    let claudeMd = await fs.readFile(claudeMdPath, 'utf-8');
    const startMarker = `<!-- preset:${presetName}:start -->`;
    const endMarker = `<!-- preset:${presetName}:end -->`;
    const markerRegex = new RegExp(
      `\\n?${escapeRegex(startMarker)}[\\s\\S]*?${escapeRegex(endMarker)}\\n?`
    );
    const updated = claudeMd.replace(markerRegex, '');
    if (updated !== claudeMd) {
      await fs.writeFile(claudeMdPath, updated);
      filesRemoved.push(claudeMdPath + ' (snippet removed)');
    }
  } catch {
    // No CLAUDE.md
  }

  // Remove hook entries, permissions, and settings from settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  try {
    const existing = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
    let cleaned = removePresetFromSettings(existing, installed.hookEntries);

    if (installed.addedPermissions?.length) {
      const perms = (cleaned.permissions as Record<string, string[]>)?.allow;
      if (perms) {
        const removedSet = new Set(installed.addedPermissions);
        (cleaned.permissions as Record<string, string[]>).allow =
          perms.filter(p => !removedSet.has(p));
        if ((cleaned.permissions as Record<string, string[]>).allow.length === 0) {
          delete (cleaned as Record<string, unknown>).permissions;
        }
      }
    }

    if (installed.addedSettings?.length) {
      for (const key of installed.addedSettings) {
        delete (cleaned as Record<string, unknown>)[key];
      }
    }

    await fs.writeFile(settingsPath, JSON.stringify(cleaned, null, 2) + '\n');
  } catch {
    // No settings file
  }

  // Update lock
  delete lock.installed[presetName];
  await writeLock(claudeDir, lock);

  return { success: true, presetName, filesRemoved };
}

async function readLock(claudeDir: string): Promise<PresetsLock> {
  const lockPath = path.join(claudeDir, 'presets.lock.json');
  try {
    return JSON.parse(await fs.readFile(lockPath, 'utf-8')) as PresetsLock;
  } catch {
    return { installed: {} };
  }
}

async function writeLock(claudeDir: string, lock: PresetsLock): Promise<void> {
  const lockPath = path.join(claudeDir, 'presets.lock.json');
  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
