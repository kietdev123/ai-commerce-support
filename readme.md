# AI Commerce Support Platform

Nền tảng E-commerce tích hợp chatbot/AI Agent theo roadmap tại
[`docs/plan.md`](docs/plan.md). Triết lý chính của project là ưu tiên
Rule/API/Search trước LLM để giảm chi phí, độ trễ và hallucination.

## Trạng thái hiện tại

**Phase 1 — E-commerce Foundation: hoàn thành.**

Stack hiện tại chạy hoàn toàn bằng Docker:

- MedusaJS v2.19 backend và Admin Dashboard.
- Next.js Starter Storefront.
- PostgreSQL 16 lưu dữ liệu commerce.
- Redis 7 sẵn sàng cho các module hạ tầng ở phase tiếp theo.
- Migration, seed data, Admin user và publishable API key được khởi tạo tự động.
- Health check cho toàn bộ service.

## Kiến trúc Phase 1

```text
Browser
  ├── Storefront (Next.js) ─────────────── http://localhost:8000
  └── Admin Dashboard (Medusa) ─────────── http://localhost:9000/app
                    │
                    ▼
             Medusa Backend API
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     PostgreSQL             Redis
```

## Khởi chạy

Yêu cầu duy nhất:

- Docker Engine có Docker Compose v2.
- Các port `5432`, `6379`, `5173`, `8000` và `9000` đang trống.

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

Kiểm tra trạng thái:

```bash
docker compose ps
docker compose logs -f medusa storefront
```

Khi bốn service đều ở trạng thái `healthy`, truy cập:

| Thành phần | URL | Thông tin đăng nhập |
| --- | --- | --- |
| Storefront | <http://localhost:8000> | Không cần |
| Medusa Admin | <http://localhost:9000/app> | `admin@aicommerce.local` / `supersecret` |
| Backend health | <http://localhost:9000/health> | Không cần |

Thông tin đăng nhập và secret trong `docker-compose.yml` chỉ dành cho local demo.
Phải thay toàn bộ trước khi triển khai ra môi trường public.

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

# Reset toàn bộ database và seed lại từ đầu
docker compose down -v
docker compose up --build -d
```

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
│   │   └── storefront/           # Next.js storefront
│   ├── scripts/                  # Docker startup scripts
│   └── Dockerfile
├── ai-platform/
│   ├── ollama/
│   ├── open-webui/
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
│   └── user_flow.md
├── docker-compose.yml
└── readme.md
```

Các thư mục ngoài `web-ecom` hiện là skeleton cho Phase 2-9, chưa được đưa vào
Docker Compose để giữ phạm vi Phase 1 rõ ràng.

## Kiểm tra đã thực hiện

- Backend TypeScript compile thành công.
- Medusa backend và Admin build thành công.
- Docker Compose config hợp lệ.
- PostgreSQL, Redis, Medusa và storefront đều vượt qua health check.
- Backend health, Admin và storefront trả HTTP `200`.
- Store API trả đúng 24 products.
- Restart backend không seed trùng dữ liệu.

## Roadmap

| Phase | Nội dung | Trạng thái |
| --- | --- | --- |
| 1 | E-commerce Foundation | Hoàn thành |
| 2 | Local AI Foundation | Chưa thực hiện |
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
