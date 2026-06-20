#!/bin/bash
# ==============================================================================
# PSXTerminal WebSocket Stock Data Collector - Playwright/MessagePack Setup
# ==============================================================================
#
# Usage:
#   sudo ./setup_wss_collector_playwright.sh              # Install & start
#   sudo ./setup_wss_collector_playwright.sh uninstall    # Full uninstall
#   sudo ./setup_wss_collector_playwright.sh status       # Check service status
#   sudo ./setup_wss_collector_playwright.sh logs         # Tail live logs
#   sudo ./setup_wss_collector_playwright.sh restart      # Restart service
#
# What it does:
#   1. Creates /opt/psx-wss-collector with a Python venv
#   2. Installs Python dependencies: playwright, msgpack, redis
#   3. Installs Chromium for Playwright into /opt/psx-wss-collector/ms-playwright
#   4. Creates /opt/saved_psx and /opt/saved_psx/klines
#   5. Installs/enables psx-wss-collector systemd service
#
# Notes:
#   - The updated collector no longer uses aiohttp for direct WSS.
#   - It uses headless Chromium so PSXTerminal can generate the valid /rt?t= token.
#   - Browser binaries are stored under /opt so ProtectHome=true will not break service startup.
# ============================================================================== 

set -Eeuo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/psx-wss-collector"
DATA_DIR="/opt/saved_psx"
SERVICE_NAME="psx-wss-collector"
# Use the Playwright-aware unit file (sets PLAYWRIGHT_BROWSERS_PATH + HOME).
# Installed as ${SERVICE_NAME}.service so existing systemctl commands keep working.
SERVICE_FILE_SRC="psx-wss-collector-playwright.service"
SERVICE_FILE="${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTOR_DEST="${INSTALL_DIR}/psx_wss_collector.py"
BROWSERS_DIR="${INSTALL_DIR}/ms-playwright"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- checks ----------------------------------------------------------------

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_python() {
    if ! command -v python3 &>/dev/null; then
        log_error "Python 3 is not installed. Install python3 first."
        exit 1
    fi

    if ! python3 -m venv --help &>/dev/null; then
        log_error "python3-venv is missing. Install it first, for example: apt-get install -y python3-venv"
        exit 1
    fi

    PYVER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    log_info "Python version: $PYVER"
}

check_redis() {
    local found=false

    systemctl is-active --quiet redis-server 2>/dev/null && found=true
    systemctl is-active --quiet redis 2>/dev/null         && found=true

    if ! $found && command -v docker &>/dev/null; then
        docker ps --format '{{.Names}}' 2>/dev/null | grep -qi redis && found=true
    fi

    if ! $found; then
        pgrep -x redis-server &>/dev/null && found=true
    fi

    if ! $found && command -v redis-cli &>/dev/null; then
        redis-cli -h 127.0.0.1 ping 2>/dev/null | grep -q PONG && found=true
    fi

    if $found; then
        log_info "Redis appears to be reachable/running"
    else
        log_warning "Redis does not appear to be running."
        log_warning "If Docker: docker compose up -d redis  |  If systemd: systemctl start redis-server"
        read -r -p "Continue anyway? (y/N): " reply
        [[ "$reply" =~ ^[Yy]$ ]] || exit 1
    fi
}

find_collector_source() {
    # Preferred name for the updated script.
    if [[ -f "$SCRIPT_DIR/psx_wss_collector_playwright_msgpack.py" ]]; then
        echo "$SCRIPT_DIR/psx_wss_collector_playwright_msgpack.py"
        return
    fi

    # Backward-compatible name expected by the old setup/service.
    if [[ -f "$SCRIPT_DIR/psx_wss_collector.py" ]]; then
        echo "$SCRIPT_DIR/psx_wss_collector.py"
        return
    fi

    log_error "Missing collector script. Put one of these next to this setup script:"
    log_error "  - psx_wss_collector_playwright_msgpack.py"
    log_error "  - psx_wss_collector.py"
    exit 1
}

check_files() {
    COLLECTOR_SRC="$(find_collector_source)"
    if [[ ! -f "$SCRIPT_DIR/$SERVICE_FILE_SRC" ]]; then
        log_error "Missing service file: $SCRIPT_DIR/$SERVICE_FILE_SRC"
        exit 1
    fi
    log_info "Collector source: $COLLECTOR_SRC"
    log_info "Service unit src: $SERVICE_FILE_SRC -> /etc/systemd/system/$SERVICE_FILE"
}

# ---- install steps ----------------------------------------------------------

create_directories() {
    log_info "Creating install/data directories"
    mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$DATA_DIR/klines" "$BROWSERS_DIR"
    chmod 755 "$INSTALL_DIR" "$DATA_DIR" "$DATA_DIR/klines"
    log_success "Directories ready"
}

create_venv() {
    log_info "Creating Python virtual environment"
    python3 -m venv "$INSTALL_DIR/venv"
    # shellcheck disable=SC1091
    source "$INSTALL_DIR/venv/bin/activate"
    python -m pip install --upgrade pip setuptools wheel >/dev/null
    log_success "venv ready"
}

install_python_deps() {
    log_info "Installing Python packages: playwright, msgpack, redis"
    # shellcheck disable=SC1091
    source "$INSTALL_DIR/venv/bin/activate"
    python -m pip install --upgrade playwright msgpack redis >/dev/null
    log_success "Python packages installed"
}

install_playwright_chromium() {
    log_info "Installing Playwright Chromium into $BROWSERS_DIR"
    # shellcheck disable=SC1091
    source "$INSTALL_DIR/venv/bin/activate"

    export PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_DIR"

    # On Debian/Ubuntu this installs required shared libraries too. It is safe to skip manually
    # if your server already has Chromium dependencies installed.
    if command -v apt-get &>/dev/null; then
        log_info "Installing Chromium OS dependencies via Playwright/apt"
        python -m playwright install-deps chromium || log_warning "playwright install-deps failed; continuing to browser install"
    else
        log_warning "apt-get not found. Skipping automatic OS dependency install."
    fi

    python -m playwright install chromium
    chmod -R a+rX "$BROWSERS_DIR"
    log_success "Playwright Chromium installed"
}

copy_script() {
    log_info "Copying collector script to $COLLECTOR_DEST"
    cp "$COLLECTOR_SRC" "$COLLECTOR_DEST"
    chmod 755 "$COLLECTOR_DEST"
    log_success "Collector script copied"
}

install_service() {
    log_info "Installing systemd service"

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        systemctl stop "$SERVICE_NAME"
    fi

    cp "$SCRIPT_DIR/$SERVICE_FILE_SRC" "/etc/systemd/system/$SERVICE_FILE"
    chmod 644 "/etc/systemd/system/$SERVICE_FILE"
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    log_success "Service installed and enabled"
}

start_service() {
    log_info "Starting $SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"
    sleep 5

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Service is running"
    else
        log_error "Service failed to start. Recent logs:"
        journalctl -u "$SERVICE_NAME" -n 80 --no-pager || true
        exit 1
    fi
}

print_summary() {
    echo ""
    echo "=============================================================================="
    echo -e "${GREEN}PSX WSS Collector - Installation Complete${NC}"
    echo "=============================================================================="
    echo ""
    echo "  Install dir : $INSTALL_DIR"
    echo "  Browser dir : $BROWSERS_DIR"
    echo "  Data dir    : $DATA_DIR"
    echo "  Service     : $SERVICE_NAME"
    echo ""
    echo "  Commands:"
    echo "    sudo systemctl status  $SERVICE_NAME"
    echo "    sudo journalctl -u     $SERVICE_NAME -f"
    echo "    sudo systemctl restart $SERVICE_NAME"
    echo "    sudo systemctl stop    $SERVICE_NAME"
    echo ""
    echo "  Redis checks:"
    echo "    redis-cli ZRANGE psx:ticks:HUBC -5 -1"
    echo "    redis-cli ZCARD  psx:ticks:HUBC"
    echo "    redis-cli SUBSCRIBE psx:ticks:stream"
    echo ""
    echo "  CSV checks:"
    echo "    ls -lah $DATA_DIR"
    echo "    ls -lah $DATA_DIR/klines"
    echo "=============================================================================="
}

# ---- uninstall/status/logs --------------------------------------------------

uninstall() {
    log_info "Uninstalling $SERVICE_NAME"

    systemctl is-active --quiet "$SERVICE_NAME" && systemctl stop "$SERVICE_NAME"
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "/etc/systemd/system/$SERVICE_FILE"
    systemctl daemon-reload

    rm -rf "$INSTALL_DIR"

    log_warning "Data directory $DATA_DIR was NOT removed. Delete it manually if desired."
    log_success "Uninstall complete"
}

case "${1:-}" in
    uninstall)
        check_root
        uninstall
        exit 0
        ;;
    status)
        systemctl status "$SERVICE_NAME"
        exit 0
        ;;
    logs)
        journalctl -u "$SERVICE_NAME" -f
        exit 0
        ;;
    restart)
        check_root
        systemctl restart "$SERVICE_NAME"
        systemctl status "$SERVICE_NAME" --no-pager
        exit 0
        ;;
    "")
        ;;
    *)
        echo "Usage: sudo $0 [uninstall|status|logs|restart]"
        exit 1
        ;;
esac

# ---- main -------------------------------------------------------------------

echo "=============================================================================="
echo "PSXTerminal WebSocket Collector - Playwright/MessagePack Setup"
echo "=============================================================================="
echo ""

check_root
check_python
check_redis
check_files
create_directories
create_venv
install_python_deps
install_playwright_chromium
copy_script
install_service
start_service
print_summary

exit 0
