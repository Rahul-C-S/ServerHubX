export interface CommandDefinition {
  command: string;
  description: string;
  requiresSudo: boolean;
  allowedArgumentPatterns?: RegExp[];
}

export const COMMAND_WHITELIST: Record<string, CommandDefinition> = {
  // User management commands
  useradd: {
    command: 'useradd',
    description: 'Create a new Linux user',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-m$/, // Create home directory
      /^-d$/, // Home directory path
      /^-s$/, // Shell
      /^-g$/, // Primary group
      /^-G$/, // Supplementary groups
      /^--home-dir$/, // Home directory (long form)
      /^--shell$/, // Shell (long form)
      /^\/home\/[a-z][a-z0-9_-]{0,31}$/, // Home directory path
      /^\/bin\/(bash|sh|false|nologin)$/, // Allowed shells
      /^\/usr\/sbin\/nologin$/, // No login shell
      /^[a-z][a-z0-9_-]{0,31}$/, // Username
    ],
  },
  userdel: {
    command: 'userdel',
    description: 'Delete a Linux user',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-r$/, // Remove home directory
      /^-f$/, // Force removal
      /^[a-z][a-z0-9_-]{0,31}$/, // Username
    ],
  },
  usermod: {
    command: 'usermod',
    description: 'Modify a Linux user',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-a$/, // Append
      /^-G$/, // Supplementary groups
      /^-s$/, // Shell
      /^-L$/, // Lock account
      /^-U$/, // Unlock account
      /^[a-z][a-z0-9_-]{0,31}$/, // Username
      /^\/bin\/(bash|sh|false|nologin)$/, // Allowed shells
      /^\/usr\/sbin\/nologin$/, // No login shell
    ],
  },
  chpasswd: {
    command: 'chpasswd',
    description: 'Update user password',
    requiresSudo: true,
    allowedArgumentPatterns: [],
  },

  // Apache commands
  a2ensite: {
    command: 'a2ensite',
    description: 'Enable Apache site',
    requiresSudo: true,
    allowedArgumentPatterns: [/^[a-z0-9][a-z0-9.-]{0,253}\.conf$/],
  },
  a2dissite: {
    command: 'a2dissite',
    description: 'Disable Apache site',
    requiresSudo: true,
    allowedArgumentPatterns: [/^[a-z0-9][a-z0-9.-]{0,253}\.conf$/],
  },
  a2enmod: {
    command: 'a2enmod',
    description: 'Enable Apache module',
    requiresSudo: true,
    allowedArgumentPatterns: [/^[a-z][a-z0-9_-]{0,63}$/],
  },
  a2dismod: {
    command: 'a2dismod',
    description: 'Disable Apache module',
    requiresSudo: true,
    allowedArgumentPatterns: [/^[a-z][a-z0-9_-]{0,63}$/],
  },
  apachectl: {
    command: 'apachectl',
    description: 'Apache control',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^configtest$/,
      /^graceful$/,
      /^restart$/,
      /^start$/,
      /^stop$/,
    ],
  },

  // systemctl commands
  systemctl: {
    command: 'systemctl',
    description: 'Control system services',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^start$/,
      /^stop$/,
      /^restart$/,
      /^reload$/,
      /^enable$/,
      /^disable$/,
      /^status$/,
      /^is-active$/,
      /^is-enabled$/,
      // Allowed services
      /^apache2$/,
      /^httpd$/,
      /^nginx$/,
      /^php[0-9.]+-fpm$/,
      /^mariadb$/,
      /^mysql$/,
      /^redis$/,
      /^redis-server$/,
      /^postfix$/,
      /^dovecot$/,
      /^named$/,
      /^bind9$/,
      /^csf$/,
      /^lfd$/,
      /^sshd$/,
    ],
  },

  // File operation commands
  chown: {
    command: 'chown',
    description: 'Change file ownership',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-R$/, // Recursive
      /^[a-z][a-z0-9_-]{0,31}:[a-z][a-z0-9_-]{0,31}$/, // user:group
      /^[a-z][a-z0-9_-]{0,31}$/, // user only
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/, // Home directory paths
    ],
  },
  chmod: {
    command: 'chmod',
    description: 'Change file permissions',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-R$/, // Recursive
      /^[0-7]{3,4}$/, // Octal permissions
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/, // Home directory paths
    ],
  },
  mkdir: {
    command: 'mkdir',
    description: 'Create directory',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-p$/, // Create parents
      /^-m$/, // Mode
      /^[0-7]{3,4}$/, // Octal permissions
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/, // Home directory paths
      /^\/etc\/(apache2|httpd)\/sites-available\/[a-z0-9][a-z0-9.-]{0,253}\.conf$/, // Apache sites
      /^\/var\/log\/[a-z][a-z0-9_-]{0,31}$/, // Log directories
    ],
  },
  rm: {
    command: 'rm',
    description: 'Remove file or directory',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-r$/, // Recursive
      /^-f$/, // Force
      /^-rf$/, // Combined
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)+$/, // Home directory paths (not root)
      /^\/etc\/(apache2|httpd)\/sites-(available|enabled)\/[a-z0-9][a-z0-9.-]{0,253}\.conf$/,
      /^\/etc\/php\/[0-9.]+\/fpm\/pool\.d\/[a-z][a-z0-9_-]{0,31}\.conf$/,
      /^\/var\/named\/[a-z0-9][a-z0-9.-]{0,253}\.zone$/, // DNS zone files
      /^\/etc\/bind\/zones\/[a-z0-9][a-z0-9.-]{0,253}\.zone$/,
    ],
  },
  cp: {
    command: 'cp',
    description: 'Copy file',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-r$/, // Recursive
      /^-p$/, // Preserve
      /^-a$/, // Archive
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/,
    ],
  },
  mv: {
    command: 'mv',
    description: 'Move file',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/,
    ],
  },

  // Database commands
  mysql: {
    command: 'mysql',
    description: 'MySQL/MariaDB client',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^-u[a-z][a-z0-9_-]{0,31}$/,
      /^-u$/,
      /^-p.*$/,
      /^-e$/,
      /^-N$/, // Skip column names
      /^-B$/, // Batch mode
      /^--execute$/,
      /^[a-z][a-z0-9_-]{0,63}$/, // Database name
    ],
  },
  mysqldump: {
    command: 'mysqldump',
    description: 'MySQL/MariaDB dump',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^-u[a-z][a-z0-9_-]{0,31}$/,
      /^-u$/,
      /^-p.*$/,
      /^--single-transaction$/,
      /^--quick$/,
      /^--lock-tables$/,
      /^[a-z][a-z0-9_-]{0,63}$/, // Database name
    ],
  },

  // DNS commands (Bind9)
  rndc: {
    command: 'rndc',
    description: 'Bind9 control',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^reload$/,
      /^reconfig$/,
      /^flush$/,
      /^status$/,
      /^[a-z0-9][a-z0-9.-]{0,253}$/, // Zone name
    ],
  },
  'named-checkzone': {
    command: 'named-checkzone',
    description: 'Check DNS zone file',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^[a-z0-9][a-z0-9.-]{0,253}$/, // Zone name
      /^\/var\/named\/[a-z0-9][a-z0-9.-]{0,253}\.zone$/,
      /^\/etc\/bind\/zones\/[a-z0-9][a-z0-9.-]{0,253}\.zone$/,
    ],
  },
  sed: {
    command: 'sed',
    description: 'Stream editor',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-i$/,
      /^\/zone "[a-z0-9][a-z0-9.-]{0,253}"\/,\/\^};\$\/d$/,
      /^\/etc\/bind\/named\.conf\.local$/,
      /^\/etc\/named\.conf\.local$/,
    ],
  },
  'named-checkconf': {
    command: 'named-checkconf',
    description: 'Check Bind9 configuration',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^\/etc\/named\.conf$/,
      /^\/etc\/bind\/named\.conf$/,
    ],
  },

  // Mail commands
  postmap: {
    command: 'postmap',
    description: 'Postfix map utility',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^\/etc\/postfix\/[a-z][a-z0-9_-]{0,63}$/,
    ],
  },
  postfix: {
    command: 'postfix',
    description: 'Postfix control',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^reload$/,
      /^start$/,
      /^stop$/,
      /^check$/,
    ],
  },

  // SSL/Certbot commands
  certbot: {
    command: 'certbot',
    description: "Let's Encrypt certificate management",
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^certonly$/,
      /^renew$/,
      /^revoke$/,
      /^delete$/,
      /^--webroot$/,
      /^--standalone$/,
      /^--apache$/,
      /^--nginx$/,
      /^-w$/,
      /^--webroot-path$/,
      /^-d$/,
      /^--domain$/,
      /^--agree-tos$/,
      /^--non-interactive$/,
      /^-n$/,
      /^--email$/,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email
      /^[a-z0-9][a-z0-9.-]{0,253}$/, // Domain
      /^\/home\/[a-z][a-z0-9_-]{0,31}\/public_html$/, // Webroot
    ],
  },

  // CSF Firewall commands
  csf: {
    command: 'csf',
    description: 'ConfigServer Firewall',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-r$/, // Restart
      /^-q$/, // Quick restart
      /^-l$/, // List rules
      /^-s$/, // Start
      /^-f$/, // Stop
      /^-t$/, // Temp list
      /^-td$/, // Temp deny
      /^-ta$/, // Temp allow
      /^-dr$/, // Deny remove
      /^-tr$/, // Temp remove
      /^-a$/, // Allow
      /^-d$/, // Deny
      /^-ar$/, // Allow remove
      /^--version$/,
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IPv4 address
      /^\d+$/, // TTL in seconds
      /^[a-zA-Z0-9 _-]{0,100}$/, // Comment
    ],
  },

  // PM2 commands
  pm2: {
    command: 'pm2',
    description: 'PM2 process manager',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^start$/,
      /^stop$/,
      /^restart$/,
      /^reload$/,
      /^delete$/,
      /^list$/,
      /^jlist$/,
      /^show$/,
      /^logs$/,
      /^flush$/,
      /^save$/,
      /^startup$/,
      /^--name$/,
      /^--watch$/,
      /^--max-memory-restart$/,
      /^--env$/,
      /^--interpreter$/,
      /^--cwd$/,
      /^--lines$/,
      /^--nostream$/,
      /^--json$/,
      /^[a-z][a-z0-9_-]{0,63}$/, // Process name
      /^\d+$/, // Process ID
      /^[0-9]+[KMG]?$/, // Memory limit
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/, // Path
      /^node$/,
    ],
  },

  // Network commands
  ss: {
    command: 'ss',
    description: 'Socket statistics',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^-t$/, // TCP
      /^-l$/, // Listening
      /^-n$/, // No resolve
      /^-p$/, // Process
      /^-tlnp$/, // Combined
      /^sport = :\d+$/, // Source port filter
    ],
  },

  // Git commands
  git: {
    command: 'git',
    description: 'Git version control',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^clone$/,
      /^pull$/,
      /^fetch$/,
      /^checkout$/,
      /^reset$/,
      /^status$/,
      /^log$/,
      /^-b$/, // Branch
      /^-1$/,
      /^--single-branch$/,
      /^--hard$/,
      /^--soft$/,
      /^origin$/,
      /^HEAD~?\d*$/,
      /^[a-zA-Z0-9._/-]+$/, // Branch name, ref, or URL path
      /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]+\.git$/, // Git HTTPS URL
      /^git@[a-zA-Z0-9][a-zA-Z0-9.-]+:[a-zA-Z0-9._/-]+\.git$/, // Git SSH URL
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/, // Path
    ],
  },

  // Node.js package managers
  npm: {
    command: 'npm',
    description: 'NPM package manager',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^install$/,
      /^ci$/,
      /^run$/,
      /^build$/,
      /^start$/,
      /^test$/,
      /^--production$/,
      /^--legacy-peer-deps$/,
      /^--no-audit$/,
      /^--prefer-offline$/,
      /^[a-z][a-z0-9_-]*$/, // Script name
    ],
  },
  yarn: {
    command: 'yarn',
    description: 'Yarn package manager',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^install$/,
      /^build$/,
      /^start$/,
      /^test$/,
      /^--production$/,
      /^--frozen-lockfile$/,
      /^--prefer-offline$/,
      /^[a-z][a-z0-9_-]*$/, // Script name
    ],
  },
  pnpm: {
    command: 'pnpm',
    description: 'PNPM package manager',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^install$/,
      /^build$/,
      /^start$/,
      /^test$/,
      /^--prod$/,
      /^--frozen-lockfile$/,
      /^[a-z][a-z0-9_-]*$/, // Script name
    ],
  },

  // Composer (PHP)
  composer: {
    command: 'composer',
    description: 'PHP Composer',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^install$/,
      /^update$/,
      /^dump-autoload$/,
      /^--no-dev$/,
      /^--optimize-autoloader$/,
      /^--no-interaction$/,
      /^--prefer-dist$/,
    ],
  },

  // Bash (for complex commands)
  bash: {
    command: 'bash',
    description: 'Bash shell',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^-c$/,
      /^cd \/home\/[a-z][a-z0-9_-]{0,31}\/[a-zA-Z0-9._/-]+ && (npm|yarn|pnpm|composer|git) .+$/, // Directory change + command
    ],
  },

  // cURL for OPCache clear
  curl: {
    command: 'curl',
    description: 'HTTP client',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^-s$/, // Silent
      /^-X$/,
      /^GET$/,
      /^POST$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?\/[a-zA-Z0-9._/-]*$/, // Localhost only
      /^http:\/\/localhost(:\d+)?\/[a-zA-Z0-9._/-]*$/,
    ],
  },

  // Symbolic links
  ln: {
    command: 'ln',
    description: 'Create links',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-s$/, // Symbolic
      /^-sf$/, // Symbolic force
      /^-f$/, // Force
      /^\/etc\/(apache2|httpd)\/sites-(available|enabled)\/[a-z0-9][a-z0-9.-]{0,253}\.conf$/,
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/,
    ],
  },

  // Node.js
  node: {
    command: 'node',
    description: 'Node.js runtime',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^--version$/,
      /^-v$/,
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*\.js$/,
    ],
  },

  // Quota commands
  setquota: {
    command: 'setquota',
    description: 'Set disk quota',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-u$/, // User quota
      /^[a-z][a-z0-9_-]{0,31}$/, // Username
      /^\d+$/, // Block/inode limits
      /^\/home$/,
      /^\/$/,
    ],
  },
  repquota: {
    command: 'repquota',
    description: 'Report disk quota',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-a$/, // All filesystems
      /^-u$/, // User quota
      /^-s$/, // Human readable
      /^\/home$/,
      /^\/$/,
    ],
  },

  // User check commands
  id: {
    command: 'id',
    description: 'Check if user exists',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^[a-z][a-z0-9_-]{0,31}$/, // Username
    ],
  },
  getent: {
    command: 'getent',
    description: 'Get entries from databases',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^passwd$/,
      /^group$/,
      /^shadow$/,
      /^[a-z][a-z0-9_-]{0,31}$/, // Username or group name
    ],
  },

  // File operations
  du: {
    command: 'du',
    description: 'Disk usage',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^-s$/, // Summary
      /^-m$/, // Megabytes
      /^-sm$/, // Combined
      /^-h$/, // Human readable
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/,
    ],
  },
  find: {
    command: 'find',
    description: 'Find files',
    requiresSudo: false,
    allowedArgumentPatterns: [
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)*$/,
      /^-type$/,
      /^[fdl]$/, // file, directory, link
      /^-name$/,
      /^[a-zA-Z0-9*?._-]+$/, // File name pattern
    ],
  },
  tee: {
    command: 'tee',
    description: 'Write to file',
    requiresSudo: true,
    allowedArgumentPatterns: [
      /^-a$/, // Append
      /^\/home\/[a-z][a-z0-9_-]{0,31}(\/[a-zA-Z0-9._-]+)+$/,
      /^\/etc\/(apache2|httpd)\/sites-available\/[a-z0-9][a-z0-9.-]{0,253}\.conf$/,
      /^\/etc\/php\/[0-9.]+\/fpm\/pool\.d\/[a-z][a-z0-9_-]{0,31}\.conf$/,
      /^\/etc\/php-fpm\.d\/[a-z][a-z0-9_-]{0,31}\.conf$/,
      /^\/etc\/bind\/zones\/[a-z0-9][a-z0-9.-]{0,253}\.zone$/,
      /^\/var\/named\/[a-z0-9][a-z0-9.-]{0,253}\.zone$/,
    ],
  },
};

export function isCommandAllowed(command: string): boolean {
  return command in COMMAND_WHITELIST;
}

export function getCommandDefinition(command: string): CommandDefinition | undefined {
  return COMMAND_WHITELIST[command];
}

export function validateArgument(command: string, argument: string): boolean {
  const definition = COMMAND_WHITELIST[command];
  if (!definition) {
    return false;
  }

  // If no patterns defined, argument is allowed by default
  if (!definition.allowedArgumentPatterns || definition.allowedArgumentPatterns.length === 0) {
    return true;
  }

  // Check if argument matches any allowed pattern
  return definition.allowedArgumentPatterns.some((pattern) => pattern.test(argument));
}
