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

# Don't use set -e as we want to continue on errors and show summary
# set -e

# Track installation status
INSTALL_ERRORS=0

# ============================================================================
# Configuration
# ============================================================================

SERVERHUBX_VERSION="1.0.0"
SERVERHUBX_USER="serverhubx"
SERVERHUBX_HOME="/opt/serverhubx"
SERVERHUBX_PORT="${SERVERHUBX_PORT:-3000}"
SERVERHUBX_REPO="https://github.com/Rahul-C-S/ServerHubX.git"

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
    if [ "$total_ram" -lt 512 ]; then
        log_error "Insufficient RAM: ${total_ram}MB (minimum 512MB required)"
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
        # Determine the correct codename for PHP repository
        local codename=$(lsb_release -sc 2>/dev/null || echo "unknown")
        local php_codename="$codename"

        # Map unsupported Ubuntu versions to nearest supported LTS
        # Ondrej PPA supports: focal (20.04), jammy (22.04), noble (24.04)
        case "$codename" in
            noble|jammy|focal)
                # Supported versions, use as-is
                php_codename="$codename"
                ;;
            *)
                # Unsupported version - map based on version number
                if [[ "$OS_ID" == "ubuntu" ]]; then
                    local version_major=$(echo "$OS_VERSION" | cut -d. -f1)
                    if [[ "$version_major" -ge 25 ]]; then
                        php_codename="noble"
                        log_info "Ubuntu $OS_VERSION ($codename) detected, using PHP repository for noble (24.04)"
                    elif [[ "$version_major" -ge 23 ]]; then
                        php_codename="jammy"
                        log_info "Ubuntu $OS_VERSION ($codename) detected, using PHP repository for jammy (22.04)"
                    elif [[ "$version_major" -ge 21 ]]; then
                        php_codename="focal"
                        log_info "Ubuntu $OS_VERSION ($codename) detected, using PHP repository for focal (20.04)"
                    else
                        php_codename="focal"
                        log_warning "Ubuntu $OS_VERSION may not be fully supported, trying focal repository"
                    fi
                fi
                ;;
        esac

        if [ "$OS_ID" = "ubuntu" ]; then
            # For Ubuntu, manually add ondrej/php with correct codename
            log_info "Adding ondrej/php repository for $php_codename..."

            # Remove any existing ondrej/php sources (from previous add-apt-repository runs)
            # This includes both old .list format and new DEB822 .sources format
            log_info "Cleaning up any existing PHP repository configurations..."
            rm -f /etc/apt/sources.list.d/ondrej-*.list 2>/dev/null || true
            rm -f /etc/apt/sources.list.d/ondrej-*.sources 2>/dev/null || true
            rm -f /etc/apt/sources.list.d/*ondrej*.list 2>/dev/null || true
            rm -f /etc/apt/sources.list.d/*ondrej*.sources 2>/dev/null || true
            rm -f /etc/apt/sources.list.d/ondrej-ubuntu-php-*.list 2>/dev/null || true
            rm -f /etc/apt/sources.list.d/ondrej-ubuntu-php-*.sources 2>/dev/null || true
            # Also check for ppa format naming
            rm -f /etc/apt/sources.list.d/ppa_ondrej_php*.list 2>/dev/null || true
            rm -f /etc/apt/sources.list.d/ppa_ondrej_php*.sources 2>/dev/null || true

            # Add GPG key using multiple methods for reliability
            mkdir -p /usr/share/keyrings
            local gpg_key_added=false

            # Method 1: Direct download from Launchpad
            if curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14aa40ec0831756756d7f66c4f4ea0aae5267a6c" 2>/dev/null | gpg --batch --yes --dearmor -o /usr/share/keyrings/ondrej-php.gpg 2>/dev/null; then
                gpg_key_added=true
                log_info "GPG key added via keyserver"
            fi

            # Method 2: Try apt-key as fallback (deprecated but reliable)
            if [ "$gpg_key_added" = false ]; then
                if apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 4F4EA0AAE5267A6C 2>/dev/null; then
                    gpg_key_added=true
                    log_info "GPG key added via apt-key"
                    # Use without signed-by since key is in apt-key
                    echo "deb https://ppa.launchpadcontent.net/ondrej/php/ubuntu ${php_codename} main" > /etc/apt/sources.list.d/ondrej-php.list
                fi
            fi

            # Method 3: Download key from PPA directly
            if [ "$gpg_key_added" = false ]; then
                log_info "Trying alternative GPG key source..."
                curl -fsSL "https://packages.sury.org/php/apt.gpg" 2>/dev/null | gpg --batch --yes --dearmor -o /usr/share/keyrings/ondrej-php.gpg 2>/dev/null && gpg_key_added=true
            fi

            if [ "$gpg_key_added" = false ]; then
                log_error "Failed to add GPG key for PHP repository"
                log_info "Attempting installation without GPG verification..."
            fi

            # Add repository with correct codename (only if not already added by apt-key method)
            if [ ! -f /etc/apt/sources.list.d/ondrej-php.list ]; then
                echo "deb [signed-by=/usr/share/keyrings/ondrej-php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu ${php_codename} main" > /etc/apt/sources.list.d/ondrej-php.list
            fi

            # Update apt and show any errors
            log_info "Updating package lists..."
            if ! apt-get update 2>&1 | grep -i "err\|failed"; then
                log_success "Repository configured successfully"
            else
                log_warning "Repository update had issues, attempting to continue..."
            fi
        else
            # For Debian, add sury.org repository
            curl -sSL https://packages.sury.org/php/apt.gpg | gpg --dearmor -o /usr/share/keyrings/sury-php.gpg
            echo "deb [signed-by=/usr/share/keyrings/sury-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/sury-php.list
            apt-get update -qq
        fi

        local php_installed=false

        # Try installing PHP versions from ondrej PPA
        for version in 8.3 8.2 8.1 8.0 7.4; do
            log_info "Attempting to install PHP $version..."
            if apt-get install -y \
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
                php${version}-soap 2>&1; then
                log_success "PHP $version installed successfully"
                php_installed=true
                # Try optional extensions separately (they may not exist)
                apt-get install -y php${version}-redis php${version}-imagick 2>/dev/null || true
            else
                log_warning "PHP $version installation failed"
            fi
        done

        # Fallback: Try Ubuntu's native PHP packages if ondrej PPA failed
        if [ "$php_installed" = false ]; then
            log_warning "Ondrej PPA packages not available. Trying system PHP packages..."

            # Remove ondrej sources and try native packages
            rm -f /etc/apt/sources.list.d/ondrej-php.list 2>/dev/null || true
            apt-get update -qq

            if apt-get install -y \
                php-fpm \
                php-cli \
                php-common \
                php-mysql \
                php-pgsql \
                php-curl \
                php-gd \
                php-mbstring \
                php-xml \
                php-zip \
                php-bcmath \
                php-intl 2>&1; then
                log_success "System PHP packages installed"
                php_installed=true
                apt-get install -y php-redis php-imagick 2>/dev/null || true
            fi
        fi

        # Verify PHP is installed
        if command -v php &>/dev/null; then
            log_success "PHP $(php -v | head -1 | cut -d' ' -f2) is available"
        else
            log_error "PHP installation failed completely."
            log_info "Manual installation required. Try: apt-get install php-fpm php-cli"
        fi

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

    # Install Composer (only if PHP is available)
    if command -v php &>/dev/null; then
        log_info "Installing Composer..."
        curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer 2>/dev/null || {
            log_warning "Composer installation failed. You can install it manually later."
        }
        log_success "PHP versions installed"
    else
        log_warning "PHP not found. Composer installation skipped."
        log_warning "PHP installation may have failed. Please check and install PHP manually."
    fi
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
    log_step "Removing existing firewalls (UFW, firewalld, nftables)..."

    # Stop and disable UFW
    if command -v ufw &>/dev/null; then
        log_info "Disabling UFW..."
        ufw disable 2>/dev/null || true
        systemctl stop ufw 2>/dev/null || true
        systemctl disable ufw 2>/dev/null || true
    fi

    # Remove UFW on Debian/Ubuntu
    if [ "$PKG_MANAGER" = "apt" ]; then
        log_info "Removing UFW package..."
        apt-get purge -y ufw 2>/dev/null || true
        apt-get autoremove -y 2>/dev/null || true
    fi

    # Stop and disable firewalld
    if command -v firewall-cmd &>/dev/null || systemctl list-unit-files | grep -q firewalld; then
        log_info "Disabling firewalld..."
        systemctl stop firewalld 2>/dev/null || true
        systemctl disable firewalld 2>/dev/null || true
        systemctl mask firewalld 2>/dev/null || true
    fi

    # Remove firewalld
    if [ "$PKG_MANAGER" = "dnf" ]; then
        dnf remove -y firewalld 2>/dev/null || true
    elif [ "$PKG_MANAGER" = "apt" ]; then
        apt-get purge -y firewalld 2>/dev/null || true
    fi

    # Stop and disable nftables (Ubuntu 22.04+ default)
    if systemctl is-active --quiet nftables 2>/dev/null; then
        log_info "Disabling nftables..."
        systemctl stop nftables 2>/dev/null || true
        systemctl disable nftables 2>/dev/null || true
    fi

    # Clean up iptables rules
    log_info "Flushing iptables rules..."
    iptables -F 2>/dev/null || true
    iptables -X 2>/dev/null || true
    iptables -t nat -F 2>/dev/null || true
    iptables -t nat -X 2>/dev/null || true
    iptables -t mangle -F 2>/dev/null || true
    iptables -t mangle -X 2>/dev/null || true
    iptables -P INPUT ACCEPT 2>/dev/null || true
    iptables -P FORWARD ACCEPT 2>/dev/null || true
    iptables -P OUTPUT ACCEPT 2>/dev/null || true

    # Clean up ip6tables rules
    ip6tables -F 2>/dev/null || true
    ip6tables -X 2>/dev/null || true
    ip6tables -P INPUT ACCEPT 2>/dev/null || true
    ip6tables -P FORWARD ACCEPT 2>/dev/null || true
    ip6tables -P OUTPUT ACCEPT 2>/dev/null || true

    # Flush nftables if present
    if command -v nft &>/dev/null; then
        nft flush ruleset 2>/dev/null || true
    fi

    log_success "Existing firewalls removed and rules flushed"
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
    log_info "Installing Perl dependencies..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        apt-get install -y \
            perl \
            libwww-perl \
            libgd-graph-perl \
            libio-socket-ssl-perl \
            libcrypt-ssleay-perl \
            libnet-libidn-perl \
            libio-socket-inet6-perl \
            libsocket6-perl \
            libcrypt-openssl-rsa-perl \
            libdigest-sha-perl \
            iptables \
            ipset 2>&1 || log_warning "Some Perl dependencies may be missing"
    else
        dnf install -y \
            perl \
            perl-libwww-perl \
            perl-GD \
            perl-IO-Socket-SSL \
            perl-Net-SSLeay \
            perl-Net-LibIDN \
            perl-IO-Socket-INET6 \
            perl-Socket6 \
            perl-Crypt-OpenSSL-RSA \
            iptables \
            ipset 2>&1 || log_warning "Some Perl dependencies may be missing"
    fi

    # Download and install CSF
    log_info "Downloading CSF from configserver.com..."
    cd /tmp
    rm -rf csf csf.tgz

    # Check DNS resolution first
    if ! host download.configserver.com &>/dev/null && ! nslookup download.configserver.com &>/dev/null; then
        log_warning "DNS resolution failed for download.configserver.com"
        log_info "Trying to resolve via Google DNS..."
    fi

    # Try wget first, then curl as fallback
    local download_success=false
    log_info "Attempting download with wget..."
    if wget --timeout=60 --tries=3 -O csf.tgz https://download.configserver.com/csf.tgz 2>&1; then
        download_success=true
        log_info "wget download successful"
    else
        log_warning "wget failed, trying curl..."
        if curl -fSL --connect-timeout 60 --retry 3 -o csf.tgz https://download.configserver.com/csf.tgz 2>&1; then
            download_success=true
            log_info "curl download successful"
        fi
    fi

    if [ "$download_success" = false ] || [ ! -s csf.tgz ]; then
        log_error "Failed to download CSF from configserver.com"
        log_info "Trying alternative mirror..."
        # Try alternative download
        if curl -fsSL -o csf.tgz "https://github.com/ConfigServer/csf/archive/refs/heads/master.zip" 2>&1; then
            log_warning "Downloaded from GitHub mirror - may need manual extraction"
        else
            log_error "All download methods failed. Please check internet connectivity."
            log_info "You can manually download CSF from: https://download.configserver.com/csf.tgz"
            return 1
        fi
    fi

    # Verify download
    if [ ! -s csf.tgz ]; then
        log_error "Downloaded file is empty"
        return 1
    fi
    log_success "CSF downloaded successfully"

    log_info "Extracting CSF..."
    if ! tar -xzf csf.tgz; then
        log_error "Failed to extract CSF"
        return 1
    fi

    log_info "Running CSF installer..."
    cd csf
    if sh install.sh; then
        log_success "CSF installed successfully"
    else
        log_error "CSF installation failed"
        cd /
        rm -rf /tmp/csf /tmp/csf.tgz
        return 1
    fi

    cd /
    rm -rf /tmp/csf /tmp/csf.tgz

    # Verify CSF is installed
    if command -v csf &>/dev/null; then
        log_success "CSF $(csf -v 2>&1 | head -1) installed"
    else
        log_error "CSF command not found after installation"
        return 1
    fi
}

configure_csf() {
    log_step "Configuring CSF firewall..."

    local csf_conf="/etc/csf/csf.conf"

    # Check if CSF config exists
    if [ ! -f "$csf_conf" ]; then
        log_warning "CSF config not found at $csf_conf - skipping configuration"
        return 1
    fi

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

    # Check if CSF config exists
    if [ ! -f "$csf_conf" ]; then
        log_warning "CSF config not found - skipping LFD configuration"
        return 1
    fi

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

    # Verify CSF is installed
    if ! command -v csf &>/dev/null; then
        log_error "CSF is not installed. Skipping firewall start."
        return 1
    fi

    # Whitelist server IP and localhost
    log_info "Whitelisting server IP and localhost..."
    SERVER_IP=$(get_server_ip)

    # Clear any duplicate entries first
    grep -v "# Server IP\|# Localhost" /etc/csf/csf.allow > /etc/csf/csf.allow.tmp 2>/dev/null || true
    mv /etc/csf/csf.allow.tmp /etc/csf/csf.allow 2>/dev/null || true

    echo "$SERVER_IP # Server IP" >> /etc/csf/csf.allow
    echo "127.0.0.1 # Localhost" >> /etc/csf/csf.allow
    echo "::1 # Localhost IPv6" >> /etc/csf/csf.allow
    log_info "Whitelisted: $SERVER_IP"

    # Enable CSF and LFD services
    log_info "Enabling CSF and LFD services..."
    systemctl enable csf lfd 2>&1 || true

    # Start CSF
    log_info "Starting CSF firewall..."
    if csf -s 2>&1; then
        log_success "CSF firewall started"
    else
        log_warning "CSF start had warnings, checking status..."
    fi

    # Start LFD
    log_info "Starting LFD daemon..."
    systemctl start lfd 2>&1 || true

    # Run CSF compatibility check
    log_info "Running CSF compatibility check..."
    if perl /usr/local/csf/bin/csftest.pl 2>&1 | grep -q "FATAL"; then
        log_warning "CSF has compatibility issues. Some features may not work."
    else
        log_success "CSF compatibility check passed"
    fi

    # Show CSF status
    log_info "CSF Status:"
    csf -l 2>&1 | head -10 || true

    log_success "CSF firewall is active"
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

    local app_installed=false

    if [ "$DEV_MODE" = true ]; then
        # For development, copy from current directory to SERVERHUBX_HOME
        log_info "Development mode: copying from current directory..."
        local current_dir=$(pwd)

        # Check if we're in a directory with backend/frontend
        if [ -d "$current_dir/backend" ] || [ -d "$current_dir/frontend" ]; then
            mkdir -p "$SERVERHUBX_HOME"
            cp -r "$current_dir"/* "$SERVERHUBX_HOME"/ 2>/dev/null || true
            cp -r "$current_dir"/.* "$SERVERHUBX_HOME"/ 2>/dev/null || true
            app_installed=true
            log_info "Copied local files to $SERVERHUBX_HOME"
        else
            log_warning "No backend/frontend found in current directory"
        fi
    else
        # Clone repository
        log_info "Cloning ServerHubX repository..."
        if git clone "$SERVERHUBX_REPO" "$SERVERHUBX_HOME" 2>&1; then
            app_installed=true
            log_success "Repository cloned successfully"
        else
            log_warning "Could not clone repository from $SERVERHUBX_REPO"
        fi
    fi

    # If no app was installed, create directory structure for manual installation
    if [ "$app_installed" = false ]; then
        log_warning "ServerHubX application not installed automatically."
        log_info "Creating directory structure for manual installation..."
        mkdir -p "$SERVERHUBX_HOME"/{backend,frontend}
        echo "# Place ServerHubX backend files here" > "$SERVERHUBX_HOME/backend/README.md"
        echo "# Place ServerHubX frontend files here" > "$SERVERHUBX_HOME/frontend/README.md"
        chown -R "$SERVERHUBX_USER:$SERVERHUBX_USER" "$SERVERHUBX_HOME"
        log_info "Please manually install ServerHubX to: $SERVERHUBX_HOME"
        return 0
    fi

    cd "$SERVERHUBX_HOME"

    # Install backend dependencies
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        log_info "Installing backend dependencies..."
        cd backend
        npm ci 2>&1 || npm install 2>&1 || log_warning "Backend npm install failed"
        if [ -f "package.json" ] && grep -q '"build"' package.json; then
            log_info "Building backend..."
            npm run build 2>&1 || log_warning "Backend build failed"
        fi
        cd ..
    else
        log_warning "No backend/package.json found"
    fi

    # Install frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm ci 2>&1 || npm install 2>&1 || log_warning "Frontend npm install failed"
        if [ -f "package.json" ] && grep -q '"build"' package.json; then
            log_info "Building frontend..."
            npm run build 2>&1 || log_warning "Frontend build failed"
        fi
        cd ..
    else
        log_warning "No frontend/package.json found"
    fi

    # Set ownership
    chown -R "$SERVERHUBX_USER:$SERVERHUBX_USER" "$SERVERHUBX_HOME"

    log_success "ServerHubX installed to $SERVERHUBX_HOME"
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

    # Start Apache
    systemctl restart apache2 2>/dev/null || systemctl restart httpd 2>/dev/null || true

    # Check if the application is actually installed
    if [ ! -f "${SERVERHUBX_HOME}/backend/dist/main.js" ]; then
        log_warning "ServerHubX backend not found at ${SERVERHUBX_HOME}/backend/dist/main.js"
        log_warning "The application needs to be installed manually."
        log_info ""
        log_info "To install ServerHubX manually:"
        log_info "  1. Clone/copy the ServerHubX code to ${SERVERHUBX_HOME}"
        log_info "  2. cd ${SERVERHUBX_HOME}/backend && npm install && npm run build"
        log_info "  3. cd ${SERVERHUBX_HOME}/frontend && npm install && npm run build"
        log_info "  4. systemctl start serverhubx"
        log_info ""

        # Disable the service so it doesn't keep failing
        systemctl disable serverhubx 2>/dev/null || true
        return 1
    fi

    # Start ServerHubX
    log_info "Starting ServerHubX service..."
    systemctl start serverhubx

    # Wait for service to start
    sleep 5

    if systemctl is-active --quiet serverhubx; then
        log_success "ServerHubX started successfully"
    else
        log_error "ServerHubX failed to start. Check logs: journalctl -u serverhubx"
        log_info "You can try manually: cd ${SERVERHUBX_HOME}/backend && node dist/main.js"
        return 1
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

    # Get admin password (may not exist if installation failed early)
    local admin_password="(not generated)"
    if [ -f /root/.serverhubx-credentials ]; then
        admin_password=$(grep SERVERHUBX_ADMIN_PASSWORD /root/.serverhubx-credentials 2>/dev/null | cut -d= -f2)
        [ -z "$admin_password" ] && admin_password="(not generated)"
    fi

    # Get node version if available
    local node_version="(not installed)"
    if command -v node &>/dev/null; then
        node_version=$(node -v 2>/dev/null || echo "(not installed)")
    fi

    # Get PHP version if available
    local php_version="(not installed)"
    if command -v php &>/dev/null; then
        php_version=$(php -v 2>/dev/null | head -1 | cut -d' ' -f2 || echo "(not installed)")
    fi

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║              ServerHubX Installation Complete!                   ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$INSTALL_ERRORS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Installation completed with $INSTALL_ERRORS warning(s)${NC}"
        echo -e "${YELLOW}   Some components may need manual configuration.${NC}"
        echo ""
    fi

    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                      DASHBOARD ACCESS                             ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}URL:${NC}      ${CYAN}https://${SERVER_IP}:${SERVERHUBX_PORT}${NC}"
    echo -e "  ${BOLD}Email:${NC}    ${CYAN}admin@localhost${NC}"
    echo -e "  ${BOLD}Password:${NC} ${CYAN}${admin_password}${NC}"
    echo ""

    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${RED}              ⚠️  IMPORTANT - SSH PORT CHANGED!                    ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}New SSH Command:${NC} ${YELLOW}ssh -p ${SSH_PORT} root@${SERVER_IP}${NC}"
    echo ""
    echo -e "  ${RED}WARNING: If you close this session without noting the new port,${NC}"
    echo -e "  ${RED}you may lose access to your server!${NC}"
    echo ""

    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                      INSTALLED SERVICES                           ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    command -v apache2 &>/dev/null && echo -e "  ${GREEN}✓${NC} Apache Web Server"
    command -v httpd &>/dev/null && echo -e "  ${GREEN}✓${NC} Apache Web Server (httpd)"
    command -v php &>/dev/null && echo -e "  ${GREEN}✓${NC} PHP $php_version"
    command -v node &>/dev/null && echo -e "  ${GREEN}✓${NC} Node.js $node_version"
    command -v pm2 &>/dev/null && echo -e "  ${GREEN}✓${NC} PM2 Process Manager"
    command -v mysql &>/dev/null && echo -e "  ${GREEN}✓${NC} MariaDB Database"
    command -v redis-cli &>/dev/null && echo -e "  ${GREEN}✓${NC} Redis Cache"
    command -v csf &>/dev/null && echo -e "  ${GREEN}✓${NC} CSF Firewall"
    [ "$SKIP_DNS" = false ] && command -v named &>/dev/null && echo -e "  ${GREEN}✓${NC} Bind9 DNS Server"
    [ "$SKIP_MAIL" = false ] && command -v postfix &>/dev/null && echo -e "  ${GREEN}✓${NC} Postfix Mail Server"
    [ "$SKIP_MAIL" = false ] && command -v dovecot &>/dev/null && echo -e "  ${GREEN}✓${NC} Dovecot IMAP/POP3"
    command -v certbot &>/dev/null && echo -e "  ${GREEN}✓${NC} Let's Encrypt (Certbot)"
    echo ""

    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                      FIREWALL STATUS                              ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    if command -v csf &>/dev/null; then
        echo -e "  ${BOLD}Open Ports (TCP IN):${NC}"
        echo -e "    ${SSH_PORT} (SSH), 80 (HTTP), 443 (HTTPS), ${SERVERHUBX_PORT} (Dashboard)"
        [ "$SKIP_MAIL" = false ] && echo -e "    25, 465, 587 (SMTP), 110, 995 (POP3), 143, 993 (IMAP)"
        [ "$SKIP_DNS" = false ] && echo -e "    53 (DNS)"
        echo ""
        csf -l 2>/dev/null | head -8 || echo "  CSF status: Running"
    else
        echo -e "  ${YELLOW}CSF Firewall not installed${NC}"
    fi
    echo ""

    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                      IMPORTANT FILES                              ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}Credentials:${NC}      ${CYAN}/root/.serverhubx-credentials${NC}"
    echo -e "  ${BOLD}DNS Setup Guide:${NC}  ${CYAN}/root/.serverhubx-dns-setup.txt${NC}"
    echo -e "  ${BOLD}Installation Dir:${NC} ${CYAN}${SERVERHUBX_HOME}${NC}"
    echo ""

    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                      NEXT STEPS                                   ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  1. ${YELLOW}Note your new SSH port: ${SSH_PORT}${NC}"
    echo -e "  2. Access the dashboard at: ${CYAN}https://${SERVER_IP}:${SERVERHUBX_PORT}${NC}"
    echo -e "  3. Login with: admin@localhost / ${admin_password}"
    echo -e "  4. Configure your domain's DNS (see /root/.serverhubx-dns-setup.txt)"
    echo ""
    echo -e "${GREEN}Installation complete! Thank you for using ServerHubX.${NC}"
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

    # Trap to ensure summary is always shown
    trap 'show_dns_instructions 2>/dev/null; print_summary' EXIT

    print_banner

    log_step "Pre-Installation Checks"
    check_root
    check_os
    check_resources
    check_existing_services

    if ! confirm "Continue with installation?"; then
        trap - EXIT  # Remove trap before exiting
        exit 0
    fi

    # Install packages (continue on errors)
    install_prereqs || { log_error "Prerequisites installation failed"; ((INSTALL_ERRORS++)); }
    install_nodejs || { log_error "Node.js installation failed"; ((INSTALL_ERRORS++)); }
    install_apache || { log_error "Apache installation failed"; ((INSTALL_ERRORS++)); }
    install_php || { log_error "PHP installation failed"; ((INSTALL_ERRORS++)); }
    install_mariadb || { log_error "MariaDB installation failed"; ((INSTALL_ERRORS++)); }
    install_redis || { log_error "Redis installation failed"; ((INSTALL_ERRORS++)); }
    install_bind9 || { log_warning "Bind9 installation skipped or failed"; }
    install_mail || { log_warning "Mail server installation skipped or failed"; }
    install_certbot || { log_warning "Certbot installation failed"; ((INSTALL_ERRORS++)); }

    # Security hardening (continue on errors)
    remove_existing_firewalls || { log_warning "Firewall removal had issues"; }
    change_ssh_port || { log_warning "SSH port change failed"; ((INSTALL_ERRORS++)); }
    install_csf || { log_error "CSF installation failed"; ((INSTALL_ERRORS++)); }
    configure_csf || { log_warning "CSF configuration had issues"; }
    configure_lfd || { log_warning "LFD configuration had issues"; }
    start_csf || { log_warning "CSF start had issues"; }
    secure_kernel_params || { log_warning "Kernel params configuration had issues"; }

    # ServerHubX setup (continue on errors)
    create_serverhubx_user || { log_error "User creation failed"; ((INSTALL_ERRORS++)); }
    setup_sudo_rules || { log_warning "Sudo rules setup had issues"; }
    create_database || { log_warning "Database creation had issues"; ((INSTALL_ERRORS++)); }
    install_serverhubx || { log_warning "ServerHubX application installation had issues"; ((INSTALL_ERRORS++)); }
    create_env_file || { log_warning "Environment file creation had issues"; }
    create_systemd_service || { log_warning "Systemd service creation had issues"; }
    generate_ssl_cert || { log_warning "SSL certificate generation had issues"; }
    create_admin_user || { log_warning "Admin user creation had issues"; }
    start_serverhubx || { log_warning "ServerHubX start had issues"; ((INSTALL_ERRORS++)); }

    # Summary will be shown by trap
    trap - EXIT  # Remove trap
    show_dns_instructions
    print_summary

    # Exit with error code if there were issues
    [ "$INSTALL_ERRORS" -gt 0 ] && exit 1
    exit 0
}

main "$@"
