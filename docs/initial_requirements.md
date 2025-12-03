Below is a **FULL, END-TO-END, PRODUCTION-LEVEL PRD (Product Requirements Document)** for a *Node.js 24 based Hosting Dashboard* that fully replicates **Virtualmin/Webmin capabilities**, adds modern improvements, and supports **Node + PHP (LAMP + LEMP)** stacks.
This is *not* an MVP — it is the **complete full-version specification** including infrastructure, UI, functional requirements, security, integrations, terminal, automation, etc.

---

# **PRODUCT REQUIREMENTS DOCUMENT (PRD)**

## **Product Name:** *ServerHubX* (placeholder)

## **Version:** 1.0 (Full Release)

## **Target OS:** Linux (Ubuntu, Debian, Rocky/AlmaLinux, CentOS Stream)

## **Tech Stack:**

* **Backend:** Node 24 (TypeScript), NestJS/Express
* **Web Server:** Apache 2.4 (Reverse Proxy), optional Nginx
* **Front-end:** React or Next.js
* **Database:** PostgreSQL or MariaDB
* **Terminal:** WebSocket-based integrated SSH
* **Container Support:** Docker (future expansion)
* **Supported Application Types:**

  * **Node.js apps:** Next.js, React SSR, Express, NestJS, Angular Universal
  * **PHP apps:** Core PHP, Laravel 11, WordPress, CodeIgniter, OpenCart
  * Latest Node (24+) & PHP (8.3+)

---

# **1. PRODUCT OVERVIEW**

ServerHubX is a **web-based hosting and server management dashboard** designed to replace Virtualmin/Webmin with a modern, Node-powered architecture.

Key goals:

* Provide **all Virtualmin features** with a cleaner UI.
* Support **virtual hosts, domain management, DNS, email, database**, cron jobs, user accounts, backups, monitoring, etc.
* Support **Node frameworks + PHP applications** simultaneously.
* Seamlessly integrate with **system users**, just like Virtualmin.
* Provide a **built-in Web Terminal** for SSH access.
* Streamline server management for developers, hosting companies, and agencies.

---

# **2. PRODUCT OBJECTIVES**

### **Primary Goals**

* Full-featured hosting control panel with Node-based backend.
* Allow running multiple websites/apps with isolation (system users).
* Simplify management of Linux servers and multi-stack deployments.
* Provide a modular API for automation/integration.
* Match and improve upon Virtualmin capabilities.

### **Secondary Goals**

* Enhanced UX/UI
* Admin & user roles
* Multi-server & cluster support (future)
* Auto SSL + Let’s Encrypt
* Git pull/deploy integration
* Webhooks for CI/CD

---

# **3. USER ROLES**

| Role                    | Description                               |
| ----------------------- | ----------------------------------------- |
| **Root Administrator**  | Full system control, server-wide settings |
| **Reseller (Optional)** | Manage multiple clients/domains           |
| **Domain Owner**        | Manage own site/apps                      |
| **Developer User**      | Limited access to files, terminal, logs   |

---

# **4. HIGH-LEVEL FEATURES (MATCHING VIRTUALMIN + NEW FEATURES)**

## **4.1 Server Administration (System-Wide)**

* Dashboard with server health
* OS & kernel info
* Network usage
* CPU, RAM, disk monitoring
* Running processes
* System logs viewer
* Service manager (start/stop/restart):

  * Apache
  * Nginx (optional)
  * MySQL/MariaDB
  * PostgreSQL
  * PHP-FPM
  * Node PM2 services
  * SSHD
  * Fail2Ban
* Firewall Manager (UFW/Firewalld)
* Software package updates
* SSH Key Management

---

## **4.2 User Account System (Linux System Users)**

Like Virtualmin:

* For each domain, create Linux user + group
* Home directory auto-creation:
  `/home/<username>/public_html`
* File permissions isolation
* Shell access configuration
* SSH key auth
* Quotas (disk & file count)

---

## **4.3 Domain & Virtual Host Management**

Supports both Apache and optional Nginx.

Features:

* Add/edit/delete virtual hosts
* Automatic directory creation
* Multi-version runtime:

  * PHP 7.4–8.3
  * Node 18–24
* Reverse proxy templates for Node apps
* Per-domain Apache config templates
* PHP-FPM pool creation
* Log rotation per domain
* HTTP → HTTPS redirection

---

## **4.4 Application Deployment**

### **4.4.1 PHP Applications**

* PHP-FPM version selector
* Upload ZIP or Git deploy
* Composer install support
* Auto permissions fixing
* Web root selector

### **4.4.2 Node Applications**

* Node version per domain
* Framework presets:

  * Express
  * NestJS
  * Next.js
  * Remix
  * Angular SSR
* Automatic PM2 process setup
* Systemd service creation (optional)
* Restart app from panel
* Reverse proxy auto-setup
* Logs viewer (stdout/stderr)

---

## **4.5 Database Management**

Supports MariaDB, MySQL, PostgreSQL.

Features:

* Create DB & user
* Reset password
* phpMyAdmin / pgAdmin integration
* Database backups
* Database import/export
* Query terminal with safety restrictions

---

## **4.6 DNS Management**

Like Virtualmin:

* DNS zone creation
* Record types: A, AAAA, CNAME, TXT, MX, NS, SRV
* DNS templates
* Glue record support (future)
* Auto-apply Let’s Encrypt DNS challenge

---

## **4.7 Email & Mail Server**

(If enabled)

* Postfix + Dovecot integration
* Mailboxes and aliases
* SpamAssassin
* Antivirus
* Rate limiting
* Webmail (RainLoop/Roundcube)

---

## **4.8 SSL/HTTPS**

* Let’s Encrypt integration
* Wildcard certificate support
* Auto-renew
* Manual certificate upload
* Force HTTPS toggle

---

## **4.9 File Manager**

* Tree view
* Upload/download
* Extract ZIP
* Permissions/ownership editor
* Theme-aware design
* Preview mode for text files

---

## **4.10 Integrated Terminal (SSH Console)**

**Identical to Virtualmin/Webmin but modern.**

* WebSocket-based secure terminal
* Session isolated per system user
* Root users get sudo access
* Color scheme customization
* Terminal logs (optional)
* Idle session timeout

---

## **4.11 Cron Jobs Manager**

* Add/edit/delete cron jobs
* Per-user crontab
* Cron templates
* Cron logs viewer

---

## **4.12 Backup & Restore System**

### **Backup Types**

* Domain backups
* Database backups
* File backups
* Package list backups

### **Storage Options**

* Local
* FTP/SFTP
* AWS S3
* Google Cloud
* Custom S3-compatible

### **Scheduling**

* Daily/weekly/monthly
* Retention policies

---

## **4.13 Logs & Monitoring**

* App logs (Node, PHP-FPM, Apache)
* Email logs
* Database logs
* Access & error logs
* Live tail support

---

## **4.14 API for Automation**

* REST/GraphQL API
* JWT authentication
* API tokens for CI/CD
* Webhooks for deployment or restarting apps

---

# **5. NON-FUNCTIONAL REQUIREMENTS**

## **5.1 Performance**

* Able to handle 500+ domains per server
* Log viewer optimized with streaming
* Zero-downtime application reloads via PM2

## **5.2 Security**

* HTTPS only (self-signed support during setup)
* Password hashing using bcrypt/argon2
* Full audit logs
* CSRF & XSS protection
* Per-user filesystem isolation
* No unsafe shell execution
* Secure terminal sandbox

## **5.3 Scalability**

* Modular microservice-ready backend
* Plugins/extensions architecture
* Ability to add multiple servers (future)

---

# **6. UI/UX REQUIREMENTS**

Modern UI inspired by Virtualmin + cPanel + CloudPanel.

## **6.1 Main Navigation**

* Dashboard
* Domains
* Users
* Databases
* Applications
* DNS
* Email
* Files
* Terminal
* Cron
* Logs
* Settings
* System Info
* Backup
* Monitoring

## **6.2 Design System**

* Dark + Light theme
* Responsive
* Keyboard shortcuts
* Data tables with filtering & search
* Modal-based editing

---

# **7. INSTALLATION & SETUP FLOW**

### **7.1 One-Line Installer**

```
curl -s https://serverhubx.io/install.sh | bash
```

### Installer performs:

* Update packages
* Install Node 24
* Install Apache/Nginx
* Install PHP versions + FPM
* Install DB server (optional)
* Create system service: serverhubx.service
* Generate SSL for dashboard
* Create admin user

---

# **8. INTERNAL ARCHITECTURE**

## **Services**

* **User Service** → Linux users mgmt
* **Domain Service** → vhosts mgmt
* **App Service** → Node/PHP deployment
* **DB Service** → DB mgmt
* **DNS Service** → Bind9 integration
* **Mail Service**
* **SSL Service**
* **Terminal Service** → SSH WebSocket
* **Monitoring Service**
* **Backup Service**

## **Runtimes Supported**

* Node 18–24 (installed via nvm or system packages)
* PHP 7.4–8.3 (multiple FPM pools)

---

# **9. RISKS & MITIGATIONS**

| Risk                                   | Mitigation                             |
| -------------------------------------- | -------------------------------------- |
| System-level operations are risky      | Strict permission checks, sudo sandbox |
| Users may delete system files          | Chroot environment per user            |
| Conflicts with existing Apache configs | Use separate include directories       |
| Large backups may break server         | Chunked backup + resource limits       |

---

# **10. ROADMAP (FULL VERSION)**

### **v1.0 (Release)**

* Full Virtualmin feature parity
* Node + PHP dual-runtime support
* Apache reverse proxy templates
* Web Terminal
* Database and DNS mgmt
* Backups & monitoring

### **v2.0**

* Dockerized apps
* Multi-server clusters
* Kubernetes support

---

