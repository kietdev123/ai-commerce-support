# Phase 2 — Local AI Benchmark

Kết quả này là baseline cho việc chọn local model ở Phase 2. Benchmark không
đánh giá độ chính xác nghiệp vụ e-commerce; phần eval có dataset riêng thuộc
Phase 6.

## Môi trường

| Thành phần | Giá trị |
| --- | --- |
| Thời điểm đo | 2026-08-30 |
| Host | Apple M4 Pro, 24 GB unified memory, arm64 |
| Runtime | Docker Desktop for Mac |
| Ollama | 0.33.2 |
| Open WebUI | 0.11.1 slim |
| GPU trong container | Không; `size_vram = 0` |
| Model mặc định | `qwen3:1.7b` |

Ollama chạy CPU-only trong test này vì Docker Desktop trên macOS không hỗ trợ
GPU passthrough. Ollama native trên macOS có thể dùng Metal, nhưng đó không phải
runtime của Compose stack này.

## Phương pháp

Mỗi model được warm up trước khi đo. Request benchmark dùng streaming chat API,
`temperature = 0`, tối đa 96 output tokens và tắt thinking để kết quả dễ so
sánh. TTFT được tính từ lúc gửi request đến content token đầu tiên. Generation
speed lấy từ `eval_count / eval_duration` do Ollama trả về.

Prompt:

> Một khách hàng cần laptop để lập trình, RAM tối thiểu 16GB, ngân sách 25 triệu
> đồng. Hãy tư vấn trong tối đa 3 câu.

## Kết quả

| Model | TTFT | Tổng thời gian | Output | Tốc độ | RAM model | VRAM |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `qwen3:1.7b` | 305 ms | 5,11 s | 91 tokens | 18,95 tok/s | 1,75 GB | 0,00 GB |
| `llama3.2:1b` | 100 ms | 2,31 s | 87 tokens | 39,40 tok/s | 1,67 GB | 0,00 GB |

Tại thời điểm đo, Open WebUI sử dụng khoảng 999 MiB RAM khi idle. Con số thực
tế thay đổi theo Docker Desktop, context length và model đang được load.

## Kết luận

`llama3.2:1b` nhanh hơn khoảng hai lần và phù hợp cho smoke test hoặc luồng ưu
tiên latency. `qwen3:1.7b` bám prompt tiếng Việt tốt hơn trong lần thử này nên
được chọn làm mặc định cho các phase RAG và Agent tiếp theo. Đây là quyết định
baseline và cần được xác nhận lại bằng AI eval dataset ở Phase 6.

Chạy lại:

```bash
node ai-platform/ollama/benchmark.mjs
```

Có thể thay model và prompt mà không sửa code:

```bash
OLLAMA_MODELS=qwen3:1.7b \
BENCHMARK_PROMPT='Viết prompt benchmark tại đây' \
node ai-platform/ollama/benchmark.mjs
```

## Tài liệu tham khảo

- [Ollama Docker](https://docs.ollama.com/docker)
- [Ollama FAQ — Docker GPU trên macOS](https://docs.ollama.com/faq)
- [Open WebUI Quick Start](https://docs.openwebui.com/getting-started/quick-start/)
