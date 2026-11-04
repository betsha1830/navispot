#!/bin/sh
set -eu

# Plain HTTP unless ENABLE_HTTPS is true. The published container port
# stays 3000 either way, so the compose mapping 3883:3000 does not change.
case "${ENABLE_HTTPS:-false}" in
  true) ;;
  false)
    export PORT="${PORT:-3000}"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    exec su-exec nextjs:nodejs node server.js
    ;;
  *)
    echo "ENABLE_HTTPS must be true or false (got '${ENABLE_HTTPS}')." >&2
    exit 1
    ;;
esac

CERT_DIR="${SSL_CERT_DIR:-/certs}"
CERT_FILE="${SSL_CERT_PATH:-$CERT_DIR/cert.pem}"
KEY_FILE="${SSL_KEY_PATH:-$CERT_DIR/key.pem}"
CN="${SSL_CERT_CN:-localhost}"
SAN="${SSL_CERT_SAN:-DNS:localhost,IP:127.0.0.1}"
DAYS="${SSL_CERT_DAYS:-825}"

mkdir -p "$CERT_DIR"

# A key passed in SSL_KEY_PATH is the operator's file. This script does not
# chmod, chown, or overwrite it. The server runs as uid 1001 (nextjs). Grant
# that user access without making the key world-readable:
#   chown 1001:1001 /path/to/key.pem && chmod 640 /path/to/key.pem
# Do not chmod 644 a supplied key.
key_supplied=0
if [ -n "${SSL_KEY_PATH:-}" ] && [ -s "$KEY_FILE" ]; then
  key_supplied=1
fi

# SSL_CERT_PATH set and the file nonempty means the operator supplied it.
# A certificate only present at the default path is generated output.
cert_supplied=0
if [ -n "${SSL_CERT_PATH:-}" ] && [ -s "$CERT_FILE" ]; then
  cert_supplied=1
fi

if [ "$key_supplied" -eq 1 ] && [ ! -s "$CERT_FILE" ]; then
  echo "SSL_KEY_PATH is set but $CERT_FILE is missing or empty." >&2
  echo "Provide the matching certificate via SSL_CERT_PATH. The supplied key was not modified." >&2
  exit 1
fi

# Default key path, file already present, certificate missing: openssl -keyout
# would replace that key. Refuse instead.
if [ -z "${SSL_KEY_PATH:-}" ] && [ -s "$KEY_FILE" ] && [ ! -s "$CERT_FILE" ]; then
  echo "Key $KEY_FILE exists but $CERT_FILE is missing or empty." >&2
  echo "Provide the certificate via SSL_CERT_PATH, or remove the key so a pair can be generated. The key was not modified." >&2
  exit 1
fi

if [ "$cert_supplied" -eq 1 ] && [ ! -s "$KEY_FILE" ]; then
  echo "SSL_CERT_PATH is set but $KEY_FILE is missing or empty." >&2
  echo "Provide the matching key via SSL_KEY_PATH. The supplied certificate was not modified." >&2
  exit 1
fi

if [ "$key_supplied" -eq 0 ] && [ "$cert_supplied" -eq 0 ] && { [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; }; then
  echo "Generating self-signed certificate (CN=${CN}, SAN=${SAN})"
  openssl req -x509 -newkey rsa:2048 -sha256 -days "$DAYS" -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=${CN}" \
    -addext "subjectAltName=${SAN}"
  # Leave the certificate mode as openssl created it. The new private key is
  # readable only by nextjs (uid 1001). Windows bind mounts may ignore chown;
  # if the server cannot read the key, fix it on the host:
  #   chown 1001:1001 <key> && chmod 640 <key>
  chmod 640 "$KEY_FILE" || true
  chown nextjs:nodejs "$KEY_FILE" || true
fi

case "${NEXT_PUBLIC_APP_URL:-}" in
  https://*) ;;
  *)
    echo "ENABLE_HTTPS is on, but NEXT_PUBLIC_APP_URL is not an https URL."
    echo "Set it (and SPOTIFY_REDIRECT_URI) to https://127.0.0.1:3883 before logging in with Spotify."
    ;;
esac

export SSL_CERT_PATH="$CERT_FILE"
export SSL_KEY_PATH="$KEY_FILE"
export INTERNAL_PORT="${INTERNAL_PORT:-3001}"
export HTTPS_PORT="${HTTPS_PORT:-3000}"
export FORCE_SECURE_COOKIES="${FORCE_SECURE_COOKIES:-1}"

exec su-exec nextjs:nodejs node /usr/local/bin/https-proxy.mjs
