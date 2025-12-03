# ServerHubX Implementation Plan

## Overview

**Project:** ServerHubX - Full-featured hosting control panel replacing Virtualmin/Webmin
**Tech Stack:** NestJS + React (Vite) + MariaDB
**Scope:** Full v1.0 including email server and multi-channel notifications
**Target OS:** Ubuntu, Debian, Rocky/AlmaLinux, CentOS Stream

---

## Pre-Installation Requirements

### Domain & DNS Configuration

Before installing ServerHubX, users must configure their domain(s) with wildcard DNS records pointing to the server. This allows ServerHubX to manage all subdomains and virtual hosts automatically.

#### Required DNS Records

For each domain you want to manage with ServerHubX, create these DNS records at your domain registrar or DNS provider:

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| A | @ | `<SERVER_IP>` | 3600 |
| A | * | `<SERVER_IP>` | 3600 |
| AAAA | @ | `<SERVER_IPV6>` | 3600 (if IPv6 available) |
| AAAA | * | `<SERVER_IPV6>` | 3600 (if IPv6 available) |

#### Example DNS Setup

For domain `example.com` with server IP `203.0.113.50`:

```
example.com.        IN  A     203.0.113.50
*.example.com.      IN  A     203.0.113.50
```

This wildcard configuration enables:
- `example.com` → Main domain
- `www.example.com` → Automatically works
- `app.example.com` → Any subdomain works
- `api.example.com` → Any subdomain works
- `mail.example.com` → Email server subdomain
- `panel.example.com` → Can be used for ServerHubX dashboard

#### Optional: Dedicated Nameservers

For full DNS management through ServerHubX (Bind9), configure glue records:

1. At your registrar, create glue records:
   - `ns1.example.com` → `<SERVER_IP>`
   - `ns2.example.com` → `<SECONDARY_SERVER_IP>` (or same IP)

2. Set nameservers for your domain:
   - `ns1.example.com`
   - `ns2.example.com`

3. ServerHubX will then manage all DNS records through its Bind9 integration.

#### Verification

After DNS propagation (up to 48 hours), verify with:
```bash
# Check main domain
dig +short example.com

# Check wildcard
dig +short test.example.com
dig +short anything.example.com
```

Both should return your server's IP address.

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Backend Project Setup

- [ ] **Initialize NestJS project**
  > Set up the foundational NestJS application with TypeScript. NestJS provides a modular architecture ideal for building scalable server applications with dependency injection, decorators, and a clear separation of concerns.
  - [ ] Create new NestJS project with TypeScript (`nest new backend`) - generates the basic project structure with main.ts, app.module.ts, and configuration files
  - [ ] Configure TypeScript strict mode in `tsconfig.json` - enables strict null checks, implicit any errors, and other type safety features to catch bugs at compile time
  - [ ] Set up path aliases (`@modules`, `@common`, `@core`) - allows cleaner imports like `import { X } from '@modules/auth'` instead of relative paths
  - [ ] Install core dependencies (class-validator, class-transformer) - class-validator provides DTO validation decorators, class-transformer handles object transformation

- [ ] **Configure Database (MariaDB)**
  > MariaDB is the database engine for storing all application data including users, domains, apps, certificates, and audit logs. TypeORM provides an ORM layer with migrations support.
  - [ ] Install TypeORM and mysql2 packages - TypeORM is the ORM, mysql2 is the MySQL/MariaDB driver
  - [ ] Create `database.config.ts` with connection settings - externalizes database configuration (host, port, username, password, database name) from environment variables
  - [ ] Set up TypeORM module in `app.module.ts` - registers TypeORM globally with async configuration loading from ConfigService
  - [ ] Create base entity with id, createdAt, updatedAt, deletedAt - abstract base class that all entities extend, provides UUID primary key and automatic timestamps
  - [ ] Configure migrations directory structure - sets up `database/migrations/` for version-controlled schema changes, enables `npm run migration:run` and `migration:generate` commands

- [ ] **Configure Redis**
  > Redis serves dual purposes: caching frequently accessed data (sessions, metrics) and powering BullMQ job queues for background tasks like deployments and backups.
  - [ ] Install ioredis package - high-performance Redis client for Node.js with cluster support
  - [ ] Create `redis.config.ts` with connection settings - configures Redis host, port, password, and connection pool settings
  - [ ] Set up Redis module for caching - creates a global cache manager for storing session data, API response caches, and temporary metrics
  - [ ] Set up BullMQ module for job queues - configures job queues for async tasks: deployment queue, backup queue, ssl-renewal queue, notification queue

- [ ] **Configure Environment Variables**
  > Centralized configuration management using environment variables. All sensitive data (passwords, API keys) and environment-specific settings are externalized.
  - [ ] Install @nestjs/config - NestJS module that wraps dotenv with additional features like validation and typed access
  - [ ] Create `.env.example` with all required variables - template file listing all configuration options: DATABASE_*, REDIS_*, JWT_*, SMTP_*, TWILIO_*, etc.
  - [ ] Create Joi validation schema for env vars - validates environment variables on startup, fails fast with clear error messages if required vars are missing
  - [ ] Set up ConfigModule as global - makes ConfigService available in all modules without explicit imports

- [ ] **Set Up Logging**
  > Comprehensive logging system for debugging, auditing, and monitoring. Uses Winston for flexible log formatting and multiple transports (console, file, remote).
  - [ ] Install Winston logger - flexible logging library supporting multiple formats and outputs
  - [ ] Create custom NestJS logger service - wraps Winston in a NestJS LoggerService for framework integration
  - [ ] Configure log levels (debug, info, warn, error) - debug for development, info for general operations, warn for recoverable issues, error for failures
  - [ ] Set up log file rotation - uses winston-daily-rotate-file to create daily log files, auto-delete old logs after 30 days, max 100MB per file
  - [ ] Create request logging middleware - logs all HTTP requests with method, URL, status code, response time, and user ID for debugging and security auditing

### 1.2 Core System Layer

- [ ] **Command Executor Service**
  > The most critical security component. ALL system commands MUST go through this service. Uses Node.js spawn() with explicit argument arrays (never shell strings) to prevent command injection attacks.
  - [ ] Create `src/core/executor/command-executor.service.ts` - central service for executing all Linux commands safely
  - [ ] Implement spawn() wrapper with timeout handling - uses child_process.spawn() with configurable timeout (default 30s), kills process on timeout
  - [ ] Implement stdout/stderr capture - buffers output for logging and returns to caller, handles large outputs with streaming
  - [ ] Add sudo execution support - prepends 'sudo' for privileged commands, validates command is in whitelist before elevating
  - [ ] Add runAs user support - uses 'sudo -u <username>' to run commands as specific Linux user (for file operations in user home directories)
  - [ ] Create unit tests for executor - tests command building, timeout handling, error capture, and security checks

- [ ] **Command Whitelist Registry**
  > Security-critical whitelist of allowed system commands. Any command not in this list is rejected. Each command has defined argument patterns for additional validation.
  - [ ] Create `src/core/executor/command-whitelist.ts` - registry of all allowed commands with argument patterns
  - [ ] Define user management commands (useradd, userdel, usermod, passwd) - for creating/managing Linux users per domain
  - [ ] Define Apache commands (a2ensite, a2dissite, apachectl) - for enabling/disabling virtual hosts and reloading Apache
  - [ ] Define PHP-FPM commands (systemctl for php-fpm) - for managing PHP-FPM service and pools
  - [ ] Define database commands (mysql, mysqldump) - for database creation, user management, and backups
  - [ ] Define DNS commands (rndc, named-checkzone) - for Bind9 zone management and validation
  - [ ] Define mail commands (postmap, postfix) - for Postfix virtual mailbox configuration
  - [ ] Define certbot commands - for Let's Encrypt certificate requests and renewals
  - [ ] Define CSF firewall commands (csf, lfd) - csf -r (restart), csf -q (quick restart), csf -l (list), csf -td (temp deny), csf -ta (temp allow), csf -dr (deny remove), csf -t (temp list)
  - [ ] Define file operation commands (chown, chmod, mkdir, rm) - for file permission and directory management within allowed paths only

- [ ] **Input Validator Service**
  > Validates and sanitizes all user input before it reaches system commands. Prevents injection attacks, path traversal, and invalid data from corrupting the system.
  - [ ] Create `src/core/validators/input-validator.service.ts` - centralized validation for all user inputs
  - [ ] Implement username validation (Linux username rules) - lowercase letters, numbers, underscore, dash; 3-32 chars; must start with letter; no reserved names (root, admin, etc.)
  - [ ] Implement domain name validation (RFC 1035) - valid hostname format, proper TLD, no special characters except dash; supports IDN via punycode
  - [ ] Implement path validation (prevent traversal) - rejects paths containing '..', absolute paths outside allowed directories, symlink attacks
  - [ ] Implement port validation - validates port is integer 1-65535, checks against reserved ports list, validates port is available
  - [ ] Implement email validation - RFC 5322 compliant email format validation
  - [ ] Create sanitize() method for all types - escapes special characters, trims whitespace, normalizes input for safe command usage

- [ ] **Distribution Detector Service**
  > Automatically detects the Linux distribution to use correct paths, package managers, and service names. Supports Ubuntu, Debian, Rocky Linux, AlmaLinux, and CentOS Stream.
  - [ ] Create `src/core/distro/distro-detector.service.ts` - detects OS family and version at startup
  - [ ] Implement /etc/os-release parsing - reads standard Linux distribution identification file for ID, VERSION_ID, NAME fields
  - [ ] Detect Debian/Ubuntu family - identifies apt-based systems, maps to Debian path conventions
  - [ ] Detect RHEL/Rocky/AlmaLinux family - identifies dnf-based systems, maps to RHEL path conventions
  - [ ] Determine package manager (apt/dnf) - sets correct package install/remove commands for the detected OS
  - [ ] Create fallback detection methods - uses /etc/debian_version, /etc/redhat-release as backups if os-release is missing

- [ ] **Path Resolver Service**
  > Maps service paths to the correct locations based on detected distribution. Apache is at /etc/apache2 on Debian but /etc/httpd on RHEL.
  - [ ] Create `src/core/distro/path-resolver.service.ts` - provides correct file paths for each service per distribution
  - [ ] Define Debian paths (Apache, PHP-FPM, Bind9, Postfix) - /etc/apache2, /etc/php, /etc/bind, /etc/postfix with Debian conventions
  - [ ] Define RHEL paths (httpd, php-fpm, named, postfix) - /etc/httpd, /etc/php-fpm.d, /var/named, /etc/postfix with RHEL conventions
  - [ ] Create getter methods for each service path set - apacheConfigPath(), apacheSitesAvailable(), phpFpmPoolPath(), bindZonePath(), etc.

- [ ] **Transaction Manager Service**
  > Provides rollback capability for multi-step operations. If domain creation fails at step 5 of 7, all previous steps (user creation, directory creation, etc.) are automatically reverted.
  - [ ] Create `src/core/rollback/transaction-manager.service.ts` - manages atomic multi-step operations with rollback support
  - [ ] Implement startTransaction() method - begins a new transaction context, generates unique transaction ID for logging
  - [ ] Implement addRollbackAction() method - registers a cleanup function to execute if transaction fails (e.g., delete user if vhost creation fails)
  - [ ] Implement snapshotFile() method - creates backup copy of config files before modification, stores in /tmp with transaction ID
  - [ ] Implement commit() method - marks transaction complete, clears rollback actions, deletes file snapshots
  - [ ] Implement rollback() method with error handling - executes all rollback actions in reverse order, restores file snapshots, logs all recovery actions
  - [ ] Create unit tests for transaction manager - tests nested transactions, partial failures, file restoration, and concurrent transactions

- [ ] **Audit Logger Service**
  > Records all significant operations for security auditing and troubleshooting. Every domain creation, user deletion, or configuration change is logged with user context and timestamps.
  - [ ] Create `src/core/audit/audit-logger.service.ts` - centralized audit logging for security and compliance
  - [ ] Create AuditLog entity - stores operation type, user, IP address, target resource, old/new values, timestamp, success/failure status
  - [ ] Implement logOperationStart() method - records operation initiation with parameters, useful for tracking long-running operations
  - [ ] Implement logOperationComplete() method - records operation completion with result, duration, and any warnings
  - [ ] Implement logSecurityEvent() method - special logging for security events: failed logins, permission denials, suspicious activities
  - [ ] Add database indexes for efficient querying - indexes on userId, operationType, createdAt, resourceType for fast filtering and reporting

### 1.3 Authentication Module

- [ ] **User Entity**
  > Dashboard users (admins, resellers, domain owners) - NOT Linux system users. These are the accounts that log into the ServerHubX web interface.
  - [ ] Create `src/modules/users/entities/user.entity.ts` - TypeORM entity for dashboard user accounts
  - [ ] Define fields: email, password, firstName, lastName, role, isActive - core user identification and access control fields
  - [ ] Add two-factor authentication fields - totpSecret (encrypted), totpEnabled, backupCodes array for 2FA support
  - [ ] Add lastLoginAt field - tracks last successful login for security auditing and session management
  - [ ] Add parentReseller relationship - for reseller model, links domain owners to their reseller account
  - [ ] Create database migration - generates the users table with proper indexes on email (unique) and role

- [ ] **JWT Authentication**
  > Stateless token-based authentication using short-lived access tokens and longer-lived refresh tokens. Access tokens are used for API requests, refresh tokens to obtain new access tokens.
  - [ ] Install @nestjs/jwt and @nestjs/passport - JWT handling and Passport.js strategy integration for NestJS
  - [ ] Create `jwt.config.ts` with secret and expiry settings - loads JWT_SECRET from env, sets access token TTL (15m), refresh token TTL (7d)
  - [ ] Create JwtStrategy for token validation - Passport strategy that extracts and validates JWT from Authorization header
  - [ ] Create LocalStrategy for email/password login - Passport strategy for initial authentication before issuing tokens
  - [ ] Implement access token generation (15 min expiry) - short-lived token containing userId, email, role; used for all authenticated API requests
  - [ ] Implement refresh token generation (7 day expiry) - longer-lived token stored in httpOnly cookie, used only to obtain new access tokens

- [ ] **Auth Service**
  > Core authentication logic including password verification, token generation/validation, and session management.
  - [ ] Create `src/modules/auth/auth.service.ts` - handles all authentication operations
  - [ ] Implement login() with password verification - validates credentials, checks account status, logs login attempt, returns tokens
  - [ ] Implement logout() with token invalidation - adds refresh token to Redis blacklist until expiry, clears client cookies
  - [ ] Implement refreshToken() method - validates refresh token, checks blacklist, issues new access token if valid
  - [ ] Implement validateUser() method - used by LocalStrategy to verify email/password combination
  - [ ] Add argon2 password hashing - uses argon2id algorithm (winner of Password Hashing Competition), memory-hard to resist GPU attacks

- [ ] **Auth Controller**
  > REST endpoints for authentication operations. All auth endpoints have rate limiting to prevent brute force attacks.
  - [ ] Create `src/modules/auth/auth.controller.ts` - authentication REST endpoints
  - [ ] POST /auth/login endpoint - accepts email/password, returns access token in body and refresh token in httpOnly cookie
  - [ ] POST /auth/logout endpoint - invalidates refresh token, clears cookies, logs logout event
  - [ ] POST /auth/refresh endpoint - exchanges valid refresh token for new access token
  - [ ] POST /auth/forgot-password endpoint - generates password reset token, sends email with reset link (valid 1 hour)
  - [ ] POST /auth/reset-password endpoint - validates reset token, updates password, invalidates all existing sessions

- [ ] **Auth Guards**
  > NestJS guards that protect routes by validating authentication tokens and enforcing access control.
  - [ ] Create JwtAuthGuard - protects routes requiring authentication, extracts user from valid JWT, attaches to request
  - [ ] Create LocalAuthGuard - used only on login endpoint to validate email/password credentials
  - [ ] Create RefreshTokenGuard - validates refresh token from httpOnly cookie for token refresh endpoint

### 1.4 Authorization System

- [ ] **CASL Integration**
  > CASL (Isomorphic Authorization) provides attribute-based access control. Defines what actions each role can perform on which resources, with support for field-level permissions.
  - [ ] Install @casl/ability - isomorphic authorization library that works on both backend and can be shared with frontend
  - [ ] Create `src/authorization/casl-ability.factory.ts` - factory that builds ability rules based on user role and ownership
  - [ ] Define actions: manage, create, read, update, delete - standard CRUD actions plus 'manage' which grants all actions
  - [ ] Define subjects: Domain, App, Database, User, etc. - entity classes that can be protected by authorization rules

- [ ] **Role Definitions**
  > Four-tier role hierarchy from full system access down to limited developer access. Each role inherits nothing from others - permissions are explicitly defined.
  - [ ] Define ROOT_ADMIN permissions (full access) - can manage all resources, access system settings, view all domains, manage all users
  - [ ] Define RESELLER permissions (manage own clients) - can create domain owners under their account, manage those users' domains, set resource limits
  - [ ] Define DOMAIN_OWNER permissions (manage own resources) - can manage their own domains, apps, databases, email; cannot access other users' resources
  - [ ] Define DEVELOPER permissions (limited access) - read-only access to assigned domains, can use terminal and file manager, cannot modify domain settings

- [ ] **Policy Guards**
  > Guards that enforce CASL policies on controller routes. Applied via decorators, they check if the current user has permission for the requested action on the target resource.
  - [ ] Create `src/authorization/guards/policies.guard.ts` - NestJS guard that evaluates CASL abilities against requested action/resource
  - [ ] Create @CheckPolicies() decorator - route decorator that specifies required ability, e.g., @CheckPolicies((ability) => ability.can('update', Domain))
  - [ ] Implement policy handler execution - resolves the target resource (e.g., fetches domain by ID), checks user's ability against it
  - [ ] Add to global guards - registers PoliciesGuard globally but only activates on routes with @CheckPolicies() decorator

### 1.5 Frontend Setup

- [ ] **Initialize React Project**
  - [ ] Create Vite project with React + TypeScript
  - [ ] Configure TypeScript strict mode
  - [ ] Set up path aliases in vite.config.ts
  - [ ] Install ESLint and Prettier
  - [ ] Configure Husky for pre-commit hooks

- [ ] **Configure Tailwind CSS**
  - [ ] Install Tailwind CSS and PostCSS
  - [ ] Create tailwind.config.ts with custom theme
  - [ ] Define CSS variables for light/dark themes
  - [ ] Create globals.css with base styles
  - [ ] Set up @tailwindcss/forms and @tailwindcss/typography

- [ ] **Create Folder Structure**
  - [ ] Create src/components/ui/ directory
  - [ ] Create src/components/common/ directory
  - [ ] Create src/features/ directory
  - [ ] Create src/hooks/ directory
  - [ ] Create src/lib/ directory
  - [ ] Create src/store/ directory
  - [ ] Create src/services/ directory
  - [ ] Create src/types/ directory
  - [ ] Create src/layouts/ directory
  - [ ] Create src/pages/ directory

- [ ] **Core UI Components**
  - [ ] Create Button component with variants (primary, secondary, danger, ghost)
  - [ ] Create Input component with validation states
  - [ ] Create Select component with search
  - [ ] Create Checkbox component
  - [ ] Create Switch component
  - [ ] Create Modal component with portal
  - [ ] Create Toast/Notification component
  - [ ] Create Spinner component
  - [ ] Create Skeleton component
  - [ ] Create Badge component

- [ ] **State Management (Zustand)**
  - [ ] Install zustand
  - [ ] Create auth slice (user, token, login, logout)
  - [ ] Create theme slice (mode, setTheme)
  - [ ] Create sidebar slice (collapsed, activeItem)
  - [ ] Create notification slice (items, add, remove)
  - [ ] Configure persist middleware for auth

- [ ] **React Query Setup**
  - [ ] Install @tanstack/react-query
  - [ ] Create QueryClient with default options
  - [ ] Create QueryProvider component
  - [ ] Configure stale time and cache time

- [ ] **API Client**
  - [ ] Create `src/lib/api/client.ts` with Axios
  - [ ] Add request interceptor for auth token
  - [ ] Add response interceptor for 401 handling
  - [ ] Add token refresh logic
  - [ ] Create typed API error handling

- [ ] **Authentication Flow**
  - [ ] Create AuthProvider component
  - [ ] Create useAuth hook
  - [ ] Create ProtectedRoute component
  - [ ] Create RoleGuard component
  - [ ] Create LoginPage
  - [ ] Create login form with validation

- [ ] **Layout Components**
  - [ ] Create MainLayout with sidebar and header
  - [ ] Create Sidebar component with navigation
  - [ ] Create Header component with user menu
  - [ ] Create AuthLayout for login pages
  - [ ] Set up React Router with layouts

---

## Phase 2: Users & Domains (Week 3-4)

### 2.1 System Users Module (Linux Users)

- [ ] **System User Entity**
  - [ ] Create `src/modules/system-users/entities/system-user.entity.ts`
  - [ ] Define fields: username, uid, gid, homeDirectory, shell
  - [ ] Add diskQuota and diskUsed fields
  - [ ] Add sshEnabled field
  - [ ] Create one-to-one relationship with Domain
  - [ ] Create database migration

- [ ] **System Users Service**
  - [ ] Create `src/modules/system-users/system-users.service.ts`
  - [ ] Implement createUser() with useradd command
  - [ ] Implement deleteUser() with userdel command
  - [ ] Implement setPassword() with chpasswd
  - [ ] Implement setQuota() with setquota command
  - [ ] Implement getQuotaUsage() method
  - [ ] Add rollback support for user creation

- [ ] **SSH Key Management**
  - [ ] Create SSHKey entity
  - [ ] Implement addSSHKey() method
  - [ ] Implement removeSSHKey() method
  - [ ] Implement listSSHKeys() method
  - [ ] Write to ~/.ssh/authorized_keys

- [ ] **Home Directory Setup**
  - [ ] Create directory structure (/home/username/public_html, logs, tmp, ssl)
  - [ ] Set proper ownership (chown)
  - [ ] Set proper permissions (chmod)
  - [ ] Create default index.html

- [ ] **System Users Controller**
  - [ ] Create `src/modules/system-users/system-users.controller.ts`
  - [ ] GET /system-users endpoint (admin only)
  - [ ] POST /system-users endpoint
  - [ ] GET /system-users/:id endpoint
  - [ ] DELETE /system-users/:id endpoint
  - [ ] POST /system-users/:id/ssh-keys endpoint
  - [ ] DELETE /system-users/:id/ssh-keys/:keyId endpoint

### 2.2 Domains Module

- [ ] **Domain Entity**
  - [ ] Create `src/modules/domains/entities/domain.entity.ts`
  - [ ] Define fields: name, status, documentRoot, webServer
  - [ ] Add phpVersion and nodeVersion fields
  - [ ] Add sslEnabled and forceHttps fields
  - [ ] Add owner relationship to User
  - [ ] Add systemUser relationship
  - [ ] Create database migration

- [ ] **Subdomain Entity**
  - [ ] Create subdomain.entity.ts
  - [ ] Define fields: name, documentRoot
  - [ ] Add parentDomain relationship
  - [ ] Create database migration

- [ ] **VHost Service**
  - [ ] Create `src/modules/domains/vhost.service.ts`
  - [ ] Create Apache VirtualHost template for PHP sites
  - [ ] Create Apache VirtualHost template for Node.js (reverse proxy)
  - [ ] Create SSL VirtualHost template
  - [ ] Implement generateVhostConfig() method
  - [ ] Implement writeVhostFile() method
  - [ ] Implement enableSite() method (a2ensite)
  - [ ] Implement disableSite() method (a2dissite)
  - [ ] Implement validateConfig() method (apachectl configtest)
  - [ ] Implement reloadApache() method

- [ ] **Domains Service**
  - [ ] Create `src/modules/domains/domains.service.ts`
  - [ ] Implement create() with full workflow:
    - [ ] Validate domain name
    - [ ] Create system user
    - [ ] Create directory structure
    - [ ] Generate VHost config
    - [ ] Enable site
    - [ ] Reload Apache
    - [ ] Add rollback on failure
  - [ ] Implement update() method
  - [ ] Implement delete() with cleanup
  - [ ] Implement suspend() method
  - [ ] Implement unsuspend() method
  - [ ] Implement findAll() with filtering
  - [ ] Implement findOne() method

- [ ] **Domains Controller**
  - [ ] Create `src/modules/domains/domains.controller.ts`
  - [ ] GET /domains endpoint with pagination
  - [ ] POST /domains endpoint
  - [ ] GET /domains/:id endpoint
  - [ ] PATCH /domains/:id endpoint
  - [ ] DELETE /domains/:id endpoint
  - [ ] POST /domains/:id/suspend endpoint
  - [ ] POST /domains/:id/unsuspend endpoint
  - [ ] GET /domains/:id/stats endpoint

### 2.3 Frontend - Dashboard & Domains

- [ ] **Dashboard Page**
  - [ ] Create DashboardPage component
  - [ ] Create ServerOverview component (OS info, uptime)
  - [ ] Create ResourceUsageCard (CPU, RAM, Disk gauges)
  - [ ] Create ServiceStatusGrid component
  - [ ] Create QuickActions component
  - [ ] Create RecentActivity component
  - [ ] Create DomainsList widget (top 5 domains)
  - [ ] Implement useDashboardData hook

- [ ] **Domain Management Pages**
  - [ ] Create DomainsPage with DataTable
  - [ ] Implement domain search and filtering
  - [ ] Create DomainCard component
  - [ ] Create DomainCreateModal with form
  - [ ] Create DomainEditModal
  - [ ] Create DomainDetailPage
  - [ ] Implement useDomains hook with React Query
  - [ ] Implement useCreateDomain mutation
  - [ ] Implement useUpdateDomain mutation
  - [ ] Implement useDeleteDomain mutation

- [ ] **User Management Pages**
  - [ ] Create UsersPage with DataTable
  - [ ] Create UserCreateModal
  - [ ] Create UserEditModal
  - [ ] Create UserDetailPage
  - [ ] Create QuotaManager component
  - [ ] Create SSHKeyManager component
  - [ ] Implement useUsers hook

---

## Phase 3: Applications (Week 5-6)

### 3.1 Node.js Application Support

- [ ] **App Entity**
  - [ ] Create `src/modules/apps/entities/app.entity.ts`
  - [ ] Define fields: name, type, framework, path, entryPoint, port, status
  - [ ] Add pm2ProcessId field
  - [ ] Add pm2Config JSON field
  - [ ] Add domain relationship
  - [ ] Create database migration

- [ ] **App Environment Entity**
  - [ ] Create app-environment.entity.ts
  - [ ] Define fields: key, value, isSecret
  - [ ] Add app relationship
  - [ ] Implement value encryption for secrets

- [ ] **PM2 Service**
  - [ ] Create `src/modules/apps/pm2.service.ts`
  - [ ] Implement generateEcosystemConfig() method
  - [ ] Implement startApp() method
  - [ ] Implement stopApp() method
  - [ ] Implement restartApp() method
  - [ ] Implement reloadApp() method (zero-downtime)
  - [ ] Implement deleteApp() method
  - [ ] Implement getAppStatus() method
  - [ ] Implement getAppLogs() method
  - [ ] Implement listAllApps() method

- [ ] **Port Allocation Service**
  - [ ] Create `src/modules/apps/port-allocation.service.ts`
  - [ ] Define port range (3000-9999)
  - [ ] Implement allocatePort() method
  - [ ] Implement releasePort() method
  - [ ] Check port availability before allocation

- [ ] **Node App Service**
  - [ ] Create `src/modules/apps/node-app.service.ts`
  - [ ] Implement deploy() method:
    - [ ] Allocate port
    - [ ] Generate PM2 ecosystem file
    - [ ] Create Apache reverse proxy config
    - [ ] Start PM2 process
    - [ ] Enable Apache site
  - [ ] Implement update() method
  - [ ] Implement remove() method

- [ ] **Apache Reverse Proxy**
  - [ ] Create reverse proxy template with WebSocket support
  - [ ] Add proxy timeout configuration
  - [ ] Add static file alias option

### 3.2 PHP Application Support

- [ ] **PHP-FPM Service**
  - [ ] Create `src/modules/apps/php-fpm.service.ts`
  - [ ] Create PHP-FPM pool template
  - [ ] Implement createPool() method
  - [ ] Implement deletePool() method
  - [ ] Implement updatePool() method
  - [ ] Implement reloadPhpFpm() method
  - [ ] Configure pool settings (max_children, memory_limit, etc.)
  - [ ] Set open_basedir restrictions
  - [ ] Set disable_functions for security

- [ ] **PHP App Service**
  - [ ] Create `src/modules/apps/php-app.service.ts`
  - [ ] Implement deploy() method:
    - [ ] Create PHP-FPM pool
    - [ ] Generate Apache VHost with PHP handler
    - [ ] Enable site
  - [ ] Implement setPhpVersion() method
  - [ ] Implement getAvailablePhpVersions() method

- [ ] **Composer Support**
  - [ ] Implement runComposerInstall() method
  - [ ] Run as domain user
  - [ ] Handle composer.json detection

### 3.3 Application Deployment

- [ ] **Apps Controller**
  - [ ] Create `src/modules/apps/apps.controller.ts`
  - [ ] GET /domains/:domainId/apps endpoint
  - [ ] POST /domains/:domainId/apps endpoint
  - [ ] GET /apps/:id endpoint
  - [ ] PATCH /apps/:id endpoint
  - [ ] DELETE /apps/:id endpoint
  - [ ] POST /apps/:id/start endpoint
  - [ ] POST /apps/:id/stop endpoint
  - [ ] POST /apps/:id/restart endpoint
  - [ ] GET /apps/:id/logs endpoint
  - [ ] GET /apps/:id/env endpoint
  - [ ] PUT /apps/:id/env endpoint

- [ ] **Deployment Queue (BullMQ)**
  - [ ] Create deployment queue
  - [ ] Create DeploymentProcessor
  - [ ] Implement git clone/pull step
  - [ ] Implement npm/yarn/pnpm install step
  - [ ] Implement build step
  - [ ] Implement process restart step
  - [ ] Add progress reporting
  - [ ] Handle deployment failures

### 3.4 Frontend - Applications

- [ ] **Applications Page**
  - [ ] Create ApplicationsPage with app cards
  - [ ] Create AppCard component with status indicator
  - [ ] Create NodeAppForm component
  - [ ] Create PHPAppForm component
  - [ ] Implement useApplications hook

- [ ] **Application Detail Page**
  - [ ] Create ApplicationDetailPage
  - [ ] Create PM2ProcessInfo component
  - [ ] Create AppLogs component with live tail
  - [ ] Create EnvEditor component
  - [ ] Create DeploymentHistory component
  - [ ] Implement app control buttons (start, stop, restart)

---

## Phase 4: Databases & DNS (Week 7-8)

### 4.1 Database Management

- [ ] **Database Entity**
  - [ ] Create `src/modules/databases/entities/database.entity.ts`
  - [ ] Define fields: name, type, sizeBytes, charset, collation
  - [ ] Add owner relationship
  - [ ] Add domain relationship (optional)
  - [ ] Create database migration

- [ ] **Database User Entity**
  - [ ] Create database-user.entity.ts
  - [ ] Define fields: username, passwordHash, privileges, host
  - [ ] Add database relationship
  - [ ] Create database migration

- [ ] **MariaDB Service**
  - [ ] Create `src/modules/databases/mariadb.service.ts`
  - [ ] Implement createDatabase() method
  - [ ] Implement dropDatabase() method
  - [ ] Implement getDatabaseSize() method
  - [ ] Implement createUser() method
  - [ ] Implement dropUser() method
  - [ ] Implement grantPrivileges() method
  - [ ] Implement revokePrivileges() method
  - [ ] Implement resetPassword() method

- [ ] **Databases Service**
  - [ ] Create `src/modules/databases/databases.service.ts`
  - [ ] Implement create() with user creation
  - [ ] Implement delete() with cleanup
  - [ ] Implement backup() using mysqldump
  - [ ] Implement restore() method
  - [ ] Implement import() method
  - [ ] Implement export() method

- [ ] **Databases Controller**
  - [ ] Create `src/modules/databases/databases.controller.ts`
  - [ ] GET /databases endpoint
  - [ ] POST /databases endpoint
  - [ ] GET /databases/:id endpoint
  - [ ] DELETE /databases/:id endpoint
  - [ ] GET /databases/:id/users endpoint
  - [ ] POST /databases/:id/users endpoint
  - [ ] DELETE /databases/:id/users/:userId endpoint
  - [ ] POST /databases/:id/backup endpoint
  - [ ] POST /databases/:id/restore endpoint

### 4.2 DNS Management

- [ ] **DNS Zone Entity**
  - [ ] Create `src/modules/dns/entities/dns-zone.entity.ts`
  - [ ] Define fields: zoneName, serial, ttl, primaryNs, adminEmail
  - [ ] Add SOA fields (refresh, retry, expire, minimum)
  - [ ] Add domain relationship
  - [ ] Create database migration

- [ ] **DNS Record Entity**
  - [ ] Create dns-record.entity.ts
  - [ ] Define fields: name, type, value, ttl, priority
  - [ ] Support record types: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA
  - [ ] Add zone relationship
  - [ ] Create database migration

- [ ] **Bind9 Service**
  - [ ] Create `src/modules/dns/bind9.service.ts`
  - [ ] Create zone file template
  - [ ] Implement generateZoneFile() method
  - [ ] Implement writeZoneFile() method
  - [ ] Implement updateNamedConf() method
  - [ ] Implement checkZone() method (named-checkzone)
  - [ ] Implement checkConfig() method (named-checkconf)
  - [ ] Implement reloadZone() method (rndc reload)
  - [ ] Implement incrementSerial() method

- [ ] **DNS Service**
  - [ ] Create `src/modules/dns/dns.service.ts`
  - [ ] Implement createZone() with default records
  - [ ] Implement deleteZone() method
  - [ ] Implement addRecord() method
  - [ ] Implement updateRecord() method
  - [ ] Implement deleteRecord() method
  - [ ] Implement validateRecord() method

- [ ] **DNS Controller**
  - [ ] Create `src/modules/dns/dns.controller.ts`
  - [ ] GET /domains/:domainId/dns endpoint
  - [ ] POST /domains/:domainId/dns endpoint
  - [ ] GET /domains/:domainId/dns/records endpoint
  - [ ] POST /domains/:domainId/dns/records endpoint
  - [ ] PATCH /dns/records/:id endpoint
  - [ ] DELETE /dns/records/:id endpoint

### 4.3 Frontend - Databases & DNS

- [ ] **Database Management Pages**
  - [ ] Create DatabasesPage with DataTable
  - [ ] Create DatabaseCreateModal
  - [ ] Create DatabaseDetailPage
  - [ ] Create DatabaseUserForm
  - [ ] Create DatabaseUserList
  - [ ] Create BackupRestorePanel
  - [ ] Implement useDatabases hook

- [ ] **DNS Management Pages**
  - [ ] Create DNSPage component
  - [ ] Create ZoneList component
  - [ ] Create ZoneEditor component
  - [ ] Create RecordForm component (dynamic by type)
  - [ ] Create DNSTemplates component
  - [ ] Implement useDNS hook
  - [ ] Add record type validation

---

## Phase 5: SSL & Email (Week 9-11)

### 5.1 SSL Certificate Management

- [ ] **Certificate Entity**
  - [ ] Create `src/modules/ssl/entities/certificate.entity.ts`
  - [ ] Define fields: commonName, altNames, type, certificate, privateKey, chain
  - [ ] Add expiresAt and issuedAt fields
  - [ ] Add autoRenew field
  - [ ] Add domain relationship
  - [ ] Create database migration
  - [ ] Encrypt private key at rest

- [ ] **ACME Service (Let's Encrypt)**
  - [ ] Install acme-client package
  - [ ] Create `src/modules/ssl/acme.service.ts`
  - [ ] Implement initAccount() method
  - [ ] Implement requestCertificate() for HTTP-01 challenge
  - [ ] Implement requestWildcard() for DNS-01 challenge
  - [ ] Implement verifyChallengeHttp() method
  - [ ] Implement verifyChallengeDns() method
  - [ ] Implement getCertificate() method

- [ ] **SSL Service**
  - [ ] Create `src/modules/ssl/ssl.service.ts`
  - [ ] Implement obtainCertificate() method
  - [ ] Implement installCertificate() method
  - [ ] Implement renewCertificate() method
  - [ ] Implement uploadCustomCertificate() method
  - [ ] Implement removeCertificate() method
  - [ ] Implement checkExpiry() method
  - [ ] Generate Apache SSL VHost config
  - [ ] Configure HTTPS redirect

- [ ] **SSL Renewal Queue**
  - [ ] Create ssl-renewal queue
  - [ ] Create SslRenewalProcessor
  - [ ] Schedule daily renewal check
  - [ ] Renew certificates expiring within 30 days
  - [ ] Send notification on renewal failure

- [ ] **SSL Controller**
  - [ ] Create `src/modules/ssl/ssl.controller.ts`
  - [ ] GET /domains/:domainId/ssl endpoint
  - [ ] POST /domains/:domainId/ssl/request endpoint
  - [ ] POST /domains/:domainId/ssl/upload endpoint
  - [ ] POST /domains/:domainId/ssl/renew endpoint
  - [ ] DELETE /domains/:domainId/ssl endpoint

### 5.2 Email Server Management

- [ ] **Mail Domain Entity**
  - [ ] Create `src/modules/mail/entities/mail-domain.entity.ts`
  - [ ] Define fields: domainName, enabled
  - [ ] Add domain relationship
  - [ ] Create database migration

- [ ] **Mailbox Entity**
  - [ ] Create mailbox.entity.ts
  - [ ] Define fields: localPart, passwordHash, quotaBytes, usedBytes, isActive
  - [ ] Add mailDomain relationship
  - [ ] Create database migration

- [ ] **Mail Alias Entity**
  - [ ] Create mail-alias.entity.ts
  - [ ] Define fields: source, destination
  - [ ] Add mailDomain relationship
  - [ ] Create database migration

- [ ] **Postfix Service**
  - [ ] Create `src/modules/mail/postfix.service.ts`
  - [ ] Implement configureVirtualDomain() method
  - [ ] Implement removeVirtualDomain() method
  - [ ] Implement createMailbox() method
  - [ ] Implement deleteMailbox() method
  - [ ] Implement createAlias() method
  - [ ] Implement deleteAlias() method
  - [ ] Implement updateMaps() method (postmap)
  - [ ] Implement reloadPostfix() method

- [ ] **Dovecot Service**
  - [ ] Create `src/modules/mail/dovecot.service.ts`
  - [ ] Implement configureMailbox() method
  - [ ] Implement updatePassword() method
  - [ ] Implement setQuota() method
  - [ ] Implement getQuotaUsage() method

- [ ] **Mail Service**
  - [ ] Create `src/modules/mail/mail.service.ts`
  - [ ] Implement enableMailForDomain() method
  - [ ] Implement disableMailForDomain() method
  - [ ] Implement createMailbox() method
  - [ ] Implement deleteMailbox() method
  - [ ] Implement updateMailboxPassword() method
  - [ ] Implement createAlias() method
  - [ ] Implement deleteAlias() method
  - [ ] Implement getMailboxes() method

- [ ] **SpamAssassin Integration**
  - [ ] Configure SpamAssassin with Postfix
  - [ ] Implement updateSpamSettings() method
  - [ ] Per-domain spam configuration

- [ ] **Mail Controller**
  - [ ] Create `src/modules/mail/mail.controller.ts`
  - [ ] GET /domains/:domainId/mail endpoint
  - [ ] POST /domains/:domainId/mail endpoint
  - [ ] GET /domains/:domainId/mail/mailboxes endpoint
  - [ ] POST /domains/:domainId/mail/mailboxes endpoint
  - [ ] PATCH /mail/mailboxes/:id endpoint
  - [ ] DELETE /mail/mailboxes/:id endpoint
  - [ ] GET /domains/:domainId/mail/aliases endpoint
  - [ ] POST /domains/:domainId/mail/aliases endpoint
  - [ ] DELETE /mail/aliases/:id endpoint

### 5.3 Frontend - SSL & Email

- [ ] **SSL Management UI**
  - [ ] Create SSLCertificateList component
  - [ ] Create LetsEncryptForm component
  - [ ] Create CertificateUpload component
  - [ ] Create CertificateDetails component
  - [ ] Show certificate expiry warning
  - [ ] Implement useSSL hook

- [ ] **Email Management UI**
  - [ ] Create EmailPage component
  - [ ] Create MailboxList component
  - [ ] Create MailboxForm component
  - [ ] Create AliasManager component
  - [ ] Create SpamSettings component
  - [ ] Implement useEmail hook

---

## Phase 6: Terminal & File Manager (Week 12-13)

### 6.1 Web Terminal

- [ ] **Terminal Session Entity**
  - [ ] Create `src/modules/terminal/entities/terminal-session.entity.ts`
  - [ ] Define fields: sessionId, username, clientIp, endedAt
  - [ ] Add user relationship
  - [ ] Create database migration

- [ ] **Session Manager Service**
  - [ ] Create `src/modules/terminal/session-manager.service.ts`
  - [ ] Install node-pty package
  - [ ] Implement createSession() with PTY
  - [ ] Implement getSession() method
  - [ ] Implement destroySession() method
  - [ ] Implement cleanupIdleSessions() method
  - [ ] Store sessions in memory Map
  - [ ] Log session creation/destruction

- [ ] **Terminal Service**
  - [ ] Create `src/modules/terminal/terminal.service.ts`
  - [ ] Implement getLinuxUser() for session user
  - [ ] Verify user permissions for domain
  - [ ] Set up PTY environment variables

- [ ] **Terminal WebSocket Gateway**
  - [ ] Create `src/modules/terminal/terminal.gateway.ts`
  - [ ] Implement handleConnection() with JWT auth
  - [ ] Implement handleDisconnect() with cleanup
  - [ ] Handle 'terminal:create' event
  - [ ] Handle 'terminal:input' event
  - [ ] Handle 'terminal:resize' event
  - [ ] Forward PTY output to client
  - [ ] Handle PTY exit event

- [ ] **WebSocket Authentication**
  - [ ] Create WsJwtGuard
  - [ ] Extract token from handshake
  - [ ] Validate token and attach user

### 6.2 File Manager

- [ ] **File Manager Service**
  - [ ] Create `src/modules/file-manager/file-manager.service.ts`
  - [ ] Implement listDirectory() method
  - [ ] Implement readFile() method
  - [ ] Implement writeFile() method
  - [ ] Implement createDirectory() method
  - [ ] Implement deleteFile() method
  - [ ] Implement deleteDirectory() method
  - [ ] Implement moveFile() method
  - [ ] Implement copyFile() method
  - [ ] Implement extractArchive() method (tar, zip)
  - [ ] Implement getPermissions() method
  - [ ] Implement setPermissions() method
  - [ ] Implement setOwnership() method

- [ ] **Path Security**
  - [ ] Validate all paths against user home directory
  - [ ] Prevent path traversal attacks
  - [ ] Check file ownership before operations
  - [ ] Limit file size for read/write

- [ ] **File Manager Controller**
  - [ ] Create `src/modules/file-manager/file-manager.controller.ts`
  - [ ] GET /files endpoint (list directory)
  - [ ] POST /files/upload endpoint (multipart)
  - [ ] GET /files/download endpoint
  - [ ] POST /files/create endpoint
  - [ ] DELETE /files endpoint
  - [ ] POST /files/move endpoint
  - [ ] POST /files/copy endpoint
  - [ ] POST /files/extract endpoint
  - [ ] PATCH /files/permissions endpoint
  - [ ] GET /files/content endpoint
  - [ ] PUT /files/content endpoint

### 6.3 Frontend - Terminal & Files

- [ ] **Terminal Components**
  - [ ] Install xterm, xterm-addon-fit, xterm-addon-web-links
  - [ ] Create Terminal component with xterm.js
  - [ ] Create TerminalToolbar component
  - [ ] Create TerminalTabs component
  - [ ] Create TerminalPage with fullscreen option
  - [ ] Implement useTerminalSession hook
  - [ ] Implement WebSocket connection management
  - [ ] Handle terminal resize

- [ ] **File Manager Components**
  - [ ] Create FilesPage component
  - [ ] Create FileTree component (sidebar)
  - [ ] Create FileList component (main area)
  - [ ] Create FileViewer component (preview)
  - [ ] Create FileEditor component (Monaco/CodeMirror)
  - [ ] Create UploadModal component
  - [ ] Create PermissionsModal component
  - [ ] Create NewFileModal component
  - [ ] Create NewFolderModal component
  - [ ] Implement drag-and-drop upload
  - [ ] Implement useFileManager hook

---

## Phase 7: Backup, Monitoring & Notifications (Week 14-15)

### 7.1 Backup System

- [ ] **Backup Entity**
  - [ ] Create `src/modules/backups/entities/backup.entity.ts`
  - [ ] Define fields: name, type, status, sizeBytes, storagePath, storageType
  - [ ] Add completedAt and errorMessage fields
  - [ ] Add domain and schedule relationships
  - [ ] Create database migration

- [ ] **Backup Schedule Entity**
  - [ ] Create backup-schedule.entity.ts
  - [ ] Define fields: name, schedule (cron), type, storageType, retentionDays
  - [ ] Add enabled field
  - [ ] Add domain relationship
  - [ ] Create database migration

- [ ] **Storage Adapters**
  - [ ] Create `src/modules/backups/storage/local.storage.ts`
  - [ ] Create `src/modules/backups/storage/s3.storage.ts`
  - [ ] Create `src/modules/backups/storage/sftp.storage.ts`
  - [ ] Implement upload() method for each
  - [ ] Implement download() method for each
  - [ ] Implement delete() method for each
  - [ ] Implement list() method for each

- [ ] **Backups Service**
  - [ ] Create `src/modules/backups/backups.service.ts`
  - [ ] Implement createFullBackup() method
  - [ ] Implement createDatabaseBackup() method
  - [ ] Implement createFilesBackup() method
  - [ ] Implement restore() method
  - [ ] Implement deleteBackup() method
  - [ ] Implement applyRetention() method
  - [ ] Implement scheduleBackup() method

- [ ] **Backup Queue (BullMQ)**
  - [ ] Create backup queue
  - [ ] Create BackupProcessor
  - [ ] Implement progress reporting
  - [ ] Handle backup failures with notifications
  - [ ] Set up scheduled backup jobs

- [ ] **Backups Controller**
  - [ ] Create `src/modules/backups/backups.controller.ts`
  - [ ] GET /backups endpoint
  - [ ] POST /backups endpoint
  - [ ] GET /backups/:id endpoint
  - [ ] DELETE /backups/:id endpoint
  - [ ] POST /backups/:id/restore endpoint
  - [ ] GET /backups/:id/download endpoint
  - [ ] GET /backup-schedules endpoint
  - [ ] POST /backup-schedules endpoint
  - [ ] PATCH /backup-schedules/:id endpoint
  - [ ] DELETE /backup-schedules/:id endpoint

### 7.2 Monitoring System

- [ ] **Metrics Collection Service**
  - [ ] Create `src/modules/monitoring/metrics.service.ts`
  - [ ] Implement collectSystemMetrics() (CPU, RAM, disk, network)
  - [ ] Implement collectServiceMetrics() (Apache, PHP-FPM, MariaDB, Redis)
  - [ ] Implement collectAppMetrics() (PM2 processes)
  - [ ] Schedule collection every 10 seconds
  - [ ] Store metrics in Redis time-series

- [ ] **Alert Rule Entity**
  - [ ] Create `src/modules/monitoring/entities/alert-rule.entity.ts`
  - [ ] Define fields: name, description, type, metric, severity
  - [ ] Add threshold, operator, durationSeconds, cooldownSeconds
  - [ ] Add scope, domain, app relationships
  - [ ] Add enabled, lastTriggeredAt, triggerCount
  - [ ] Add notificationOverrides JSON field
  - [ ] Create database migration

- [ ] **Alert Instance Entity**
  - [ ] Create alert-instance.entity.ts
  - [ ] Define fields: status, value, threshold, firedAt, resolvedAt
  - [ ] Add acknowledgedAt, acknowledgedBy, notes
  - [ ] Add notificationsSent JSON field
  - [ ] Add rule relationship
  - [ ] Create database migration

- [ ] **Alert Engine Service**
  - [ ] Create `src/modules/monitoring/alert-engine.service.ts`
  - [ ] Implement evaluateRules() method
  - [ ] Implement checkThreshold() method
  - [ ] Implement handleAlertFiring() method
  - [ ] Implement handleAlertResolved() method
  - [ ] Implement cooldown logic
  - [ ] Schedule evaluation every 30 seconds

- [ ] **Monitoring Service**
  - [ ] Create `src/modules/monitoring/monitoring.service.ts`
  - [ ] Implement getCurrentMetrics() method
  - [ ] Implement getHistoricalMetrics() method
  - [ ] Implement getServiceStatus() method
  - [ ] Implement createAlertRule() method
  - [ ] Implement updateAlertRule() method
  - [ ] Implement deleteAlertRule() method
  - [ ] Implement acknowledgeAlert() method
  - [ ] Implement resolveAlert() method

- [ ] **Default Alert Rules**
  - [ ] Create seed for default rules:
    - [ ] High CPU Usage (>90% for 5 min)
    - [ ] High Memory Usage (>85% for 5 min)
    - [ ] Disk Almost Full (>90%)
    - [ ] Disk Warning (>80%)
    - [ ] Service Down
    - [ ] App Crashed
    - [ ] SSL Expiring (<14 days)
    - [ ] SSL Expired (<1 day)
    - [ ] Database Slow Queries
    - [ ] Mail Queue Backup

- [ ] **Monitoring WebSocket Gateway**
  - [ ] Create `src/modules/monitoring/monitoring.gateway.ts`
  - [ ] Stream real-time metrics to dashboard
  - [ ] Stream alert updates
  - [ ] Handle client subscriptions

- [ ] **Monitoring Controller**
  - [ ] Create `src/modules/monitoring/monitoring.controller.ts`
  - [ ] GET /monitoring/alerts/rules endpoint
  - [ ] POST /monitoring/alerts/rules endpoint
  - [ ] GET /monitoring/alerts/rules/:id endpoint
  - [ ] PATCH /monitoring/alerts/rules/:id endpoint
  - [ ] DELETE /monitoring/alerts/rules/:id endpoint
  - [ ] POST /monitoring/alerts/rules/:id/test endpoint
  - [ ] GET /monitoring/alerts endpoint
  - [ ] GET /monitoring/alerts/history endpoint
  - [ ] POST /monitoring/alerts/:id/acknowledge endpoint
  - [ ] POST /monitoring/alerts/:id/resolve endpoint
  - [ ] GET /monitoring/metrics/system endpoint
  - [ ] GET /monitoring/metrics/system/history endpoint
  - [ ] GET /monitoring/metrics/services endpoint

### 7.3 Notification System

- [ ] **Notification Preferences Entity**
  - [ ] Create `src/modules/notifications/entities/notification-preferences.entity.ts`
  - [ ] Define channel toggles: emailEnabled, smsEnabled, fcmEnabled, whatsappEnabled, webhookEnabled
  - [ ] Define channel configs as JSON fields
  - [ ] Define schedule preferences
  - [ ] Add user relationship (one-to-one)
  - [ ] Create database migration

- [ ] **Email Notification Provider**
  - [ ] Create `src/modules/notifications/providers/email.provider.ts`
  - [ ] Install nodemailer
  - [ ] Configure SMTP transport
  - [ ] Create alert email templates
  - [ ] Implement send() method
  - [ ] Implement digest mode

- [ ] **SMS Notification Provider (Twilio)**
  - [ ] Create `src/modules/notifications/providers/sms.provider.ts`
  - [ ] Install twilio package
  - [ ] Implement send() method
  - [ ] Format message for SMS length limit

- [ ] **FCM Notification Provider (Firebase)**
  - [ ] Create `src/modules/notifications/providers/fcm.provider.ts`
  - [ ] Install firebase-admin
  - [ ] Implement send() method
  - [ ] Configure Android/iOS notification options
  - [ ] Include alert data payload

- [ ] **WhatsApp Notification Provider**
  - [ ] Create `src/modules/notifications/providers/whatsapp.provider.ts`
  - [ ] Implement Meta Business API integration
  - [ ] Create WhatsApp message templates
  - [ ] Implement send() method

- [ ] **Webhook Notification Provider**
  - [ ] Create `src/modules/notifications/providers/webhook.provider.ts`
  - [ ] Implement send() method with HMAC signature
  - [ ] Support Slack, Discord, custom webhooks
  - [ ] Include configurable payload

- [ ] **Notification Dispatcher Service**
  - [ ] Create `src/modules/notifications/notification-dispatcher.service.ts`
  - [ ] Implement dispatch() method
  - [ ] Check user preferences
  - [ ] Check quiet hours
  - [ ] Route to appropriate providers
  - [ ] Track notification delivery status

- [ ] **Notification Controller**
  - [ ] Create `src/modules/notifications/notifications.controller.ts`
  - [ ] GET /notifications/preferences endpoint
  - [ ] PUT /notifications/preferences endpoint
  - [ ] POST /notifications/test/:channel endpoint
  - [ ] GET /notifications/history endpoint

### 7.4 Cron Jobs Module

- [ ] **Cron Job Entity**
  - [ ] Create `src/modules/cron/entities/cron-job.entity.ts`
  - [ ] Define fields: name, schedule, command, isActive
  - [ ] Add lastRunAt, nextRunAt, lastOutput fields
  - [ ] Add domain relationship
  - [ ] Create database migration

- [ ] **Cron Service**
  - [ ] Create `src/modules/cron/cron.service.ts`
  - [ ] Implement create() method
  - [ ] Implement update() method
  - [ ] Implement delete() method
  - [ ] Implement writeCrontab() method (per user)
  - [ ] Implement parseCrontab() method
  - [ ] Implement validateCronExpression() method
  - [ ] Implement runNow() method

- [ ] **Cron Controller**
  - [ ] Create `src/modules/cron/cron.controller.ts`
  - [ ] GET /domains/:domainId/cron endpoint
  - [ ] POST /domains/:domainId/cron endpoint
  - [ ] PATCH /cron/:id endpoint
  - [ ] DELETE /cron/:id endpoint
  - [ ] POST /cron/:id/run endpoint

### 7.5 Frontend - Backup, Monitoring & Notifications

- [ ] **Backup Management UI**
  - [ ] Create BackupPage component
  - [ ] Create BackupList component
  - [ ] Create BackupForm component
  - [ ] Create RestoreWizard component
  - [ ] Create ScheduleEditor component
  - [ ] Create StorageSettings component
  - [ ] Implement useBackups hook

- [ ] **Monitoring Dashboard UI**
  - [ ] Create MonitoringPage component
  - [ ] Create real-time charts (CPU, Memory, Disk, Network)
  - [ ] Create ServiceStatusGrid component
  - [ ] Create ProcessList component
  - [ ] Create AlertList component
  - [ ] Create AlertRuleList component
  - [ ] Create AlertRuleForm component
  - [ ] Implement useMonitoring hook with WebSocket

- [ ] **Log Viewer UI**
  - [ ] Create LogsPage component
  - [ ] Create LogViewer component
  - [ ] Create LogFilter component
  - [ ] Create LiveTail component
  - [ ] Create LogSearch component
  - [ ] Implement useLiveLogs hook

- [ ] **Notification Settings UI**
  - [ ] Create NotificationSettings component
  - [ ] Create EmailNotificationForm component
  - [ ] Create SMSNotificationForm component
  - [ ] Create FCMNotificationForm component
  - [ ] Create WhatsAppNotificationForm component
  - [ ] Create WebhookNotificationForm component
  - [ ] Create QuietHoursForm component
  - [ ] Create TestNotificationButton component

- [ ] **Cron Job Management UI**
  - [ ] Create CronPage component
  - [ ] Create CronJobList component
  - [ ] Create CronJobForm component
  - [ ] Create CronExpressionBuilder component
  - [ ] Create CronLogs component
  - [ ] Implement useCron hook

---

## Phase 8: Firewall, System & Polish (Week 16-17)

### 8.1 Firewall Management (CSF - ConfigServer Security & Firewall)

- [ ] **CSF Installation Service**
  - [ ] Create `src/modules/system/csf-installer.service.ts`
  - [ ] Implement removeExistingFirewalls() method:
    - [ ] Stop and disable UFW if present (`systemctl stop ufw && systemctl disable ufw`)
    - [ ] Stop and disable firewalld if present (`systemctl stop firewalld && systemctl disable firewalld`)
    - [ ] Remove UFW package on Debian/Ubuntu (`apt purge ufw -y`)
    - [ ] Remove firewalld package on RHEL (`dnf remove firewalld -y`)
    - [ ] Clean up iptables rules (`iptables -F && iptables -X`)
  - [ ] Implement installCSF() method:
    - [ ] Install perl dependencies (libwww-perl, libgd-graph-perl on Debian; perl-libwww-perl, perl-GD on RHEL)
    - [ ] Download CSF from https://download.configserver.com/csf.tgz
    - [ ] Extract and run install.sh
    - [ ] Verify installation with `csf -v`
  - [ ] Implement configureCSF() method - sets initial configuration in /etc/csf/csf.conf
  - [ ] Implement enableCSF() method - starts and enables CSF and LFD services
  - [ ] Implement isInstalled() method - checks if CSF is present
  - [ ] Configure TESTING mode to "0" for production
  - [ ] Set TCP_IN, TCP_OUT, UDP_IN, UDP_OUT default ports (including 8130 for SSH)

- [ ] **CSF Service**
  - [ ] Create `src/modules/system/csf.service.ts`
  - [ ] Implement getStatus() method - runs `csf -l` to get current rules
  - [ ] Implement allowPort() method - adds port to TCP_IN/TCP_OUT in csf.conf
  - [ ] Implement denyPort() method - removes port from allowed lists
  - [ ] Implement allowIp() method - adds IP to /etc/csf/csf.allow
  - [ ] Implement blockIp() method - adds IP to /etc/csf/csf.deny
  - [ ] Implement tempBlockIp() method - runs `csf -td <ip> <ttl> <comment>`
  - [ ] Implement tempAllowIp() method - runs `csf -ta <ip> <ttl> <comment>`
  - [ ] Implement unblockIp() method - runs `csf -dr <ip>` or removes from csf.deny
  - [ ] Implement listBlockedIps() method - parses /etc/csf/csf.deny
  - [ ] Implement listAllowedIps() method - parses /etc/csf/csf.allow
  - [ ] Implement listTempBlocks() method - runs `csf -t`
  - [ ] Implement restart() method - runs `csf -r` to restart firewall
  - [ ] Implement reload() method - runs `csf -q` for quick restart

- [ ] **CSF LFD (Login Failure Daemon) Service**
  - [ ] Create `src/modules/system/csf-lfd.service.ts`
  - [ ] Implement getBlockedLogins() method - parses LFD blocks
  - [ ] Implement configureLFD() method - sets LF_* options in csf.conf
  - [ ] Implement setLoginFailureLimit() method - configures LF_TRIGGER
  - [ ] Implement setBlockTime() method - configures LF_INTERVAL
  - [ ] Implement ignoreIp() method - adds to /etc/csf/csf.ignore
  - [ ] Implement getLFDStatus() method - checks LFD service status

- [ ] **SSH Security Service**
  - [ ] Create `src/modules/system/ssh-security.service.ts`
  - [ ] Implement getSSHConfig() method - reads current SSH configuration
  - [ ] Implement getSSHPort() method - returns current SSH port (default: 8130)
  - [ ] Implement changeSSHPort() method:
    - [ ] Validate port is not in use by other services
    - [ ] Backup sshd_config before changes
    - [ ] Update Port directive in /etc/ssh/sshd_config
    - [ ] Update CSF TCP_IN and TCP_OUT to allow new port
    - [ ] Remove old port from CSF if different
    - [ ] Restart CSF (`csf -r`)
    - [ ] Validate sshd config (`sshd -t`)
    - [ ] Restart sshd service
    - [ ] Return success/failure with new connection info
  - [ ] Implement getSSHSecuritySettings() method - returns current security settings
  - [ ] Implement updateSSHSecuritySettings() method:
    - [ ] Update PermitRootLogin (prohibit-password, yes, no)
    - [ ] Update PasswordAuthentication (yes, no)
    - [ ] Update PubkeyAuthentication (yes, no)
    - [ ] Update MaxAuthTries
    - [ ] Update LoginGraceTime
    - [ ] Validate and restart sshd

- [ ] **CSF Configuration Entity**
  - [ ] Create `src/modules/system/entities/csf-config.entity.ts`
  - [ ] Store custom port rules in database for persistence
  - [ ] Store IP whitelist/blacklist with comments
  - [ ] Track temporary blocks with expiry times

- [ ] **CSF Controller**
  - [ ] Create `src/modules/system/csf.controller.ts`
  - [ ] GET /system/firewall/status endpoint - returns CSF status and rules summary
  - [ ] GET /system/firewall/ports endpoint - returns allowed/denied ports
  - [ ] POST /system/firewall/ports endpoint - allow a new port
  - [ ] DELETE /system/firewall/ports/:port endpoint - deny/remove a port
  - [ ] GET /system/firewall/ips endpoint - returns allowed/blocked IPs
  - [ ] POST /system/firewall/ips/allow endpoint - whitelist an IP
  - [ ] POST /system/firewall/ips/block endpoint - block an IP
  - [ ] POST /system/firewall/ips/temp-block endpoint - temporarily block an IP
  - [ ] DELETE /system/firewall/ips/:ip endpoint - remove IP from lists
  - [ ] GET /system/firewall/temp-blocks endpoint - list temporary blocks
  - [ ] POST /system/firewall/restart endpoint - restart CSF
  - [ ] GET /system/firewall/lfd endpoint - get LFD status and blocks
  - [ ] PATCH /system/firewall/lfd endpoint - update LFD settings

- [ ] **SSH Security Controller**
  - [ ] Create `src/modules/system/ssh.controller.ts`
  - [ ] GET /system/ssh/config endpoint - returns current SSH configuration
  - [ ] GET /system/ssh/port endpoint - returns current SSH port
  - [ ] PUT /system/ssh/port endpoint - change SSH port (requires confirmation)
  - [ ] GET /system/ssh/security endpoint - returns security settings
  - [ ] PATCH /system/ssh/security endpoint - update security settings
  - [ ] GET /system/ssh/connection-info endpoint - returns SSH connection command

### 8.2 System Information & Settings

- [ ] **System Info Service**
  - [ ] Create `src/modules/system/system-info.service.ts`
  - [ ] Implement getOsInfo() method
  - [ ] Implement getUptime() method
  - [ ] Implement getInstalledPhpVersions() method
  - [ ] Implement getInstalledNodeVersions() method
  - [ ] Implement getPackageUpdates() method

- [ ] **Service Manager**
  - [ ] Implement listServices() method
  - [ ] Implement getServiceStatus() method
  - [ ] Implement startService() method
  - [ ] Implement stopService() method
  - [ ] Implement restartService() method
  - [ ] Implement enableService() method
  - [ ] Implement disableService() method

- [ ] **Settings Entity**
  - [ ] Create settings.entity.ts
  - [ ] Define key-value storage
  - [ ] Create database migration

- [ ] **Settings Service**
  - [ ] Implement get() method
  - [ ] Implement set() method
  - [ ] Implement getAll() method
  - [ ] Define default settings

- [ ] **System Controller**
  - [ ] GET /system/info endpoint
  - [ ] GET /system/services endpoint
  - [ ] POST /system/services/:name/start endpoint
  - [ ] POST /system/services/:name/stop endpoint
  - [ ] POST /system/services/:name/restart endpoint
  - [ ] GET /settings endpoint
  - [ ] PATCH /settings endpoint

### 8.3 Security Hardening

- [ ] **Rate Limiting**
  - [ ] Install @nestjs/throttler
  - [ ] Configure global rate limits
  - [ ] Add stricter limits for auth endpoints
  - [ ] Add per-user rate limiting

- [ ] **Security Headers**
  - [ ] Install helmet
  - [ ] Configure CORS properly
  - [ ] Add Content Security Policy
  - [ ] Add X-Frame-Options
  - [ ] Add X-Content-Type-Options

- [ ] **Input Validation Audit**
  - [ ] Review all DTOs for proper validation
  - [ ] Add sanitization to all inputs
  - [ ] Test for SQL injection
  - [ ] Test for XSS
  - [ ] Test for command injection

- [ ] **CSRF Protection**
  - [ ] Implement CSRF tokens for state-changing operations
  - [ ] Add CSRF validation middleware

### 8.4 Frontend Polish

- [ ] **Theme System**
  - [ ] Implement dark/light theme toggle
  - [ ] Persist theme preference
  - [ ] System preference detection
  - [ ] Smooth theme transition

- [ ] **Keyboard Shortcuts**
  - [ ] Create useKeyboardShortcuts hook
  - [ ] Implement global shortcuts (/, Ctrl+K for search)
  - [ ] Implement page-specific shortcuts
  - [ ] Create KeyboardShortcutsHelp modal

- [ ] **Responsive Design**
  - [ ] Test and fix mobile layouts
  - [ ] Collapsible sidebar on mobile
  - [ ] Touch-friendly interactions
  - [ ] Mobile-optimized tables

- [ ] **Empty States**
  - [ ] Create EmptyState component
  - [ ] Add empty states to all lists
  - [ ] Include helpful actions

- [ ] **Error Handling**
  - [ ] Create ErrorBoundary component
  - [ ] Create error pages (404, 403, 500)
  - [ ] Add toast notifications for errors
  - [ ] Implement retry logic

- [ ] **Loading States**
  - [ ] Create consistent loading spinners
  - [ ] Add skeleton loaders to pages
  - [ ] Add loading overlay for actions

- [ ] **System Info Page**
  - [ ] Create SystemInfoPage component
  - [ ] Create ServiceManager component
  - [ ] Create PackageUpdates component

- [ ] **CSF Firewall Management UI**
  - [ ] Create FirewallPage component - main firewall dashboard
  - [ ] Create CSFStatus component - shows firewall status, enabled/disabled
  - [ ] Create PortManager component - manage allowed TCP/UDP ports
  - [ ] Create IPAllowList component - manage whitelisted IPs with add/remove
  - [ ] Create IPBlockList component - manage blocked IPs with add/remove
  - [ ] Create TempBlockList component - view and manage temporary blocks
  - [ ] Create LFDSettings component - configure login failure daemon
  - [ ] Create LFDBlockedList component - view LFD blocked IPs
  - [ ] Create AddIPModal component - form to add IP to allow/block list
  - [ ] Create TempBlockModal component - form to temporarily block IP with TTL
  - [ ] Create AddPortModal component - form to allow new port
  - [ ] Implement useCSF hook with React Query for all CSF operations

- [ ] **SSH Security Management UI**
  - [ ] Create SSHSecurityPage component - SSH configuration dashboard
  - [ ] Create SSHPortConfig component - display and change SSH port (default: 8130)
  - [ ] Create SSHPortChangeModal component:
    - [ ] Input for new port number
    - [ ] Validation for valid port range (1024-65535)
    - [ ] Warning about losing connection
    - [ ] Confirmation dialog with new connection command
  - [ ] Create SSHSecuritySettings component:
    - [ ] Toggle for root password login
    - [ ] Toggle for password authentication
    - [ ] Toggle for public key authentication
    - [ ] Input for MaxAuthTries
    - [ ] Input for LoginGraceTime
  - [ ] Create SSHConnectionInfo component - displays current SSH connection command
  - [ ] Implement useSSHSecurity hook with React Query

---

## Phase 9: Installation & Testing (Week 18)

### 9.1 One-Line Installer

- [ ] **Main Install Script**
  - [ ] Create `installer/install.sh`
  - [ ] Implement banner display
  - [ ] Implement argument parsing (--minimal, --skip-mail, --skip-dns, --unattended)
  - [ ] Implement check_root() function
  - [ ] Implement check_os() function
  - [ ] Implement check_resources() function

- [ ] **Package Installation Functions**
  - [ ] Implement install_prereqs() (curl, git, etc.)
  - [ ] Implement install_nodejs() (Node 24 + PM2)
  - [ ] Implement install_apache()
  - [ ] Implement install_php() (7.4-8.3)
  - [ ] Implement install_mariadb() with secure setup
  - [ ] Implement install_redis()
  - [ ] Implement install_bind9() (optional)
  - [ ] Implement install_mail() (Postfix + Dovecot, optional)
  - [ ] Implement install_certbot()

- [ ] **Security Hardening & Firewall Functions**
  - [ ] Implement remove_existing_firewalls():
    - [ ] Detect and stop UFW if running (`systemctl stop ufw`)
    - [ ] Disable UFW (`systemctl disable ufw`)
    - [ ] Remove UFW package on Debian/Ubuntu (`apt purge ufw -y`)
    - [ ] Detect and stop firewalld if running (`systemctl stop firewalld`)
    - [ ] Disable firewalld (`systemctl disable firewalld`)
    - [ ] Remove firewalld package on RHEL (`dnf remove firewalld -y`)
    - [ ] Flush all iptables rules (`iptables -F && iptables -X && iptables -t nat -F && iptables -t nat -X`)
    - [ ] Log removal actions
  - [ ] Implement change_ssh_port():
    - [ ] Backup /etc/ssh/sshd_config to /etc/ssh/sshd_config.bak
    - [ ] Change Port from 22 to 8130 in sshd_config
    - [ ] Disable root password login (PermitRootLogin prohibit-password)
    - [ ] Disable empty passwords (PermitEmptyPasswords no)
    - [ ] Enable public key authentication (PubkeyAuthentication yes)
    - [ ] Set MaxAuthTries to 3
    - [ ] Set LoginGraceTime to 60
    - [ ] Disable X11 forwarding (X11Forwarding no)
    - [ ] Validate sshd config (`sshd -t`)
    - [ ] Restart SSH service (`systemctl restart sshd`)
    - [ ] Display warning to user about new SSH port
  - [ ] Implement install_csf():
    - [ ] Install perl dependencies:
      - [ ] Debian/Ubuntu: `apt install -y libwww-perl libgd-graph-perl libio-socket-ssl-perl libcrypt-ssleay-perl libnet-libidn-perl libio-socket-inet6-perl libsocket6-perl`
      - [ ] RHEL: `dnf install -y perl-libwww-perl perl-GD perl-IO-Socket-SSL perl-Net-SSLeay perl-Net-LibIDN perl-IO-Socket-INET6 perl-Socket6`
    - [ ] Download CSF: `wget https://download.configserver.com/csf.tgz`
    - [ ] Extract: `tar -xzf csf.tgz`
    - [ ] Install: `cd csf && sh install.sh`
    - [ ] Remove installer files
  - [ ] Implement configure_csf():
    - [ ] Set TESTING = "0" (disable testing mode, enable firewall)
    - [ ] Set RESTRICT_SYSLOG = "3" (restrict syslog access)
    - [ ] Configure TCP_IN ports: "8130,80,443,25,465,587,110,995,143,993,53,${SERVERHUBX_PORT}"
    - [ ] Configure TCP_OUT ports: "8130,80,443,25,465,587,110,995,143,993,53,113"
    - [ ] Configure UDP_IN ports: "53"
    - [ ] Configure UDP_OUT ports: "53,113,123"
    - [ ] Set ICMP_IN = "1" (allow ping)
    - [ ] Set SYNFLOOD = "1" (enable SYN flood protection)
    - [ ] Set SYNFLOOD_RATE = "100/s"
    - [ ] Set SYNFLOOD_BURST = "150"
    - [ ] Set CONNLIMIT = "22;5,80;50,443;50" (connection limits per port)
    - [ ] Set PORTFLOOD = "22;tcp;5;300,80;tcp;20;5,443;tcp;20;5" (port flood protection)
    - [ ] Set CT_LIMIT = "300" (connection tracking limit)
    - [ ] Set CT_INTERVAL = "30"
    - [ ] Set LF_ALERT_TO = admin email
    - [ ] Set LF_ALERT_FROM = server email
  - [ ] Implement configure_lfd():
    - [ ] Set LF_TRIGGER = "5" (block after 5 failed logins)
    - [ ] Set LF_TRIGGER_PERM = "1" (permanent block)
    - [ ] Set LF_SSHD = "5" (SSH login failures)
    - [ ] Set LF_FTPD = "10" (FTP login failures)
    - [ ] Set LF_SMTPAUTH = "5" (SMTP auth failures)
    - [ ] Set LF_POP3D = "10" (POP3 login failures)
    - [ ] Set LF_IMAPD = "10" (IMAP login failures)
    - [ ] Set LF_HTACCESS = "5" (htaccess failures)
    - [ ] Set LF_MODSEC = "5" (ModSecurity triggers)
    - [ ] Set LF_CPANEL = "5" (panel login failures - for ServerHubX)
    - [ ] Set LF_DIRECTADMIN = "0" (disable)
    - [ ] Set PS_INTERVAL = "300" (port scan interval)
    - [ ] Set PS_LIMIT = "10" (port scan limit)
    - [ ] Set LF_INTEGRITY = "3600" (file integrity check every hour)
    - [ ] Set LF_DISTATTACK = "1" (distributed attack protection)
    - [ ] Set LF_DISTFTP = "1" (distributed FTP protection)
    - [ ] Set LF_BLOCKLISTS = "1" (enable blocklists)
  - [ ] Implement start_csf():
    - [ ] Start CSF: `csf -s`
    - [ ] Start LFD: `systemctl start lfd`
    - [ ] Enable CSF on boot: `systemctl enable csf`
    - [ ] Enable LFD on boot: `systemctl enable lfd`
    - [ ] Verify CSF is running: `csf -l`
    - [ ] Run CSF check: `perl /usr/local/csf/bin/csftest.pl`
  - [ ] Implement whitelist_server_ip():
    - [ ] Get server's public IP
    - [ ] Add to /etc/csf/csf.allow with comment
    - [ ] Add localhost (127.0.0.1, ::1) to csf.allow
  - [ ] Implement configure_fail2ban_integration():
    - [ ] If fail2ban exists, disable it (CSF/LFD replaces it)
    - [ ] `systemctl stop fail2ban && systemctl disable fail2ban`

- [ ] **Additional Security Hardening Functions**
  - [ ] Implement secure_kernel_params():
    - [ ] Create /etc/sysctl.d/99-serverhubx-security.conf
    - [ ] Set net.ipv4.tcp_syncookies = 1 (SYN flood protection)
    - [ ] Set net.ipv4.conf.all.rp_filter = 1 (reverse path filtering)
    - [ ] Set net.ipv4.conf.default.rp_filter = 1
    - [ ] Set net.ipv4.icmp_echo_ignore_broadcasts = 1
    - [ ] Set net.ipv4.conf.all.accept_source_route = 0
    - [ ] Set net.ipv4.conf.default.accept_source_route = 0
    - [ ] Set net.ipv4.conf.all.accept_redirects = 0
    - [ ] Set net.ipv4.conf.default.accept_redirects = 0
    - [ ] Set net.ipv4.conf.all.secure_redirects = 0
    - [ ] Set net.ipv4.conf.default.secure_redirects = 0
    - [ ] Set net.ipv4.conf.all.send_redirects = 0
    - [ ] Set net.ipv4.conf.default.send_redirects = 0
    - [ ] Set net.ipv4.icmp_ignore_bogus_error_responses = 1
    - [ ] Set net.ipv4.tcp_timestamps = 0
    - [ ] Set net.ipv4.conf.all.log_martians = 1
    - [ ] Set kernel.randomize_va_space = 2 (ASLR)
    - [ ] Apply with `sysctl -p /etc/sysctl.d/99-serverhubx-security.conf`
  - [ ] Implement secure_tmp_directories():
    - [ ] Mount /tmp with noexec,nosuid,nodev options
    - [ ] Mount /var/tmp with noexec,nosuid,nodev options
    - [ ] Add to /etc/fstab for persistence
  - [ ] Implement disable_unnecessary_services():
    - [ ] Disable rpcbind if not needed
    - [ ] Disable avahi-daemon
    - [ ] Disable cups (printing)
    - [ ] Disable bluetooth
    - [ ] List disabled services in log
  - [ ] Implement configure_automatic_updates():
    - [ ] Debian/Ubuntu: Install and configure unattended-upgrades
    - [ ] RHEL: Configure dnf-automatic for security updates
    - [ ] Enable automatic security updates only
  - [ ] Implement setup_audit_logging():
    - [ ] Install auditd if not present
    - [ ] Configure audit rules for:
      - [ ] User/group modifications
      - [ ] Network configuration changes
      - [ ] Sudoers file changes
      - [ ] SSH configuration changes
      - [ ] Cron job modifications
    - [ ] Enable and start auditd service

- [ ] **ServerHubX Setup Functions**
  - [ ] Implement create_serverhubx_user()
  - [ ] Implement setup_sudo_rules()
  - [ ] Implement install_serverhubx() (git clone, npm install, build)
  - [ ] Implement create_database()
  - [ ] Implement create_systemd_service()
  - [ ] Implement generate_ssl_cert() (self-signed for dashboard)
  - [ ] Implement create_admin_user()
  - [ ] Implement start_serverhubx()
  - [ ] Implement print_summary():
    - [ ] Display ServerHubX dashboard URL (https://IP:PORT)
    - [ ] Display admin credentials location (/root/.serverhubx-credentials)
    - [ ] Display SSH connection info with new port 8130 (`ssh -p 8130 root@IP`)
    - [ ] Display warning about changed SSH port in red/bold
    - [ ] List all installed services
    - [ ] Display log file locations
    - [ ] Display CSF firewall status
    - [ ] Display open ports summary

- [ ] **Post-Install Domain Setup Instructions**
  > Displays clear instructions to the user about configuring wildcard DNS for their domains. This is critical for ServerHubX to manage all subdomains and virtual hosts.
  - [ ] Implement show_dns_instructions():
    - [ ] Display server's public IP address (obtained via `curl -s ifconfig.me` or similar)
    - [ ] Show required DNS records in table format:
      ```
      | Type | Host | Value |
      |------|------|-------|
      | A    | @    | <SERVER_IP> |
      | A    | *    | <SERVER_IP> |
      ```
    - [ ] Explain wildcard (*) enables automatic subdomain support
    - [ ] Provide example for common registrars (GoDaddy, Namecheap, Cloudflare)
    - [ ] Warn about 24-48 hour DNS propagation time
    - [ ] Provide dig command to verify DNS setup: `dig +short yourdomain.com` and `dig +short test.yourdomain.com`
  - [ ] Implement verify_dns_setup():
    - [ ] Accept domain name as parameter
    - [ ] Check if domain resolves to server IP
    - [ ] Check if wildcard resolves correctly
    - [ ] Return success/failure with helpful error messages
  - [ ] Save DNS instructions to /root/.serverhubx-dns-setup.txt for reference

- [ ] **Uninstall Script**
  > Complete removal script that cleanly uninstalls ServerHubX and optionally removes all managed domains, users, and data.
  - [ ] Create `installer/uninstall.sh` - interactive uninstall script with safety confirmations
  - [ ] Stop and disable service - `systemctl stop serverhubx && systemctl disable serverhubx`
  - [ ] Remove application files - deletes /opt/serverhubx directory
  - [ ] Remove system user - deletes serverhubx system user account
  - [ ] Remove database (optional) - prompts before dropping serverhubx database and user
  - [ ] Remove sudo rules - deletes /etc/sudoers.d/serverhubx
  - [ ] Optionally remove CSF - prompts if user wants to uninstall CSF firewall
  - [ ] Optionally restore SSH port - prompts to change SSH back to port 22
  - [ ] Keep or remove managed domains - prompts about domain data in /home directories

### 9.2 Testing

- [ ] **Unit Tests**
  - [ ] Test CommandExecutorService
  - [ ] Test InputValidatorService
  - [ ] Test TransactionManagerService
  - [ ] Test all service methods
  - [ ] Achieve >80% coverage

- [ ] **Integration Tests**
  - [ ] Test domain creation workflow
  - [ ] Test user authentication flow
  - [ ] Test file manager operations
  - [ ] Test database operations
  - [ ] Test DNS operations

- [ ] **E2E Tests**
  - [ ] Install Playwright
  - [ ] Test login flow
  - [ ] Test domain management
  - [ ] Test file manager
  - [ ] Test terminal connection

- [ ] **Multi-Distro Testing**
  - [ ] Test on Ubuntu 22.04
  - [ ] Test on Ubuntu 24.04
  - [ ] Test on Debian 11
  - [ ] Test on Debian 12
  - [ ] Test on Rocky Linux 8
  - [ ] Test on Rocky Linux 9
  - [ ] Test on AlmaLinux 8
  - [ ] Test on AlmaLinux 9

### 9.3 Documentation

- [ ] **API Documentation**
  - [ ] Install @nestjs/swagger
  - [ ] Add Swagger decorators to all controllers
  - [ ] Document request/response schemas
  - [ ] Generate OpenAPI spec

- [ ] **Installation Guide**
  - [ ] Document system requirements
  - [ ] Document one-line installer usage
  - [ ] Document manual installation steps
  - [ ] Document post-installation setup

- [ ] **User Manual**
  - [ ] Document dashboard features
  - [ ] Document domain management
  - [ ] Document application deployment
  - [ ] Document email setup
  - [ ] Document backup configuration

- [ ] **Developer Guide**
  - [ ] Document project structure
  - [ ] Document coding standards
  - [ ] Document contribution guidelines
  - [ ] Document API usage

---

## Critical Files Summary

### Backend (Priority Order)
1. `backend/src/core/executor/command-executor.service.ts`
2. `backend/src/core/executor/command-whitelist.ts`
3. `backend/src/core/rollback/transaction-manager.service.ts`
4. `backend/src/modules/system-users/system-users.service.ts`
5. `backend/src/modules/domains/vhost.service.ts`
6. `backend/src/modules/monitoring/alert-engine.service.ts`
7. `backend/src/modules/notifications/notification-dispatcher.service.ts`

### Frontend (Priority Order)
1. `frontend/src/lib/api/client.ts`
2. `frontend/src/store/index.ts`
3. `frontend/src/providers/AuthProvider.tsx`
4. `frontend/src/lib/websocket/WebSocketManager.ts`
5. `frontend/src/layouts/MainLayout.tsx`

### Installer
1. `installer/install.sh`

---

## Progress Tracking

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | Not Started | 0% |
| Phase 2: Users & Domains | Not Started | 0% |
| Phase 3: Applications | Not Started | 0% |
| Phase 4: Databases & DNS | Not Started | 0% |
| Phase 5: SSL & Email | Not Started | 0% |
| Phase 6: Terminal & Files | Not Started | 0% |
| Phase 7: Backup & Monitoring | Not Started | 0% |
| Phase 8: Firewall & Polish | Not Started | 0% |
| Phase 9: Installation & Testing | Not Started | 0% |

**Overall Progress: 0%**
