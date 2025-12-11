#!/bin/bash
#
# ServerHubX Installation Script
# One-line installer for complete hosting control panel setup
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/your-repo/serverhubx/main/installer/install.sh | bash
#
# Options:
#   --minimal       Skip optional components (mail, dns)
#   --skip-mail     Skip mail server installation
#   --skip-dns      Skip DNS server installation
#   --unattended    Non-interactive mode with defaults
#   --dev           Development mode (use local repo)
#

set -e

# ============================================================================
# Configuration
# ============================================================================

SERVERHUBX_VERSION="1.0.0"
SERVERHUBX_USER="serverhubx"
SERVERHUBX_HOME="/opt/serverhubx"
SERVERHUBX_PORT="${SERVERHUBX_PORT:-3000}"
SERVERHUBX_REPO="https://github.com/your-org/serverhubx.git"

SSH_PORT="${SSH_PORT:-8130}"
DB_NAME="serverhubx"
DB_USER="serverhubx"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Flags
SKIP_MAIL=false
SKIP_DNS=false
UNATTENDED=false
DEV_MODE=false
MINIMAL=false

# Detected values
OS_FAMILY=""
OS_ID=""
OS_VERSION=""
PKG_MANAGER=""
SYSTEMCTL_CMD="systemctl"
SERVER_IP=""

# ============================================================================
# Utility Functions
# ============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║   ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ ██╗  ██╗██╗  ██╗║"
    echo "║   ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██║  ██║██║  ██║║"
    echo "║   ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝███████║╚██╗██╔╝║"
    echo "║   ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗██╔══██║ ╚███╔╝ ║"
    echo "║   ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║██║  ██║ ██╔██╗ ║"
    echo "║   ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═╝║"
    echo "║                                                                   ║"
    echo "║                    Hosting Control Panel v${SERVERHUBX_VERSION}                    ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

confirm() {
    if [ "$UNATTENDED" = true ]; then
        return 0
    fi
    read -p "$1 [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24
}

get_server_ip() {
    SERVER_IP=$(curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
    echo "$SERVER_IP"
}

# ============================================================================
# System Checks
# ============================================================================

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        echo "Please run: sudo bash install.sh"
        exit 1
    fi
}

check_os() {
    log_info "Detecting operating system..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION="$VERSION_ID"

        case "$ID" in
            ubuntu|debian)
                OS_FAMILY="debian"
                PKG_MANAGER="apt"
                ;;
            rocky|almalinux|centos|rhel)
                OS_FAMILY="rhel"
                PKG_MANAGER="dnf"
                ;;
            *)
                log_error "Unsupported operating system: $ID"
                exit 1
                ;;
        esac
    elif [ -f /etc/debian_version ]; then
        OS_FAMILY="debian"
        OS_ID="debian"
        PKG_MANAGER="apt"
    elif [ -f /etc/redhat-release ]; then
        OS_FAMILY="rhel"
        OS_ID="rhel"
        PKG_MANAGER="dnf"
    else
        log_error "Cannot detect operating system"
        exit 1
    fi

    log_success "Detected: $OS_ID $OS_VERSION ($OS_FAMILY family)"
}

check_resources() {
    log_info "Checking system resources..."

    # Check RAM (minimum 1GB, recommended 2GB)
    local total_ram=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 1024 ]; then
        log_error "Insufficient RAM: ${total_ram}MB (minimum 1024MB required)"
        exit 1
    elif [ "$total_ram" -lt 2048 ]; then
        log_warning "Low RAM: ${total_ram}MB (2048MB recommended)"
    else
        log_success "RAM: ${total_ram}MB"
    fi

    # Check disk space (minimum 10GB)
    local free_disk=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$free_disk" -lt 10 ]; then
        log_error "Insufficient disk space: ${free_disk}GB (minimum 10GB required)"
        exit 1
    else
        log_success "Disk space: ${free_disk}GB available"
    fi

    # Check CPU cores
    local cpu_cores=$(nproc)
    log_success "CPU cores: $cpu_cores"
}

check_existing_services() {
    log_info "Checking for existing services..."

    local services_found=""

    # Check for existing web servers
    if command -v apache2 &>/dev/null || command -v httpd &>/dev/null; then
        services_found="$services_found Apache"
    fi
    if command -v nginx &>/dev/null; then
        services_found="$services_found Nginx"
    fi

    # Check for existing databases
    if command -v mysql &>/dev/null || command -v mariadb &>/dev/null; then
        services_found="$services_found MariaDB/MySQL"
    fi

    # Check for existing control panels
    if [ -d /usr/local/cpanel ] || [ -d /var/cpanel ]; then
        log_error "cPanel detected. ServerHubX cannot be installed alongside cPanel."
        exit 1
    fi
    if [ -d /usr/libexec/webmin ]; then
        log_warning "Webmin detected. Consider removing it before installing ServerHubX."
    fi

    if [ -n "$services_found" ]; then
        log_warning "Existing services detected:$services_found"
        if ! confirm "Continue with installation?"; then
            exit 0
        fi
    fi
}

# ============================================================================
# Package Installation
# ============================================================================

install_prereqs() {
    log_step "Installing prerequisites..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get update -qq
        apt-get install -y -qq \
            curl \
            wget \
            git \
            unzip \
            tar \
            software-properties-common \
            gnupg2 \
            ca-certificates \
            lsb-release \
            openssl \
            acl \
            cron
    else
        dnf install -y -q \
            curl \
            wget \
            git \
            unzip \
            tar \
            gnupg2 \
            ca-certificates \
            openssl \
            acl \
            cronie
    fi

    log_success "Prerequisites installed"
}

install_nodejs() {
    log_step "Installing Node.js 24 LTS..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        # Add NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
        apt-get install -y -qq nodejs
    else
        # Add NodeSource repository for RHEL
        curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
        dnf install -y -q nodejs
    fi

    # Install PM2 globally
    npm install -g pm2 --silent

    # Setup PM2 startup
    pm2 startup systemd -u root --hp /root --silent

    log_success "Node.js $(node -v) and PM2 installed"
}

install_apache() {
    log_step "Installing Apache web server..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y -qq apache2 libapache2-mod-fcgid

        # Enable required modules
        a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers fcgid actions alias

        # Disable default site
        a2dissite 000-default.conf 2>/dev/null || true

    else
        dnf install -y -q httpd mod_ssl mod_fcgid

        # Enable and start Apache
        systemctl enable httpd
    fi

    log_success "Apache installed"
}

install_php() {
    log_step "Installing PHP versions (7.4, 8.0, 8.1, 8.2, 8.3)..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        # Add Ondrej PHP repository
        add-apt-repository -y ppa:ondrej/php 2>/dev/null || {
            # For Debian, add sury.org repository
            curl -sSL https://packages.sury.org/php/apt.gpg | gpg --dearmor -o /usr/share/keyrings/sury-php.gpg
            echo "deb [signed-by=/usr/share/keyrings/sury-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/sury-php.list
            apt-get update -qq
        }

        for version in 7.4 8.0 8.1 8.2 8.3; do
            apt-get install -y -qq \
                php${version}-fpm \
                php${version}-cli \
                php${version}-common \
                php${version}-mysql \
                php${version}-pgsql \
                php${version}-curl \
                php${version}-gd \
                php${version}-mbstring \
                php${version}-xml \
                php${version}-zip \
                php${version}-bcmath \
                php${version}-intl \
                php${version}-soap \
                php${version}-redis \
                php${version}-imagick 2>/dev/null || log_warning "Some PHP $version packages not available"
        done

    else
        # Add Remi repository for RHEL
        dnf install -y -q https://rpms.remirepo.net/enterprise/remi-release-$(rpm -E %rhel).rpm 2>/dev/null || true
        dnf module reset php -y -q 2>/dev/null || true

        for version in 74 80 81 82 83; do
            dnf install -y -q \
                php${version}-php-fpm \
                php${version}-php-cli \
                php${version}-php-common \
                php${version}-php-mysqlnd \
                php${version}-php-pgsql \
                php${version}-php-curl \
                php${version}-php-gd \
                php${version}-php-mbstring \
                php${version}-php-xml \
                php${version}-php-zip \
                php${version}-php-bcmath \
                php${version}-php-intl \
                php${version}-php-soap \
                php${version}-php-redis \
                php${version}-php-imagick 2>/dev/null || log_warning "Some PHP $version packages not available"
        done
    fi

    # Install Composer
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

    log_success "PHP versions installed"
}

install_mariadb() {
    log_step "Installing MariaDB..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y -qq mariadb-server mariadb-client
    else
        dnf install -y -q mariadb-server mariadb
    fi

    # Start and enable MariaDB
    systemctl enable mariadb
    systemctl start mariadb

    # Generate root password
    local db_root_password=$(generate_password)

    # Secure installation
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${db_root_password}';"
    mysql -u root -p"${db_root_password}" -e "DELETE FROM mysql.user WHERE User='';"
    mysql -u root -p"${db_root_password}" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
    mysql -u root -p"${db_root_password}" -e "DROP DATABASE IF EXISTS test;"
    mysql -u root -p"${db_root_password}" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
    mysql -u root -p"${db_root_password}" -e "FLUSH PRIVILEGES;"

    # Save credentials
    echo "MARIADB_ROOT_PASSWORD=${db_root_password}" >> /root/.serverhubx-credentials
    chmod 600 /root/.serverhubx-credentials

    log_success "MariaDB installed and secured"
}

install_redis() {
    log_step "Installing Redis..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y -qq redis-server
    else
        dnf install -y -q redis
    fi

    # Configure Redis
    if [ -f /etc/redis/redis.conf ]; then
        sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
        sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    elif [ -f /etc/redis.conf ]; then
        sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis.conf
        sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis.conf
    fi

    # Enable and start Redis
    systemctl enable redis-server 2>/dev/null || systemctl enable redis
    systemctl start redis-server 2>/dev/null || systemctl start redis

    log_success "Redis installed"
}

install_bind9() {
    if [ "$SKIP_DNS" = true ]; then
        log_info "Skipping DNS server installation (--skip-dns)"
        return
    fi

    log_step "Installing Bind9 DNS server..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y -qq bind9 bind9utils bind9-doc dnsutils
    else
        dnf install -y -q bind bind-utils
    fi

    # Enable and start Bind9
    systemctl enable named 2>/dev/null || systemctl enable bind9
    systemctl start named 2>/dev/null || systemctl start bind9

    log_success "Bind9 DNS server installed"
}

install_mail() {
    if [ "$SKIP_MAIL" = true ]; then
        log_info "Skipping mail server installation (--skip-mail)"
        return
    fi

    log_step "Installing mail server (Postfix + Dovecot)..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        # Pre-configure Postfix
        debconf-set-selections <<< "postfix postfix/mailname string $(hostname -f)"
        debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"

        apt-get install -y -qq \
            postfix \
            postfix-mysql \
            dovecot-core \
            dovecot-imapd \
            dovecot-pop3d \
            dovecot-lmtpd \
            dovecot-mysql \
            dovecot-sieve \
            dovecot-managesieved \
            opendkim \
            opendkim-tools
    else
        dnf install -y -q \
            postfix \
            postfix-mysql \
            dovecot \
            dovecot-mysql \
            dovecot-pigeonhole \
            opendkim
    fi

    # Enable services
    systemctl enable postfix dovecot opendkim

    log_success "Mail server installed"
}

install_certbot() {
    log_step "Installing Certbot (Let's Encrypt)..."

    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y -qq certbot python3-certbot-apache
    else
        dnf install -y -q certbot python3-certbot-apache
    fi

    log_success "Certbot installed"
}

# ============================================================================
# Security Hardening
# ============================================================================

remove_existing_firewalls() {
    log_step "Removing existing firewalls..."

    # Stop and disable UFW
    if systemctl is-active --quiet ufw 2>/dev/null; then
        log_info "Stopping UFW..."
        systemctl stop ufw
        systemctl disable ufw
    fi

    # Remove UFW on Debian/Ubuntu
    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get purge -y -qq ufw 2>/dev/null || true
    fi

    # Stop and disable firewalld
    if systemctl is-active --quiet firewalld 2>/dev/null; then
        log_info "Stopping firewalld..."
        systemctl stop firewalld
        systemctl disable firewalld
    fi

    # Remove firewalld on RHEL
    if [ "$PKG_MANAGER" = "dnf" ]; then
        dnf remove -y -q firewalld 2>/dev/null || true
    fi

    # Clean up iptables rules
    iptables -F 2>/dev/null || true
    iptables -X 2>/dev/null || true
    iptables -t nat -F 2>/dev/null || true
    iptables -t nat -X 2>/dev/null || true

    log_success "Existing firewalls removed"
}

change_ssh_port() {
    log_step "Configuring SSH security..."

    local sshd_config="/etc/ssh/sshd_config"

    # Backup sshd_config
    cp "$sshd_config" "${sshd_config}.bak.$(date +%Y%m%d%H%M%S)"

    # Change SSH port
    sed -i "s/^#*Port .*/Port ${SSH_PORT}/" "$sshd_config"

    # Security hardening
    sed -i 's/^#*PermitRootLogin .*/PermitRootLogin prohibit-password/' "$sshd_config"
    sed -i 's/^#*PermitEmptyPasswords .*/PermitEmptyPasswords no/' "$sshd_config"
    sed -i 's/^#*PubkeyAuthentication .*/PubkeyAuthentication yes/' "$sshd_config"
    sed -i 's/^#*MaxAuthTries .*/MaxAuthTries 3/' "$sshd_config"
    sed -i 's/^#*LoginGraceTime .*/LoginGraceTime 60/' "$sshd_config"
    sed -i 's/^#*X11Forwarding .*/X11Forwarding no/' "$sshd_config"
    sed -i 's/^#*AllowTcpForwarding .*/AllowTcpForwarding no/' "$sshd_config"

    # Validate config
    if ! sshd -t; then
        log_error "Invalid SSH configuration. Restoring backup..."
        cp "${sshd_config}.bak."* "$sshd_config"
        return 1
    fi

    # Restart SSH
    systemctl restart sshd

    log_success "SSH configured on port ${SSH_PORT}"
}

install_csf() {
    log_step "Installing CSF (ConfigServer Security & Firewall)..."

    # Install Perl dependencies
    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y -qq \
            libwww-perl \
            libgd-graph-perl \
            libio-socket-ssl-perl \
            libcrypt-ssleay-perl \
            libnet-libidn-perl \
            libio-socket-inet6-perl \
            libsocket6-perl \
            libcrypt-openssl-rsa-perl \
            libdigest-sha-perl
    else
        dnf install -y -q \
            perl-libwww-perl \
            perl-GD \
            perl-IO-Socket-SSL \
            perl-Net-SSLeay \
            perl-Net-LibIDN \
            perl-IO-Socket-INET6 \
            perl-Socket6 \
            perl-Crypt-OpenSSL-RSA
    fi

    # Download and install CSF
    cd /tmp
    rm -rf csf csf.tgz
    wget -q https://download.configserver.com/csf.tgz
    tar -xzf csf.tgz
    cd csf
    sh install.sh > /dev/null 2>&1
    cd /
    rm -rf /tmp/csf /tmp/csf.tgz

    log_success "CSF installed"
}

configure_csf() {
    log_step "Configuring CSF firewall..."

    local csf_conf="/etc/csf/csf.conf"

    # Disable testing mode
    sed -i 's/^TESTING = "1"/TESTING = "0"/' "$csf_conf"

    # Configure allowed ports
    local tcp_in="${SSH_PORT},80,443,25,465,587,110,995,143,993,53,${SERVERHUBX_PORT}"
    local tcp_out="${SSH_PORT},80,443,25,465,587,110,995,143,993,53,113"
    local udp_in="53"
    local udp_out="53,113,123"

    sed -i "s/^TCP_IN = .*/TCP_IN = \"${tcp_in}\"/" "$csf_conf"
    sed -i "s/^TCP_OUT = .*/TCP_OUT = \"${tcp_out}\"/" "$csf_conf"
    sed -i "s/^UDP_IN = .*/UDP_IN = \"${udp_in}\"/" "$csf_conf"
    sed -i "s/^UDP_OUT = .*/UDP_OUT = \"${udp_out}\"/" "$csf_conf"

    # Enable ICMP
    sed -i 's/^ICMP_IN = .*/ICMP_IN = "1"/' "$csf_conf"

    # SYN flood protection
    sed -i 's/^SYNFLOOD = .*/SYNFLOOD = "1"/' "$csf_conf"
    sed -i 's/^SYNFLOOD_RATE = .*/SYNFLOOD_RATE = "100\/s"/' "$csf_conf"
    sed -i 's/^SYNFLOOD_BURST = .*/SYNFLOOD_BURST = "150"/' "$csf_conf"

    # Connection limits
    sed -i 's/^CONNLIMIT = .*/CONNLIMIT = "22;5,80;50,443;50"/' "$csf_conf"
    sed -i 's/^PORTFLOOD = .*/PORTFLOOD = "22;tcp;5;300,80;tcp;20;5,443;tcp;20;5"/' "$csf_conf"

    # Connection tracking
    sed -i 's/^CT_LIMIT = .*/CT_LIMIT = "300"/' "$csf_conf"
    sed -i 's/^CT_INTERVAL = .*/CT_INTERVAL = "30"/' "$csf_conf"

    # Restrict syslog
    sed -i 's/^RESTRICT_SYSLOG = .*/RESTRICT_SYSLOG = "3"/' "$csf_conf"

    log_success "CSF configured"
}

configure_lfd() {
    log_step "Configuring LFD (Login Failure Daemon)..."

    local csf_conf="/etc/csf/csf.conf"

    # Login failure settings
    sed -i 's/^LF_TRIGGER = .*/LF_TRIGGER = "5"/' "$csf_conf"
    sed -i 's/^LF_TRIGGER_PERM = .*/LF_TRIGGER_PERM = "1"/' "$csf_conf"
    sed -i 's/^LF_SSHD = .*/LF_SSHD = "5"/' "$csf_conf"
    sed -i 's/^LF_FTPD = .*/LF_FTPD = "10"/' "$csf_conf"
    sed -i 's/^LF_SMTPAUTH = .*/LF_SMTPAUTH = "5"/' "$csf_conf"
    sed -i 's/^LF_POP3D = .*/LF_POP3D = "10"/' "$csf_conf"
    sed -i 's/^LF_IMAPD = .*/LF_IMAPD = "10"/' "$csf_conf"
    sed -i 's/^LF_HTACCESS = .*/LF_HTACCESS = "5"/' "$csf_conf"
    sed -i 's/^LF_MODSEC = .*/LF_MODSEC = "5"/' "$csf_conf"

    # Port scan protection
    sed -i 's/^PS_INTERVAL = .*/PS_INTERVAL = "300"/' "$csf_conf"
    sed -i 's/^PS_LIMIT = .*/PS_LIMIT = "10"/' "$csf_conf"

    # File integrity
    sed -i 's/^LF_INTEGRITY = .*/LF_INTEGRITY = "3600"/' "$csf_conf"

    # Distributed attack protection
    sed -i 's/^LF_DISTATTACK = .*/LF_DISTATTACK = "1"/' "$csf_conf"
    sed -i 's/^LF_DISTFTP = .*/LF_DISTFTP = "1"/' "$csf_conf"

    log_success "LFD configured"
}

start_csf() {
    log_step "Starting CSF firewall..."

    # Whitelist server IP and localhost
    SERVER_IP=$(get_server_ip)
    echo "$SERVER_IP # Server IP" >> /etc/csf/csf.allow
    echo "127.0.0.1 # Localhost" >> /etc/csf/csf.allow
    echo "::1 # Localhost IPv6" >> /etc/csf/csf.allow

    # Start CSF and LFD
    csf -s > /dev/null 2>&1
    systemctl enable csf lfd
    systemctl start lfd

    # Run CSF check
    perl /usr/local/csf/bin/csftest.pl > /dev/null 2>&1 || log_warning "Some CSF features may not be available"

    log_success "CSF firewall started"
}

secure_kernel_params() {
    log_step "Configuring kernel security parameters..."

    cat > /etc/sysctl.d/99-serverhubx-security.conf << 'EOF'
# Network security
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_timestamps = 0
net.ipv4.conf.all.log_martians = 1

# Kernel security
kernel.randomize_va_space = 2
EOF

    sysctl -p /etc/sysctl.d/99-serverhubx-security.conf > /dev/null 2>&1

    log_success "Kernel security parameters configured"
}

# ============================================================================
# ServerHubX Setup
# ============================================================================

create_serverhubx_user() {
    log_step "Creating ServerHubX system user..."

    if ! id "$SERVERHUBX_USER" &>/dev/null; then
        useradd -r -m -d "$SERVERHUBX_HOME" -s /bin/bash "$SERVERHUBX_USER"
    fi

    log_success "User $SERVERHUBX_USER created"
}

setup_sudo_rules() {
    log_step "Configuring sudo rules..."

    cat > /etc/sudoers.d/serverhubx << 'EOF'
# ServerHubX sudo rules
# Allow the serverhubx user to run specific commands without password

Cmnd_Alias SERVERHUBX_CMDS = \
    /usr/sbin/useradd, \
    /usr/sbin/userdel, \
    /usr/sbin/usermod, \
    /usr/sbin/groupadd, \
    /usr/sbin/groupdel, \
    /usr/bin/chpasswd, \
    /usr/bin/passwd, \
    /usr/bin/chown, \
    /usr/bin/chmod, \
    /usr/bin/mkdir, \
    /usr/bin/rm, \
    /usr/bin/cp, \
    /usr/bin/mv, \
    /usr/bin/ln, \
    /usr/bin/setfacl, \
    /usr/sbin/a2ensite, \
    /usr/sbin/a2dissite, \
    /usr/sbin/a2enmod, \
    /usr/sbin/a2dismod, \
    /usr/sbin/apachectl, \
    /usr/bin/systemctl, \
    /usr/sbin/service, \
    /usr/bin/certbot, \
    /usr/local/bin/pm2, \
    /usr/sbin/csf, \
    /usr/sbin/lfd, \
    /usr/sbin/rndc, \
    /usr/sbin/named-checkzone, \
    /usr/sbin/named-checkconf, \
    /usr/bin/postmap, \
    /usr/sbin/postfix, \
    /usr/bin/doveadm, \
    /usr/bin/mysql, \
    /usr/bin/mysqldump, \
    /usr/bin/tar, \
    /usr/bin/gzip, \
    /usr/bin/gunzip, \
    /usr/bin/crontab, \
    /usr/bin/quota, \
    /usr/sbin/setquota, \
    /usr/sbin/repquota, \
    /usr/bin/git, \
    /usr/bin/npm, \
    /usr/bin/node, \
    /usr/local/bin/composer

serverhubx ALL=(ALL) NOPASSWD: SERVERHUBX_CMDS
EOF

    chmod 440 /etc/sudoers.d/serverhubx

    log_success "Sudo rules configured"
}

install_serverhubx() {
    log_step "Installing ServerHubX application..."

    if [ "$DEV_MODE" = true ]; then
        # For development, use local directory
        log_info "Development mode: using current directory"
    else
        # Clone repository
        git clone "$SERVERHUBX_REPO" "$SERVERHUBX_HOME" 2>/dev/null || {
            log_warning "Could not clone repository. Please manually install ServerHubX."
            return 1
        }
    fi

    cd "$SERVERHUBX_HOME"

    # Install backend dependencies
    if [ -d "backend" ]; then
        cd backend
        npm ci --silent
        npm run build --silent
        cd ..
    fi

    # Install frontend dependencies
    if [ -d "frontend" ]; then
        cd frontend
        npm ci --silent
        npm run build --silent
        cd ..
    fi

    # Set ownership
    chown -R "$SERVERHUBX_USER:$SERVERHUBX_USER" "$SERVERHUBX_HOME"

    log_success "ServerHubX installed"
}

create_database() {
    log_step "Creating ServerHubX database..."

    local db_password=$(generate_password)
    local db_root_password=$(grep MARIADB_ROOT_PASSWORD /root/.serverhubx-credentials | cut -d= -f2)

    mysql -u root -p"${db_root_password}" << EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${db_password}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

    # Save database credentials
    echo "SERVERHUBX_DB_NAME=${DB_NAME}" >> /root/.serverhubx-credentials
    echo "SERVERHUBX_DB_USER=${DB_USER}" >> /root/.serverhubx-credentials
    echo "SERVERHUBX_DB_PASSWORD=${db_password}" >> /root/.serverhubx-credentials

    log_success "Database created"
}

create_env_file() {
    log_step "Creating environment configuration..."

    local db_password=$(grep SERVERHUBX_DB_PASSWORD /root/.serverhubx-credentials | cut -d= -f2)
    local jwt_secret=$(generate_password)
    local encryption_key=$(openssl rand -hex 32)

    cat > "${SERVERHUBX_HOME}/backend/.env" << EOF
# ServerHubX Environment Configuration
# Generated on $(date)

NODE_ENV=production
PORT=${SERVERHUBX_PORT}

# Database
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=${DB_NAME}
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${db_password}

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=${encryption_key}

# Server
SERVER_IP=$(get_server_ip)
SSH_PORT=${SSH_PORT}
EOF

    chown "$SERVERHUBX_USER:$SERVERHUBX_USER" "${SERVERHUBX_HOME}/backend/.env"
    chmod 600 "${SERVERHUBX_HOME}/backend/.env"

    log_success "Environment configuration created"
}

create_systemd_service() {
    log_step "Creating systemd service..."

    cat > /etc/systemd/system/serverhubx.service << EOF
[Unit]
Description=ServerHubX Hosting Control Panel
After=network.target mariadb.service redis.service

[Service]
Type=simple
User=${SERVERHUBX_USER}
WorkingDirectory=${SERVERHUBX_HOME}/backend
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable serverhubx

    log_success "Systemd service created"
}

generate_ssl_cert() {
    log_step "Generating self-signed SSL certificate..."

    local ssl_dir="${SERVERHUBX_HOME}/ssl"
    mkdir -p "$ssl_dir"

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${ssl_dir}/server.key" \
        -out "${ssl_dir}/server.crt" \
        -subj "/CN=$(hostname -f)/O=ServerHubX/C=US" 2>/dev/null

    chown -R "$SERVERHUBX_USER:$SERVERHUBX_USER" "$ssl_dir"
    chmod 600 "${ssl_dir}/server.key"

    log_success "SSL certificate generated"
}

create_admin_user() {
    log_step "Creating admin user..."

    local admin_password=$(generate_password)

    # Save admin credentials
    echo "SERVERHUBX_ADMIN_EMAIL=admin@localhost" >> /root/.serverhubx-credentials
    echo "SERVERHUBX_ADMIN_PASSWORD=${admin_password}" >> /root/.serverhubx-credentials

    # The actual user will be created when the app starts via seed
    echo "${admin_password}" > "${SERVERHUBX_HOME}/.admin-password"
    chown "$SERVERHUBX_USER:$SERVERHUBX_USER" "${SERVERHUBX_HOME}/.admin-password"
    chmod 600 "${SERVERHUBX_HOME}/.admin-password"

    log_success "Admin credentials generated"
}

start_serverhubx() {
    log_step "Starting ServerHubX..."

    # Start all services
    systemctl restart apache2 2>/dev/null || systemctl restart httpd
    systemctl start serverhubx

    # Wait for service to start
    sleep 5

    if systemctl is-active --quiet serverhubx; then
        log_success "ServerHubX started successfully"
    else
        log_error "ServerHubX failed to start. Check logs: journalctl -u serverhubx"
    fi
}

# ============================================================================
# Post-Installation
# ============================================================================

show_dns_instructions() {
    SERVER_IP=$(get_server_ip)

    cat > /root/.serverhubx-dns-setup.txt << EOF
================================================================================
                        DNS Configuration Instructions
================================================================================

Before adding domains to ServerHubX, configure your DNS with wildcard records.

Required DNS Records (at your domain registrar):
--------------------------------------------------------------------------------
| Type | Host/Name | Value           | TTL  |
|------|-----------|-----------------|------|
| A    | @         | ${SERVER_IP}    | 3600 |
| A    | *         | ${SERVER_IP}    | 3600 |
--------------------------------------------------------------------------------

This wildcard configuration enables:
  - yourdomain.com      -> Main domain
  - www.yourdomain.com  -> Automatically works
  - app.yourdomain.com  -> Any subdomain works
  - api.yourdomain.com  -> Any subdomain works

Verification Commands:
  dig +short yourdomain.com
  dig +short test.yourdomain.com

Both should return: ${SERVER_IP}

Note: DNS changes may take up to 48 hours to propagate.

================================================================================
EOF
}

print_summary() {
    SERVER_IP=$(get_server_ip)
    local admin_password=$(grep SERVERHUBX_ADMIN_PASSWORD /root/.serverhubx-credentials | cut -d= -f2)

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║              ServerHubX Installation Complete!                   ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Dashboard Access:${NC}"
    echo -e "  URL:      ${CYAN}https://${SERVER_IP}:${SERVERHUBX_PORT}${NC}"
    echo -e "  Email:    ${CYAN}admin@localhost${NC}"
    echo -e "  Password: ${CYAN}${admin_password}${NC}"
    echo ""
    echo -e "${BOLD}${RED}IMPORTANT - SSH Port Changed!${NC}"
    echo -e "  New SSH Command: ${YELLOW}ssh -p ${SSH_PORT} root@${SERVER_IP}${NC}"
    echo ""
    echo -e "${BOLD}Credentials saved to:${NC}"
    echo -e "  ${CYAN}/root/.serverhubx-credentials${NC}"
    echo ""
    echo -e "${BOLD}DNS Setup Instructions:${NC}"
    echo -e "  ${CYAN}/root/.serverhubx-dns-setup.txt${NC}"
    echo ""
    echo -e "${BOLD}Services Installed:${NC}"
    echo -e "  - Apache Web Server"
    echo -e "  - PHP 7.4, 8.0, 8.1, 8.2, 8.3"
    echo -e "  - Node.js $(node -v) with PM2"
    echo -e "  - MariaDB Database"
    echo -e "  - Redis Cache"
    echo -e "  - CSF Firewall"
    [ "$SKIP_DNS" = false ] && echo -e "  - Bind9 DNS Server"
    [ "$SKIP_MAIL" = false ] && echo -e "  - Postfix + Dovecot Mail Server"
    echo -e "  - Let's Encrypt (Certbot)"
    echo ""
    echo -e "${BOLD}Firewall Status:${NC}"
    csf -l 2>/dev/null | head -5 || echo "  CSF is running"
    echo ""
    echo -e "${BOLD}Open Ports:${NC}"
    echo -e "  TCP IN:  ${SSH_PORT}, 80, 443, ${SERVERHUBX_PORT}"
    [ "$SKIP_MAIL" = false ] && echo -e "  Mail:    25, 465, 587, 110, 995, 143, 993"
    [ "$SKIP_DNS" = false ] && echo -e "  DNS:     53 (TCP/UDP)"
    echo ""
    echo -e "${YELLOW}Remember to configure your domain's DNS records!${NC}"
    echo -e "See: /root/.serverhubx-dns-setup.txt"
    echo ""
}

# ============================================================================
# Main Installation
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --minimal)
                MINIMAL=true
                SKIP_MAIL=true
                SKIP_DNS=true
                shift
                ;;
            --skip-mail)
                SKIP_MAIL=true
                shift
                ;;
            --skip-dns)
                SKIP_DNS=true
                shift
                ;;
            --unattended)
                UNATTENDED=true
                shift
                ;;
            --dev)
                DEV_MODE=true
                shift
                ;;
            --help|-h)
                echo "ServerHubX Installer"
                echo ""
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --minimal      Skip optional components (mail, dns)"
                echo "  --skip-mail    Skip mail server installation"
                echo "  --skip-dns     Skip DNS server installation"
                echo "  --unattended   Non-interactive mode with defaults"
                echo "  --dev          Development mode"
                echo "  --help         Show this help"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

main() {
    parse_args "$@"

    print_banner

    log_step "Pre-Installation Checks"
    check_root
    check_os
    check_resources
    check_existing_services

    if ! confirm "Continue with installation?"; then
        exit 0
    fi

    # Install packages
    install_prereqs
    install_nodejs
    install_apache
    install_php
    install_mariadb
    install_redis
    install_bind9
    install_mail
    install_certbot

    # Security hardening
    remove_existing_firewalls
    change_ssh_port
    install_csf
    configure_csf
    configure_lfd
    start_csf
    secure_kernel_params

    # ServerHubX setup
    create_serverhubx_user
    setup_sudo_rules
    create_database
    install_serverhubx
    create_env_file
    create_systemd_service
    generate_ssl_cert
    create_admin_user
    start_serverhubx

    # Post-installation
    show_dns_instructions
    print_summary
}

main "$@"
