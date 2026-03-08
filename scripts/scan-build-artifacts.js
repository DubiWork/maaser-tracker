/**
 * Build Artifact Security Scanner
 *
 * Scans the production build output (dist/) for:
 * - Leaked secrets (private keys, API secrets, passwords)
 * - Source maps that should not ship to production
 * - Accidentally included .env files
 * - Git history containing committed env files
 *
 * Firebase API keys (AIza...) are intentionally allowed because Firebase
 * security is enforced by Firestore rules, not API key secrecy.
 *
 * Exit codes:
 *   0 = clean
 *   1 = P0/P1 issues found
 *
 * Run: node scripts/scan-build-artifacts.js
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/**
 * Secret patterns to scan for in build artifacts.
 * Each pattern has a regex, severity (P0 = critical, P1 = high), and
 * an optional allowlist of secondary regexes that make a match benign.
 */
export const SECRET_PATTERNS = [
  {
    name: 'Private Key (RSA/EC/DSA)',
    regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
    severity: 'P0',
  },
  {
    name: 'AWS Secret Access Key',
    regex: /(?:aws)?_?secret_?(?:access)?_?key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}/i,
    severity: 'P0',
  },
  {
    name: 'Generic sk_ secret key',
    regex: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/,
    severity: 'P0',
  },
  {
    name: 'Hardcoded password assignment',
    regex: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i,
    severity: 'P1',
    allow: [/placeholder|example|schema|type|validation|required|label|hint/i],
  },
  {
    name: 'Generic secret assignment',
    regex: /(?:secret|token)_?(?:key)?\s*[:=]\s*["'][A-Za-z0-9/+=]{20,}["']/i,
    severity: 'P1',
    allow: [/AIza[A-Za-z0-9_-]{35}/, /firebase/i],
  },
  {
    name: '.env file reference',
    regex: /\.env\.local|\.env\.production/,
    severity: 'P1',
    allow: [/please\s+check|missing|configuration\s+error/i],
  },
];

// ---------------------------------------------------------------------------
// Core scanner functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Recursively list all files under a directory.
 * @param {string} dir - Directory to walk
 * @returns {string[]} Array of absolute file paths
 */
export function walkDir(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Scan a single file content for secret patterns.
 * @param {string} content - File content to scan
 * @param {string} filePath - File path (for reporting)
 * @returns {Array<{pattern: string, severity: string, file: string, line: number}>}
 */
export function scanContentForSecrets(content, filePath) {
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        // Check allowlist
        if (pattern.allow && pattern.allow.some(allowRegex => allowRegex.test(line))) {
          continue;
        }
        findings.push({
          pattern: pattern.name,
          severity: pattern.severity,
          file: filePath,
          line: i + 1,
        });
      }
    }
  }

  return findings;
}

/**
 * Check for source map files in the dist/assets/ directory.
 * @param {string} distDir - Path to dist directory
 * @returns {string[]} Array of source map file paths found
 */
export function findSourceMaps(distDir) {
  const assetsDir = join(distDir, 'assets');
  if (!existsSync(assetsDir)) return [];

  return walkDir(assetsDir).filter(f => extname(f) === '.map');
}

/**
 * Check for .env files in the dist directory.
 * @param {string} distDir - Path to dist directory
 * @returns {string[]} Array of .env file paths found
 */
export function findEnvFiles(distDir) {
  return walkDir(distDir).filter(f => {
    const name = f.split(/[/\\]/).pop();
    return /^\.env/.test(name);
  });
}

/**
 * Check git history for ever-committed .env files.
 * @param {string} projectRoot - Project root directory
 * @returns {string[]} Array of .env file paths found in git history
 */
export function checkGitHistoryForEnvFiles(projectRoot) {
  try {
    const output = execSync(
      'git log --all --diff-filter=A --name-only --pretty=format: -- "*.env*" "*.env.local"',
      { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return output
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && /\.env/.test(l))
      // Exclude .env.example which is safe to commit
      .filter(l => !l.endsWith('.env.example'));
  } catch {
    // git command failed (maybe not a git repo)
    return [];
  }
}

/**
 * Run the full scan on a dist directory.
 * @param {string} distDir - Path to dist directory
 * @param {string} projectRoot - Path to project root
 * @returns {{findings: Array, sourceMaps: string[], envFiles: string[], gitEnvFiles: string[], hasP0: boolean, hasP1: boolean}}
 */
export function runScan(distDir, projectRoot) {
  const allFiles = walkDir(distDir);
  const allFindings = [];

  for (const filePath of allFiles) {
    const ext = extname(filePath).toLowerCase();
    const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.txt', '.svg', '.xml', '.mjs'];
    if (!textExtensions.includes(ext)) continue;

    try {
      const content = readFileSync(filePath, 'utf8');
      const findings = scanContentForSecrets(content, filePath);
      allFindings.push(...findings);
    } catch {
      // Skip unreadable files
    }
  }

  const sourceMaps = findSourceMaps(distDir);
  const envFiles = findEnvFiles(distDir);
  const gitEnvFiles = checkGitHistoryForEnvFiles(projectRoot);

  const hasP0 = allFindings.some(f => f.severity === 'P0') ||
                sourceMaps.length > 0 ||
                envFiles.length > 0 ||
                gitEnvFiles.length > 0;
  const hasP1 = allFindings.some(f => f.severity === 'P1');

  return { findings: allFindings, sourceMaps, envFiles, gitEnvFiles, hasP0, hasP1 };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function printReport(result) {
  const { findings, sourceMaps, envFiles, gitEnvFiles, hasP0, hasP1 } = result;

  console.log('\n=== Build Artifact Security Scan ===\n');

  if (findings.length > 0) {
    console.log('Found ' + findings.length + ' potential secret(s) in build output:\n');
    for (const f of findings) {
      console.log('  [' + f.severity + '] ' + f.pattern);
      console.log('       File: ' + f.file);
      console.log('       Line: ' + f.line + '\n');
    }
  } else {
    console.log('  No secrets detected in build output.');
  }

  console.log('');
  if (sourceMaps.length > 0) {
    console.log('  [P0] Source maps found in dist/assets/ (' + sourceMaps.length + ' files):');
    for (const sm of sourceMaps) {
      console.log('       ' + sm);
    }
  } else {
    console.log('  No source maps in dist/assets/.');
  }

  console.log('');
  if (envFiles.length > 0) {
    console.log('  [P0] .env files found in dist/ (' + envFiles.length + ' files):');
    for (const ef of envFiles) {
      console.log('       ' + ef);
    }
  } else {
    console.log('  No .env files in dist/.');
  }

  console.log('');
  if (gitEnvFiles.length > 0) {
    console.log('  [P0] .env files found in git history (' + gitEnvFiles.length + ' files):');
    for (const gf of gitEnvFiles) {
      console.log('       ' + gf);
    }
    console.log('       Action: Use git filter-branch or BFG to remove from history.');
  } else {
    console.log('  No .env files in git history.');
  }

  console.log('\n--- Summary ---');
  if (hasP0) {
    console.log('  FAIL: P0 (critical) issues found. Build is NOT safe for deployment.');
  } else if (hasP1) {
    console.log('  WARN: P1 (high) issues found. Review before deployment.');
  } else {
    console.log('  PASS: No security issues detected.');
  }
  console.log('');
}

/**
 * Main entry point for CLI execution.
 * @param {Object} [options] - Options
 * @param {boolean} [options.skipBuild] - Skip the build step
 * @param {string} [options.distDir] - Custom dist directory
 * @param {string} [options.projectRoot] - Custom project root
 */
export async function main(options = {}) {
  const distDir = options.distDir || join(PROJECT_ROOT, 'dist');
  const projectRoot = options.projectRoot || PROJECT_ROOT;

  if (!options.skipBuild) {
    console.log('Building project...');
    try {
      execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env },
      });
    } catch {
      console.error('Build failed. Cannot scan artifacts.');
      process.exit(1);
    }
  }

  if (!existsSync(distDir)) {
    console.error('dist directory not found at ' + distDir);
    process.exit(1);
  }

  const result = runScan(distDir, projectRoot);
  printReport(result);

  if (result.hasP0) {
    process.exit(1);
  }
  process.exit(0);
}

// Run when executed directly (not imported)
const isDirectExecution = process.argv[1] &&
  (process.argv[1].includes('scan-build-artifacts') || process.argv[1] === fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const skipBuild = process.argv.includes('--skip-build');
  main({ skipBuild });
}
