## Plan tổng thể — AI Commerce Support Platform

**Tên project đề xuất:** `AI Commerce Support Platform`
**Repo:** `ai-commerce-support`

**Mục tiêu:** xây dựng hệ thống E-commerce tích hợp chatbot/AI Agent, ưu tiên **local LLM để giảm chi phí**, toàn bộ chạy Docker; đồng thời có evaluation, monitoring, scaling và cost optimization.

### Kiến trúc mục tiêu

```text
                         ┌──────────────┐
                         │   Customer   │
                         └──────┬───────┘
                                │
                    ┌───────────▼───────────┐
                    │     Web Ecommerce     │
                    │       MedusaJS        │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │      AI Platform      │
                    │                       │
                    │  RAG / Agent / Router │
                    └──────┬────────┬───────┘
                           │        │
                  ┌────────▼──┐  ┌──▼─────────┐
                  │  Ollama   │  │ Medusa API │
                  │ Local LLM │  │ Order/...  │
                  └───────────┘  └────────────┘
                           │
              ┌────────────┴─────────────┐
              │                          │
         ┌────▼────┐               ┌─────▼─────┐
         │   n8n   │               │ Langfuse  │
         │Workflow│               │ AI Observe│
         └────┬────┘               └───────────┘
              │
       CRM / Email / etc.

              Infrastructure
                    │
             Prometheus
                    ↓
                Grafana
```

### Repository

```text
ai-commerce-support/
│
├── web-ecom/                 # MedusaJS ecommerce
│
├── ai-platform/
│   ├── ollama/               # Local LLM runtime
│   ├── open-webui/           # AI UI / development
│   ├── rag/                  # RAG pipeline
│   ├── agent/                # Tool calling / agent
│   └── model-router/         # Model / request routing
│
├── n8n/
│   └── workflows/
│
├── observability/
│   ├── langfuse/             # AI tracing/evaluation
│   ├── prometheus/           # Metrics
│   └── grafana/              # Dashboard
│
├── tests/
│   ├── functional/
│   ├── e2e/
│   ├── ai-eval/
│   └── load/
│
├── docs/
│   ├── architecture.md
│   ├── user-flows.md
│   ├── ai-evaluation.md
│   ├── monitoring.md
│   ├── scaling.md
│   └── cost-optimization.md
│
├── docker-compose.yml
└── README.md
```

## Roadmap

| Phase | Nội dung              | Kết quả                                      |
| ----- | --------------------- | -------------------------------------------- |
| **1** | E-commerce Foundation | MedusaJS + DB chạy hoàn chỉnh                |
| **2** | Local AI Foundation   | Ollama + Open WebUI + local model            |
| **3** | RAG Chatbot           | Chatbot trả lời FAQ/policy từ knowledge base |
| **4** | AI Agent / Tools      | AI gọi Product/Inventory/Order API           |
| **5** | n8n Automation        | CRM/Email/Ticket/Webhook workflows           |
| **6** | AI Evaluation         | Dataset + benchmark model                    |
| **7** | Observability         | Langfuse + Prometheus + Grafana              |
| **8** | Load Test & Scaling   | k6 + tìm bottleneck + capacity planning      |
| **9** | Cost Optimization     | Routing/cache/model optimization             |

### Phase 1 — E-commerce

```text
MedusaJS
   ↓
PostgreSQL
   ↓
Products
Customers
Cart
Orders
Inventory
```

Tạo sample ecommerce data đủ lớn để AI có dữ liệu thực tế để làm việc.

**Done khi:** ecommerce chạy hoàn chỉnh bằng Docker.

### Phase 2 — Local AI

```text
Open WebUI
     ↓
Ollama
     ↓
Qwen / Llama
```

Thử nhiều local model và ghi nhận latency, RAM/VRAM, tốc độ generation.

**Done khi:** có thể chat ổn định với local model.

### Phase 3 — RAG

Knowledge:

```text
FAQ
Shipping
Payment
Return policy
Product knowledge
       ↓
    Embedding
       ↓
 Vector Search
       ↓
 Local LLM
```

Ví dụ:

```text
"Shop có đổi trả không?"
        ↓
Retrieve return-policy
        ↓
Qwen
        ↓
Answer + source
```

**Done khi:** chatbot trả lời knowledge dựa trên tài liệu thay vì kiến thức model.

### Phase 4 — AI Agent / Tool Calling

Cho AI khả năng sử dụng backend tools:

```text
search_products()
get_product()
get_inventory()
get_order_status()
```

Flow:

```text
"Đơn DH001 của tôi đâu?"

LLM
 ↓
detect order intent
 ↓
get_order_status("DH001")
 ↓
Medusa API
 ↓
Result
 ↓
Response
```

Các transaction như cancel/refund phải qua backend rules + auth + confirmation.

**Nguyên tắc:**

> **LLM hiểu ý định → Backend quyết định → Tool thực thi.**

### Phase 5 — n8n Automation

Không đưa core business logic vào n8n.

```text
AI / Backend
     ↓
  Webhook
     ↓
    n8n
  /   |    \
CRM Email Ticket
```

Demo các workflow như sales lead → CRM, complaint → ticket, critical error → notification.

### Phase 6 — AI Evaluation

Tạo benchmark dataset cố định:

```text
tests/ai-eval/

FAQ             100 cases
Product Search   50 cases
Order            30 cases
Fallback          20 cases
-------------------------
Total            200 cases
```

So sánh model:

```text
                 Qwen 8B     Qwen 14B

Accuracy           92%          96%
p95 latency        1.8s         3.7s
VRAM               6GB          11GB
Hallucination      3%           1%
Tokens/sec         70            40
```

Không đổi model dựa trên cảm giác; **benchmark trước rồi mới quyết định**.

### Phase 7 — Observability

Không tự xây lại monitoring platform.

```text
Langfuse
→ LLM trace
→ RAG
→ Prompt
→ Tokens
→ Latency
→ Evaluation

Prometheus
→ collect metrics

Grafana
→ CPU
→ RAM
→ GPU / VRAM
→ RPS
→ latency
→ errors
→ queue
```

Mục tiêu là trả lời được:

```text
Chatbot đang lỗi gì?
Chatbot chậm ở đâu?
Model nào đang chạy?
AI đang dùng bao nhiêu resource?
RAG có retrieve đúng không?
Model nào hiệu quả nhất?
```

### Phase 8 — Load Test & Scaling

Dùng k6:

```text
10 users
 ↓
50
 ↓
100
 ↓
200
 ↓
500
```

Theo dõi Grafana:

```text
Load
 ↓
Metrics
 ↓
Bottleneck

├── Node?
├── PostgreSQL?
├── Redis?
├── Ollama?
└── GPU?
```

Sau đó:

```text
Measure
   ↓
Find bottleneck
   ↓
Optimize
   ↓
Capacity estimate
   ↓
Scale
   ↓
Load test again
```

Không scale mù.

### Phase 9 — Cost Optimization

Dùng production metrics để phân loại request:

```text
User Message
     ↓
Request Router
     │
     ├── Greeting
     │      → Template
     │
     ├── Order ID
     │      → API
     │
     ├── Simple FAQ
     │      → Cache/Search
     │
     ├── Complex FAQ
     │      → RAG + Small LLM
     │
     └── Complex Task
            → Agent / Larger Model
```

Mục tiêu:

```text
LLM calls ↓
Tokens ↓
GPU usage ↓
Latency ↓
Infrastructure cost ↓

while

Answer quality ↑ / maintained
```

Đây sẽ là vòng đời liên tục chứ không phải phase làm một lần:

```text
             ┌───────────────┐
             │    Monitor    │
             └───────┬───────┘
                     ↓
                 Evaluate
                     ↓
                  Analyze
                     ↓
                  Optimize
                     ↓
                Load Test
                     ↓
                  Deploy
                     │
                     └──────────→ Monitor...
```

Tóm lại, project sẽ thể hiện được một chuỗi khá hoàn chỉnh:

**E-commerce → Local LLM → RAG → Agent → Automation → Evaluation → Observability → Scaling → Cost Optimization**

Và triết lý kỹ thuật xuyên suốt là: **không gọi AI khi rule/SQL/API có thể giải quyết chính xác; không đổi model nếu chưa benchmark; không scale nếu chưa đo được bottleneck.**
