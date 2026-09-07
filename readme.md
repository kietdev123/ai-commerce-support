# AI Commerce Support Platform

Nền tảng E-commerce tích hợp chatbot/AI Agent theo roadmap tại
[`docs/plan.md`](docs/plan.md). Triết lý chính của project là ưu tiên
Rule/API/Search trước LLM để giảm chi phí, độ trễ và hallucination.

## Trạng thái hiện tại

**Phase 1 — E-commerce Foundation: hoàn thành.**

**Phase 2 — Local AI Foundation: hoàn thành.** Dify source stack, Ollama,
Chatflow đã publish và storefront nhúng Dify Web App đều đã được cấu hình.

**Phase 3 — RAG Chatbot: hoàn thành.** Knowledge base gồm FAQ, giao hàng,
thanh toán, chính sách đổi trả demo và hướng dẫn sản phẩm đã được index bằng
`bge-m3:latest`; Chatflow dùng retrieval trước khi gọi Qwen và hiển thị nguồn.

Stack hiện tại chạy hoàn toàn bằng Docker:

- MedusaJS v2.19 backend và Admin Dashboard.
- Next.js Starter Storefront.
- PostgreSQL 16 lưu dữ liệu commerce.
- Redis 7 sẵn sàng cho các module hạ tầng ở phase tiếp theo.
- Migration, seed data, Admin user và publishable API key được khởi tạo tự động.
- Ollama 0.33.2 với `qwen3:1.7b`, `llama3.2:1b` và embedding model
  `bge-m3:latest` được tải tự động.
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
    ▼           ▼                    Dify Knowledge Retrieval
PostgreSQL    Redis                         │            │
                                        Weaviate    Ollama Models
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
7. Khởi động Ollama, tải hai chat model và `bge-m3:latest` vào persistent volume.

Khi cài project trên môi trường mới, cấu hình Dify trong Studio như sau:

1. Mở <http://localhost:3000/install> và tạo owner account local.
2. Vào **Settings → Model Providers**, cài Ollama plugin rồi thêm:
   - `qwen3:1.7b`, loại `Chat`, Base URL `http://ollama:11434`, context/max
     tokens `4096`.
   - `bge-m3:latest`, loại `Text Embedding`, cùng Base URL, context `8192`.
3. Vào **Knowledge**, tạo dataset `AI Commerce Support Knowledge`, chọn
   **High Quality**, `bge-m3:latest`, Semantic Search, `Top K = 4`, score
   threshold `0.25`, rồi upload toàn bộ file trong
   [`ai-platform/rag/knowledge`](ai-platform/rag/knowledge).
4. Trong Studio, import
   [`ai-platform/dify-app/ai-commerce-support.yml`](ai-platform/dify-app/ai-commerce-support.yml),
   mở node **AI Commerce Knowledge** và chọn lại dataset vừa tạo nếu Dify yêu
   cầu ánh xạ knowledge của môi trường mới. Kiểm tra hai model rồi **Publish**
   Chatflow.
5. Lấy URL iframe trong mục **Embed** của app đã publish và cấu hình URL public
   cho storefront nếu code app thay đổi:

   ```dotenv
   NEXT_PUBLIC_DIFY_CHATBOT_URL=http://localhost:3000/chatbot/{app-code}
   ```

6. Nạp URL mới vào storefront:

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
  → Knowledge Retrieval (Weaviate + bge-m3)
  → Qwen qua Ollama
```

Storefront không gọi Dify Service API và không giữ API key. Dify Web App tự quản
lý định danh browser, lịch sử hội thoại và streaming.

Chatbot có thể giải đáp FAQ, giao hàng, thanh toán demo, đổi trả và tư vấn theo
catalog tĩnh từ knowledge base. Dify Web App hiển thị nguồn retrieval; system
prompt buộc model từ chối suy đoán khi context không đủ.

Giá, tồn kho, trạng thái đơn, thanh toán thật và thao tác đổi trả/hoàn tiền là dữ
liệu động chưa được kết nối. Các chức năng đó thuộc Phase 4 và phải đi qua
Medusa API cùng business rule, không lấy từ RAG.

## Sử dụng và cập nhật RAG

Môi trường hiện tại đã có dataset `AI Commerce Support Knowledge` với 5 tài liệu
và 34 chunks. Nguồn được version control tại:

| Tài liệu | Nội dung |
| --- | --- |
| [`faq.md`](ai-platform/rag/knowledge/faq.md) | Câu hỏi thường gặp và giới hạn chatbot |
| [`shipping.md`](ai-platform/rag/knowledge/shipping.md) | Vùng giao, phí và thời gian dự kiến |
| [`payment.md`](ai-platform/rag/knowledge/payment.md) | Cấu hình thanh toán demo và quy tắc an toàn |
| [`returns.md`](ai-platform/rag/knowledge/returns.md) | Chính sách đổi trả mẫu trong 7 ngày |
| [`product-guide.md`](ai-platform/rag/knowledge/product-guide.md) | Tính năng và gợi ý cho 24 sản phẩm seed |

Để sử dụng, mở <http://localhost:8000>, bấm nút chat ở góc dưới bên phải và gửi
câu hỏi. Có thể dùng các câu như:

```text
Shop có những phương thức giao hàng nào?
Tôi có thể đổi sản phẩm trong bao lâu?
Laptop nào phù hợp để lập trình?
Môi trường demo có hỗ trợ COD không?
```

Để cập nhật knowledge:

1. Sửa file Markdown tương ứng trong `ai-platform/rag/knowledge/`.
2. Mở **Dify Studio → Knowledge → AI Commerce Support Knowledge**.
3. Thay thế tài liệu cũ hoặc upload bản mới, giữ cấu hình **High Quality** với
   `bge-m3:latest`.
4. Chờ trạng thái indexing của tài liệu là **Completed**. Nếu tạo dataset mới,
   chọn lại dataset đó trong node **AI Commerce Knowledge**.
5. Mở app **AI Commerce Support** và bấm **Publish** để đưa workflow mới vào
   Dify Web App đang được storefront nhúng.

Tài liệu `returns.md` và `payment.md` ghi rõ phạm vi demo. Trước production phải
thay bằng chính sách đã được phê duyệt và triển khai các thao tác nhạy cảm thành
business rule ở backend.

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
| `bge-m3:latest` | Tạo embedding cho Dify Knowledge | Không áp dụng benchmark sinh văn bản |

Các kết quả trên được đo trong Docker Desktop trên Apple M4 Pro, chạy CPU-only.
Xem điều kiện test, RAM và kết quả đầy đủ tại
[`docs/phase-2-benchmark.md`](docs/phase-2-benchmark.md).

Quản lý và thử model trực tiếp trong container Ollama:

```bash
# Tạo lại riêng Ollama nếu container chưa chạy
docker compose up -d ollama

# Tải/kiểm tra chat model và embedding model mặc định của project
docker compose run --rm ollama-model-init

# Mở shell trong container
docker compose exec ollama /bin/sh

# Các lệnh dưới đây chạy bên trong container
ollama list
ollama show qwen3:1.7b
ollama show bge-m3:latest
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
│   │   └── knowledge/             # 5 tài liệu nguồn của Phase 3
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

Các thư mục agent, n8n và observability vẫn là skeleton cho Phase 4-9. Source
knowledge của Phase 3 nằm trong `ai-platform/rag/knowledge/`; vector index và
metadata runtime được Dify lưu trong bind mounts của source stack.

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
| 3 | RAG Chatbot | Hoàn thành |
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
