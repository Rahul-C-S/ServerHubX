# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ServerHubX is a web-based hosting and server management dashboard designed to replace Virtualmin/Webmin. It manages Linux servers supporting both Node.js and PHP applications.

**Target OS:** Ubuntu, Debian, Rocky/AlmaLinux, CentOS Stream

*** A comprehensive implementation plan is written in `docs/plan.md` ***
*** Always use nestjs cli to create modules, services, etc. Also for front end use available cli tools ***

## Tech Stack

- **Backend:** Node.js 24, TypeScript, NestJS or Express
- **Frontend:** React or Next.js
- **Web Server:** Apache 2.4 (reverse proxy), optional Nginx
- **Database:** PostgreSQL or MariaDB
- **Process Manager:** PM2 for Node.js apps
- **Terminal:** WebSocket-based SSH integration

## Architecture

The system uses a service-oriented architecture with these core services:

- **User Service** - Linux system user management (creates real OS users per domain)
- **Domain Service** - Apache/Nginx virtual host configuration
- **App Service** - Node.js and PHP application deployment
- **DB Service** - Database creation and management
- **DNS Service** - Bind9 zone management
- **SSL Service** - Let's Encrypt integration
- **Terminal Service** - WebSocket SSH sessions
- **Backup Service** - Local and cloud backup management

Each domain creates a Linux user with home directory at `/home/<username>/public_html`.

## Key Concepts

- **Multi-runtime support:** PHP 7.4-8.3 via PHP-FPM pools, Node 18-24 via PM2
- **Per-domain isolation:** Each domain has its own system user, file permissions, and process pool
- **Reverse proxy pattern:** Apache/Nginx proxies requests to Node.js apps running on internal ports

## User Roles

- Root Administrator (full system control)
- Reseller (manages multiple clients)
- Domain Owner (manages own sites)
- Developer User (limited file/terminal access)

## Security Considerations

- All system operations require strict permission checks
- Users are isolated via chroot environments
- No unsafe shell execution - use parameterized commands
- CSRF and XSS protection required on all endpoints
