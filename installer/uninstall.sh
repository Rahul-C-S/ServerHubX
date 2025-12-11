#!/bin/bash
#
# ServerHubX Uninstall Script
# Safely removes ServerHubX and optionally all managed data
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
SERVERHUBX_USER="serverhubx"
SERVERHUBX_HOME="/opt/serverhubx"
DB_NAME="serverhubx"
DB_USER="serverhubx"

# Flags
REMOVE_DATABASE=false
REMOVE_CSF=false
RESTORE_SSH=false
REMOVE_DOMAINS=false
FORCE=false

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
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

confirm() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    read -p "$1 [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

print_banner() {
    echo -e "${RED}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║               ServerHubX Uninstaller                              ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

stop_services() {
    log_info "Stopping ServerHubX services..."

    systemctl stop serverhubx 2>/dev/null || true
    systemctl disable serverhubx 2>/dev/null || true

    log_success "Services stopped"
}

remove_systemd_service() {
    log_info "Removing systemd service..."

    rm -f /etc/systemd/system/serverhubx.service
    systemctl daemon-reload

    log_success "Systemd service removed"
}

remove_application() {
    log_info "Removing ServerHubX application files..."

    rm -rf "$SERVERHUBX_HOME"

    log_success "Application files removed"
}

remove_system_user() {
    log_info "Removing ServerHubX system user..."

    if id "$SERVERHUBX_USER" &>/dev/null; then
        userdel -r "$SERVERHUBX_USER" 2>/dev/null || userdel "$SERVERHUBX_USER"
    fi

    log_success "System user removed"
}

remove_sudo_rules() {
    log_info "Removing sudo rules..."

    rm -f /etc/sudoers.d/serverhubx

    log_success "Sudo rules removed"
}

remove_database() {
    if [ "$REMOVE_DATABASE" = false ]; then
        if ! confirm "Remove ServerHubX database and user?"; then
            log_info "Skipping database removal"
            return
        fi
    fi

    log_info "Removing database..."

    local db_root_password=""
    if [ -f /root/.serverhubx-credentials ]; then
        db_root_password=$(grep MARIADB_ROOT_PASSWORD /root/.serverhubx-credentials 2>/dev/null | cut -d= -f2)
    fi

    if [ -n "$db_root_password" ]; then
        mysql -u root -p"${db_root_password}" << EOF 2>/dev/null || true
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF
        log_success "Database removed"
    else
        log_warning "Could not remove database. Please remove manually:"
        echo "  mysql -u root -p -e \"DROP DATABASE ${DB_NAME}; DROP USER '${DB_USER}'@'localhost';\""
    fi
}

remove_csf() {
    if [ "$REMOVE_CSF" = false ]; then
        if ! confirm "Remove CSF firewall?"; then
            log_info "Keeping CSF firewall"
            return
        fi
    fi

    log_info "Removing CSF firewall..."

    if [ -f /etc/csf/uninstall.sh ]; then
        sh /etc/csf/uninstall.sh
        log_success "CSF removed"
    else
        log_warning "CSF uninstall script not found"
    fi
}

restore_ssh_port() {
    if [ "$RESTORE_SSH" = false ]; then
        if ! confirm "Restore SSH to default port 22?"; then
            log_info "Keeping current SSH port"
            return
        fi
    fi

    log_info "Restoring SSH to port 22..."

    local sshd_config="/etc/ssh/sshd_config"

    # Backup current config
    cp "$sshd_config" "${sshd_config}.uninstall.bak"

    # Change port back to 22
    sed -i 's/^Port .*/Port 22/' "$sshd_config"

    # Validate and restart
    if sshd -t; then
        systemctl restart sshd
        log_success "SSH restored to port 22"
        echo -e "${YELLOW}WARNING: SSH is now on port 22. Update your connection settings!${NC}"
    else
        log_error "Invalid SSH config. Restoring backup..."
        cp "${sshd_config}.uninstall.bak" "$sshd_config"
    fi
}

remove_domains() {
    if [ "$REMOVE_DOMAINS" = false ]; then
        if ! confirm "Remove all managed domains and user home directories? THIS CANNOT BE UNDONE!"; then
            log_info "Keeping domain data"
            return
        fi
    fi

    log_warning "This will remove ALL domain data in /home directories created by ServerHubX"

    if ! confirm "Are you ABSOLUTELY SURE?"; then
        log_info "Keeping domain data"
        return
    fi

    log_info "Removing domain data..."

    # List and remove users created by ServerHubX
    # These users typically have homes in /home and were created for domains
    # We need to be careful here - only remove users we created

    # Check for a marker file or database entry
    if [ -f "${SERVERHUBX_HOME}/managed-users.txt" ]; then
        while read -r username; do
            if [ -n "$username" ] && [ "$username" != "root" ]; then
                log_info "Removing user: $username"
                userdel -r "$username" 2>/dev/null || true
            fi
        done < "${SERVERHUBX_HOME}/managed-users.txt"
    fi

    log_success "Domain data removed"
}

remove_credentials() {
    log_info "Removing credential files..."

    rm -f /root/.serverhubx-credentials
    rm -f /root/.serverhubx-dns-setup.txt

    log_success "Credential files removed"
}

cleanup_apache() {
    log_info "Cleaning up Apache configuration..."

    # Remove ServerHubX vhosts
    if [ -d /etc/apache2/sites-enabled ]; then
        rm -f /etc/apache2/sites-enabled/serverhubx*.conf
        rm -f /etc/apache2/sites-available/serverhubx*.conf
    fi

    if [ -d /etc/httpd/conf.d ]; then
        rm -f /etc/httpd/conf.d/serverhubx*.conf
    fi

    # Reload Apache if running
    systemctl reload apache2 2>/dev/null || systemctl reload httpd 2>/dev/null || true

    log_success "Apache configuration cleaned"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║              ServerHubX Uninstall Complete                        ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "The following components were removed:"
    echo "  - ServerHubX application and systemd service"
    echo "  - ServerHubX system user"
    echo "  - Sudo rules"
    [ "$REMOVE_DATABASE" = true ] && echo "  - Database and database user"
    [ "$REMOVE_CSF" = true ] && echo "  - CSF firewall"
    [ "$RESTORE_SSH" = true ] && echo "  - SSH port restored to 22"
    [ "$REMOVE_DOMAINS" = true ] && echo "  - Managed domains and user data"
    echo ""
    echo "The following components were NOT removed:"
    echo "  - Apache, PHP, Node.js, MariaDB, Redis"
    echo "  - Bind9, Postfix, Dovecot (if installed)"
    [ "$REMOVE_DATABASE" = false ] && echo "  - ServerHubX database"
    [ "$REMOVE_CSF" = false ] && echo "  - CSF firewall"
    [ "$REMOVE_DOMAINS" = false ] && echo "  - Domain data in /home directories"
    echo ""
    echo "To completely remove all dependencies, run:"
    echo "  apt remove apache2 php* mariadb-server redis-server nodejs"
    echo "  # or on RHEL:"
    echo "  dnf remove httpd php* mariadb-server redis nodejs"
    echo ""
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --remove-database)
                REMOVE_DATABASE=true
                shift
                ;;
            --remove-csf)
                REMOVE_CSF=true
                shift
                ;;
            --restore-ssh)
                RESTORE_SSH=true
                shift
                ;;
            --remove-domains)
                REMOVE_DOMAINS=true
                shift
                ;;
            --force|-f)
                FORCE=true
                shift
                ;;
            --all)
                REMOVE_DATABASE=true
                REMOVE_CSF=true
                RESTORE_SSH=true
                REMOVE_DOMAINS=true
                shift
                ;;
            --help|-h)
                echo "ServerHubX Uninstaller"
                echo ""
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --remove-database  Remove ServerHubX database"
                echo "  --remove-csf       Remove CSF firewall"
                echo "  --restore-ssh      Restore SSH to port 22"
                echo "  --remove-domains   Remove all managed domains (DANGEROUS)"
                echo "  --all              Remove everything"
                echo "  --force, -f        Skip all confirmations"
                echo "  --help             Show this help"
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
    check_root

    echo -e "${RED}${BOLD}WARNING: This will remove ServerHubX from your system.${NC}"
    echo ""

    if ! confirm "Continue with uninstallation?"; then
        echo "Uninstallation cancelled."
        exit 0
    fi

    stop_services
    remove_systemd_service
    cleanup_apache
    remove_database
    remove_domains
    remove_application
    remove_system_user
    remove_sudo_rules
    remove_csf
    restore_ssh_port
    remove_credentials

    print_summary
}

main "$@"
