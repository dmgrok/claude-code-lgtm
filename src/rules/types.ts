export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
  fix?: string;
}

export interface DiscoveredFiles {
  projectRoot: string;
  claudeDir?: string;
  settingsJson?: string;
  settingsLocalJson?: string;
  hookScripts: string[];
  commandFiles: string[];
  mcpConfig?: string;
  skillFiles: string[];
}

export interface RuleContext {
  files: DiscoveredFiles;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: 'settings' | 'hooks' | 'commands' | 'permissions' | 'mcp' | 'skills';
  check(context: RuleContext): Promise<Finding[]>;
}
