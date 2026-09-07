#!/bin/sh

set -eu

models="${OLLAMA_MODELS:-qwen3:1.7b,llama3.2:1b},${OLLAMA_EMBEDDING_MODELS:-bge-m3:latest}"
previous_ifs="$IFS"
IFS=','

for model in $models; do
  model="$(printf '%s' "$model" | tr -d '[:space:]')"

  if [ -z "$model" ]; then
    continue
  fi

  if ollama show "$model" >/dev/null 2>&1; then
    echo "Model $model is already available."
  else
    echo "Pulling model $model..."
    ollama pull "$model"
  fi
done

IFS="$previous_ifs"

echo "Available Ollama models:"
ollama list
