set -eu
if [ "$(id -u)" = 0 ]; then
  exec gosu "$(stat -c '%u:%g' /app)" "$@"
fi
exec "$@"
