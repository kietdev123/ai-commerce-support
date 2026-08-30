# AI Commerce Support Platform

Nền tảng E-commerce tích hợp chatbot/AI Agent theo roadmap tại
[`docs/plan.md`](docs/plan.md). Triết lý chính của project là ưu tiên
Rule/API/Search trước LLM để giảm chi phí, độ trễ và hallucination.

## Trạng thái hiện tại

**Phase 1 — E-commerce Foundation: hoàn thành.**

**Phase 2 — Local AI Foundation: hoàn thành.**

Stack hiện tại chạy hoàn toàn bằng Docker:

- MedusaJS v2.19 backend và Admin Dashboard.
- Next.js Starter Storefront.
- PostgreSQL 16 lưu dữ liệu commerce.
- Redis 7 sẵn sàng cho các module hạ tầng ở phase tiếp theo.
- Migration, seed data, Admin user và publishable API key được khởi tạo tự động.
- Ollama 0.33.2 với `qwen3:1.7b` và `llama3.2:1b` được tải tự động.
- Open WebUI 0.11.1 làm giao diện chat local, mặc định dùng Qwen.
- Storefront có khung chat responsive, stream câu trả lời qua Open WebUI.
- Open WebUI API key được tạo tự động và chỉ lưu trong Docker volume phía server.
- Persistent volume và health check cho toàn bộ service.

## Kiến trúc hiện tại

```text
Browser
  ├── Storefront + Chat Widget ─────────── http://localhost:8000
  ├── Admin Dashboard (Medusa) ─────────── http://localhost:9000/app
  └── Open WebUI ───────────────────────── http://localhost:3000
          │                 │                    │
          ▼                 ▼                    ▼
   Medusa Backend    Next.js /api/chat     Open WebUI API
          │                 │                    │
    ┌─────┴─────┐           └────────────────────┤
    ▼           ▼                                ▼
PostgreSQL    Redis                         Ollama Models
```

## Khởi chạy

Yêu cầu duy nhất:

- Docker Engine có Docker Compose v2.
- Các port `3000`, `5432`, `6379`, `5173`, `8000`, `9000` và `11434` đang
  trống.

Tại thư mục root của repository:

```bash
docker compose up --build -d
```

Lần chạy đầu sẽ tự động:

1. Khởi tạo PostgreSQL và Redis.
2. Chạy toàn bộ Medusa migrations.
3. Seed catalog, tồn kho, khách hàng, giỏ hàng và đơn hàng mẫu.
4. Tạo Admin user.
5. Tạo và truyền publishable API key cho storefront.
6. Khởi động backend, Admin Dashboard và storefront.
7. Khởi động Ollama, tải hai model vào persistent volume và xác minh checksum.
8. Khởi động Open WebUI sau khi model initializer hoàn tất.
9. Tạo restricted Open WebUI integration API key cho storefront.

Lần đầu cần tải khoảng 4 GB Docker image và 2,7 GB model. Các lần sau dùng lại
volume nên nhanh hơn đáng kể.

Kiểm tra trạng thái:

```bash
docker compose ps
docker compose logs -f medusa storefront ollama open-webui
```

Khi sáu service dài hạn đều ở trạng thái `healthy`, truy cập:

| Thành phần | URL | Thông tin đăng nhập |
| --- | --- | --- |
| Storefront | <http://localhost:8000> | Không cần |
| Medusa Admin | <http://localhost:9000/app> | `admin@aicommerce.local` / `supersecret` |
| Backend health | <http://localhost:9000/health> | Không cần |
| Open WebUI | <http://localhost:3000> | Không cần, local single-user |
| Ollama API | <http://localhost:11434/api/version> | Không cần |

Thông tin đăng nhập và secret trong `docker-compose.yml` chỉ dành cho local demo.
Phải thay toàn bộ trước khi triển khai ra môi trường public.
Ollama và Open WebUI chỉ bind vào `127.0.0.1`, không được expose ra LAN.

## Storefront chatbot

Nút chat nổi xuất hiện ở góc dưới bên phải của mọi trang storefront thuộc main
layout. Giao diện hỗ trợ desktop/mobile, suggested questions, streaming, dừng
câu trả lời và trạng thái kết nối.

Luồng request:

```text
Chat widget
  → POST /api/chat
  → Next.js server đọc API key từ Docker volume
  → Open WebUI /api/chat/completions
  → Ollama
```

API key không dùng biến `NEXT_PUBLIC_*` và không được gửi xuống browser. Service
`open-webui-integration-init` tạo hoặc đọc lại key hiện có, bật endpoint
restriction và chỉ cho phép `/api/models` cùng `/api/chat/completions`.

Chatbot hiện chỉ cung cấp tư vấn mua sắm chung. Knowledge base, citations,
catalog search, tồn kho và đơn hàng chưa được kết nối; chúng thuộc Phase 3-4.
System prompt hiện buộc model không khẳng định dữ liệu cửa hàng nếu không có
context xác minh.

## Sample data

Seed script tại
[`web-ecom/apps/backend/src/scripts/seed.ts`](web-ecom/apps/backend/src/scripts/seed.ts)
tạo dữ liệu tiếng Việt và giá VND để dùng xuyên suốt các phase AI tiếp theo:

| Dữ liệu | Số lượng |
| --- | ---: |
| Products | 24 |
| Product variants | 48 |
| Inventory levels | 48 |
| Customers | 20 |
| Abandoned carts | 8 |
| Historical orders | 30 |

Catalog gồm laptop, điện thoại, tablet, audio, wearable và phụ kiện. Product
metadata có brand, tags, warranty; order metadata có mã tham chiếu `DH0001` đến
`DH0030`, phù hợp cho RAG, product search và order tool calling ở các phase sau.

Seed có completion marker nên việc restart container không tạo dữ liệu trùng.

## Local AI

Model được cấu hình trong [`.env.example`](.env.example):

| Model | Vai trò | Kết quả benchmark trên máy hiện tại |
| --- | --- | --- |
| `qwen3:1.7b` | Mặc định; tiếng Việt và instruction-following tốt hơn | 18,95 tok/s; TTFT 305 ms |
| `llama3.2:1b` | Model nhẹ để đối chiếu latency | 39,40 tok/s; TTFT 100 ms |

Các kết quả trên được đo trong Docker Desktop trên Apple M4 Pro, chạy CPU-only.
Xem điều kiện test, RAM và kết quả đầy đủ tại
[`docs/phase-2-benchmark.md`](docs/phase-2-benchmark.md).

Quản lý model:

```bash
docker compose exec ollama ollama list
docker compose exec ollama ollama pull qwen3:1.7b
docker compose run --rm ollama-model-init
```

Kiểm tra API/UI và chạy lại benchmark:

```bash
node tests/functional/ollama-smoke.mjs
node tests/functional/storefront-chat-smoke.mjs
node ai-platform/ollama/benchmark.mjs
```

Trên Linux/WSL có NVIDIA Container Toolkit, bật GPU bằng override:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

Docker Desktop trên macOS không hỗ trợ truyền GPU Metal cho Ollama container,
vì vậy override GPU không áp dụng cho Mac.

## Các lệnh thường dùng

```bash
# Khởi động hoặc rebuild
docker compose up --build -d

# Xem trạng thái
docker compose ps

# Xem log
docker compose logs -f

# Dừng service nhưng giữ database
docker compose down

# Reset database, model và dữ liệu Open WebUI rồi seed/tải lại từ đầu
docker compose down -v
docker compose up --build -d
```

`docker compose down -v` xóa cả database commerce, model đã tải, lịch sử Open
WebUI và integration API key. Chỉ dùng khi thực sự muốn reset toàn bộ local
stack.

Kiểm tra số lượng dữ liệu trực tiếp trong PostgreSQL:

```bash
docker compose exec postgres psql -U medusa -d medusa -c \
  'SELECT count(*) AS products FROM product;'
```

## Cấu trúc repository

```text
ai-commerce-support/
├── web-ecom/
│   ├── apps/
│   │   ├── backend/              # Medusa backend + Admin + seed
│   │   └── storefront/           # Next.js storefront + chat widget/BFF
│   ├── scripts/                  # Docker startup scripts
│   └── Dockerfile
├── ai-platform/
│   ├── ollama/                   # Model initializer + benchmark
│   ├── open-webui/               # Integration credential initializer
│   ├── rag/
│   ├── agent/
│   └── model-router/
├── n8n/
│   └── workflows/
├── observability/
│   ├── langfuse/
│   ├── prometheus/
│   └── grafana/
├── tests/
│   ├── functional/
│   ├── e2e/
│   ├── ai-eval/
│   └── load/
├── docs/
│   ├── plan.md
│   ├── phase-2-benchmark.md
│   └── user_flow.md
├── docker-compose.yml
├── docker-compose.gpu.yml
└── readme.md
```

Các thư mục RAG, agent, n8n và observability vẫn là skeleton cho Phase 3-9.

## Kiểm tra đã thực hiện

- Backend TypeScript compile thành công.
- Medusa backend và Admin build thành công.
- Docker Compose config hợp lệ.
- PostgreSQL, Redis, Medusa và storefront đều vượt qua health check.
- Backend health, Admin và storefront trả HTTP `200`.
- Store API trả đúng 24 products.
- Restart backend không seed trùng dữ liệu.
- Ollama và Open WebUI đều vượt qua health check.
- Model initializer tải đủ hai model và kết thúc với exit code `0`.
- Functional smoke test gọi chat API thành công, nhận `OK` và xác minh WebUI.
- Storefront chat smoke test đi qua Next.js → Open WebUI → Ollama thành công.
- Chat widget đã được kiểm tra trực quan trên desktop và viewport mobile.
- Open WebUI key chỉ được phép gọi model/chat endpoints.
- Benchmark đo TTFT, generation speed, RAM và VRAM cho cả hai model.

## Roadmap

| Phase | Nội dung | Trạng thái |
| --- | --- | --- |
| 1 | E-commerce Foundation | Hoàn thành |
| 2 | Local AI Foundation | Hoàn thành |
| 3 | RAG Chatbot | Chưa thực hiện |
| 4 | AI Agent / Tools | Chưa thực hiện |
| 5 | n8n Automation | Chưa thực hiện |
| 6 | AI Evaluation | Chưa thực hiện |
| 7 | Observability | Chưa thực hiện |
| 8 | Load Test & Scaling | Chưa thực hiện |
| 9 | Cost Optimization | Chưa thực hiện |

Chi tiết xem [`docs/plan.md`](docs/plan.md) và
[`docs/user_flow.md`](docs/user_flow.md).

## Tài liệu tham khảo

- [Medusa — Install with Docker](https://docs.medusajs.com/learn/installation/docker)
- [Medusa — Next.js Starter Storefront](https://docs.medusajs.com/resources/nextjs-starter)
- [Ollama — Docker](https://docs.ollama.com/docker)
- [Ollama — FAQ](https://docs.ollama.com/faq)
- [Open WebUI — Quick Start](https://docs.openwebui.com/getting-started/quick-start/)
- [Open WebUI — API endpoints](https://docs.openwebui.com/reference/api-endpoints/)
- [Open WebUI — API keys](https://docs.openwebui.com/features/authentication-access/api-keys/)
