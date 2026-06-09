#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
JDK_HOME="$PROJECT_DIR/zulu8.94.0.17-ca-jdk8.0.492-macosx_x64/Contents/Home"
GRADLE_WRAPPER="$PROJECT_DIR/tfsIntegration/gradlew"

if [ ! -x "$JDK_HOME/bin/java" ]; then
  echo "Missing bundled JDK: $JDK_HOME" >&2
  exit 1
fi

export JAVA_HOME="$JDK_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
  exec /usr/bin/arch -x86_64 "$GRADLE_WRAPPER" --no-daemon runServer
fi

exec "$GRADLE_WRAPPER" --no-daemon runServer
