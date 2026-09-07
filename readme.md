# AI Commerce Support Platform

Nền tảng E-commerce tích hợp chatbot/AI Agent theo roadmap tại
[`docs/plan.md`](docs/plan.md). Triết lý chính của project là ưu tiên
Rule/API/Search trước LLM để giảm chi phí, độ trễ và hallucination.

## Trạng thái hiện tại

**Phase 1 — E-commerce Foundation: hoàn thành.**

**Phase 2 — Local AI Foundation: hoàn thành.** Dify source stack, Ollama,
Chatflow đã publish và storefront nhúng Dify Web App đều đã được cấu hình.

Stack hiện tại chạy hoàn toàn bằng Docker:

- MedusaJS v2.19 backend và Admin Dashboard.
- Next.js Starter Storefront.
- PostgreSQL 16 lưu dữ liệu commerce.
- Redis 7 sẵn sàng cho các module hạ tầng ở phase tiếp theo.
- Migration, seed data, Admin user và publishable API key được khởi tạo tự động.
- Ollama 0.33.2 với `qwen3:1.7b` và `llama3.2:1b` được tải tự động.
- Toàn bộ source Dify 1.16.1 được vendored tại `ai-platform/dify` để phát triển
  Chatflow/RAG/Agent mà không phụ thuộc Git submodule.
- Storefront nhúng trực tiếp Dify Web App trong khung chat responsive.
- Storefront không giữ Dify Service API key và không có BFF `/api/chat`.
- Persistent volume và health check cho toàn bộ service.

## Kiến trúc hiện tại

```text
Browser
  ├── Storefront + Chat Widget ─────────── http://localhost:8000
  ├── Admin Dashboard (Medusa) ─────────── http://localhost:9000/app
  └── Dify Studio ──────────────────────── http://localhost:3000
          │                                      │
          ▼                                      ▼
   Medusa Backend                    Embedded Dify Web App
          │                                      │
    ┌─────┴─────┐                                ▼
    ▼           ▼                           Ollama Models
PostgreSQL    Redis
```

## Khởi chạy

Yêu cầu:

- Docker Engine có Docker Compose v2.
- Tối thiểu 2 CPU và 4 GiB RAM cho riêng Dify; Docker Desktop nên được cấp ít
  nhất 8 GiB RAM.
- Các port `3000`, `5432`, `6379`, `5173`, `8000`, `9000` và `11434` đang
  trống.

Source Dify tag `1.16.1` đã nằm trực tiếp trong repository. Khởi động commerce
stack và Ollama trước để tạo Docker network dùng chung, sau đó khởi động Dify
bằng Compose chính chủ trong source vendored:

```bash
docker compose up --build -d
./ai-platform/dify-compose.sh up
```

Nếu đang nâng cấp từ stack cũ và port `3000` vẫn do container Open WebUI chiếm,
hãy dừng/xóa đúng container cũ trước khi chạy Dify; volume cũ không bị xóa tự
động.

Script Dify tự tạo `ai-platform/dify/docker/.env` từ file mẫu upstream. Dữ liệu
Dify được giữ trong `ai-platform/dify/docker/volumes/`, đúng với cấu trúc
self-hosted chính thức.

Lần chạy đầu của commerce stack sẽ tự động:

1. Khởi tạo PostgreSQL và Redis.
2. Chạy toàn bộ Medusa migrations.
3. Seed catalog, tồn kho, khách hàng, giỏ hàng và đơn hàng mẫu.
4. Tạo Admin user.
5. Tạo và truyền publishable API key cho storefront.
6. Khởi động backend, Admin Dashboard và storefront.
7. Khởi động Ollama, tải hai model vào persistent volume và xác minh checksum.

Khi cài project trên môi trường mới, cấu hình Dify trong Studio như sau:

1. Mở <http://localhost:3000/install> và tạo owner account local.
2. Vào **Settings → Model Providers**, cài Ollama plugin và thêm model
   `qwen3:1.7b` với Base URL `http://ollama:11434`, loại `Chat`, context/max
   tokens `4096`.
3. Trong Studio, import
   [`ai-platform/dify-app/ai-commerce-support.yml`](ai-platform/dify-app/ai-commerce-support.yml),
   kiểm tra model rồi **Publish** Chatflow.
4. Lấy URL iframe trong mục **Embed** của app đã publish và cấu hình URL public
   cho storefront nếu code app thay đổi:

   ```dotenv
   NEXT_PUBLIC_DIFY_CHATBOT_URL=http://localhost:3000/chatbot/{app-code}
   ```

5. Nạp URL mới vào storefront:

   ```bash
   docker compose up -d --force-recreate storefront
   ```

URL iframe là thông tin public, không phải Service API key.

Kiểm tra trạng thái:

```bash
docker compose ps
./ai-platform/dify-compose.sh ps
docker compose logs -f medusa storefront ollama
./ai-platform/dify-compose.sh logs
```

Khi các service đã sẵn sàng, truy cập:

| Thành phần | URL | Thông tin đăng nhập |
| --- | --- | --- |
| Storefront | <http://localhost:8000> | Không cần |
| Medusa Admin | <http://localhost:9000/app> | `admin@aicommerce.local` / `supersecret` |
| Backend health | <http://localhost:9000/health> | Không cần |
| Dify Studio | <http://localhost:3000> | Owner account tạo ở `/install` | `admin@aicommerce.local` / `supersecret1` |
| Ollama API | <http://localhost:11434/api/version> | Không cần |

Thông tin đăng nhập và secret trong `docker-compose.yml` chỉ dành cho local demo.
Phải thay toàn bộ trước khi triển khai ra môi trường public.
Ollama và Dify chỉ bind vào `127.0.0.1`, không được expose ra LAN. Dify dùng
database/Redis riêng từ Compose upstream; không dùng chung dữ liệu với Medusa.

## Storefront chatbot

Nút chat nổi xuất hiện ở góc dưới bên phải của mọi trang storefront thuộc main
layout. Nội dung chat, streaming, lịch sử hội thoại và các nút điều khiển do
Dify Web App quản lý bên trong iframe.

Luồng request:

```text
Chat widget
  → iframe /chatbot/{app-code}
  → Dify Web App
  → Chatflow AI Commerce Support
  → Ollama
```

Storefront không gọi Dify Service API và không giữ API key. Dify Web App tự quản
lý định danh browser, lịch sử hội thoại và streaming.

Chatbot hiện chỉ cung cấp tư vấn mua sắm chung. Knowledge base, citations,
catalog search, tồn kho và đơn hàng chưa được kết nối; chúng thuộc Phase 3-4.
System prompt trong Chatflow DSL buộc model không khẳng định dữ liệu cửa hàng
nếu không có context xác minh.

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

Quản lý và thử model trực tiếp trong container Ollama:

```bash
# Tạo lại riêng Ollama nếu container chưa chạy
docker compose up -d ollama

# Tải/kiểm tra các model mặc định của project
docker compose run --rm ollama-model-init

# Mở shell trong container
docker compose exec ollama /bin/sh

# Các lệnh dưới đây chạy bên trong container
ollama list
ollama show qwen3:1.7b
ollama ps
ollama run qwen3:1.7b

# Trong phiên chat, nhập /bye để thoát; sau đó thoát container
exit
```

Có thể gửi prompt một lần mà không cần mở shell:

```bash
docker compose exec ollama ollama run qwen3:1.7b \
  "Trả lời ngắn gọn bằng tiếng Việt: Ollama đang hoạt động như thế nào?"
docker compose exec ollama ollama run llama3.2:1b \
  "Reply with exactly: llama3.2 is ready"

# Xem model đang được nạp và log runtime
docker compose exec ollama ollama list
docker compose exec ollama ollama ps
docker compose logs -f ollama
```

Kiểm tra API/UI và chạy lại benchmark:

```bash
node tests/functional/ollama-smoke.mjs
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
# Khởi động hoặc rebuild commerce + Ollama
docker compose up --build -d

# Quản lý Dify source stack
./ai-platform/dify-compose.sh up
./ai-platform/dify-compose.sh ps
./ai-platform/dify-compose.sh logs

# Xem trạng thái commerce
docker compose ps

# Xem log
docker compose logs -f

# Dừng service nhưng giữ dữ liệu
./ai-platform/dify-compose.sh down
docker compose down

# Reset database commerce và model Ollama rồi seed/tải lại từ đầu
docker compose down -v
docker compose up --build -d
```

`docker compose down -v` chỉ xóa database commerce và model Ollama của root
stack. `dify-compose.sh down` giữ dữ liệu Dify trong thư mục bind mount
`ai-platform/dify/docker/volumes/`; sao lưu thư mục này trước khi reset hoặc
nâng cấp Dify.

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
│   │   └── storefront/           # Next.js storefront + embedded Dify widget
│   ├── scripts/                  # Docker startup scripts
│   └── Dockerfile
├── ai-platform/
│   ├── ollama/                   # Model initializer + benchmark
│   ├── dify/                     # Full Dify 1.16.1 source (vendored)
│   ├── dify-app/                 # Importable Chatflow DSL
│   ├── dify-compose.sh           # Dify source-stack wrapper
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
├── docker-compose.dify.yml       # Shared-network override for Dify
├── docker-compose.gpu.yml
└── readme.md
```

Các thư mục RAG, agent, n8n và observability vẫn là skeleton cho Phase 3-9.

## Kiểm tra

Các kiểm tra static/build dùng cho migration Dify:

```bash
docker compose config --quiet
./ai-platform/dify-compose.sh config >/dev/null
pnpm --dir web-ecom --filter @dtc/storefront build
```

Trên môi trường cài mới, sau khi setup app trong Dify Studio, kiểm tra Ollama và
mở storefront để kiểm tra iframe:

```bash
node tests/functional/ollama-smoke.mjs
```

Script xác minh Ollama cùng endpoint health của Dify. Việc chat được kiểm tra
thủ công tại storefront vì hội thoại chạy bên trong Dify Web App.

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
- [Dify — Docker Compose deployment](https://docs.dify.ai/en/self-host/deploy/quick-start/docker-compose)
- [Dify — Ollama provider plugin](https://github.com/langgenius/dify-official-plugins/tree/main/models/ollama)
- [Dify — Source repository](https://github.com/langgenius/dify/tree/1.16.1)
