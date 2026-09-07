Dưới đây là bản docs ngắn gọn, theo hướng **ưu tiên Rule/API/Search, hạn chế LLM để giảm chi phí**.

# Ecommerce AI Chatbot – Use Cases & Technical Design

## 1. Nguyên tắc

Ưu tiên xử lý theo thứ tự:

```text
Rule / Regex
    ↓
Cache / FAQ
    ↓
Search / Database
    ↓
Backend API
    ↓
Small LLM
    ↓
RAG + LLM
    ↓
AI Agent
    ↓
Human Support
```

**Không dùng AI nếu Rule, SQL, Search hoặc API có thể giải quyết chính xác.**

---

## 2. Use Cases

| Use Case            | Ví dụ                               | Giải pháp               | AI |
| ------------------- | ----------------------------------- | ----------------------- | -- |
| Greeting            | "Xin chào"                          | Template                | ❌  |
| FAQ đơn giản        | "Có COD không?"                     | FAQ Search / Cache      | ❌  |
| Chính sách phức tạp | "Trường hợp này có được đổi không?" | RAG                     | ✅  |
| Giá sản phẩm        | "iPhone này bao nhiêu?"             | Product API / DB        | ❌  |
| Tồn kho             | "Còn iPhone 17 không?"              | Inventory API           | ❌  |
| Tìm sản phẩm        | "Laptop dưới 20tr, RAM 16GB"        | Search + Filter         | ⚠️ |
| Tư vấn sản phẩm     | "Laptop nào phù hợp để code?"       | Search + LLM            | ✅  |
| So sánh sản phẩm    | "So sánh A và B"                    | Product API + LLM       | ✅  |
| Tra cứu đơn         | "Đơn DH123 đâu rồi?"                | Order API               | ❌  |
| Hủy/đổi đơn         | "Hủy DH123"                         | Backend Business Rules  | ❌  |
| Sales Lead          | "Công ty cần mua 500 license"       | Classification → CRM    | ⚠️ |
| Khiếu nại           | "Đơn giao sai, tôi rất bực"         | Classification → Ticket | ⚠️ |
| Yêu cầu phức tạp    | Nhiều bước/API                      | AI Agent + Tools        | ✅  |
| Không xử lý được    | AI/Search confidence thấp           | Human Handoff           | ❌  |

`⚠️` = chỉ dùng AI khi Rule/Search không đủ.

---

## 3. Các flow chính

### FAQ

Luồng đang chạy ở Phase 3:

```text
Question
 ↓
Dify Knowledge Retrieval
 ↓
Semantic Search (bge-m3, Top K 4, threshold 0.25)
 ↓
Retrieved context + source
 ↓
Qwen 3 1.7B
 ↓
Answer + citation
```

Knowledge hiện gồm FAQ, shipping, payment demo, return policy demo và hướng dẫn
24 sản phẩm. Nếu không có context đủ tin cậy, model phải từ chối suy đoán.

Luồng routing/cache dưới đây là kiến trúc mục tiêu cho các phase tối ưu sau:

```text
Question
 ↓
FAQ Search
 ↓
High confidence?
 ├─ Yes → Stored Answer
 └─ No  → RAG → LLM
```

Kỹ thuật: Semantic Search, Embedding, Vector DB, RAG.

### Product Search

```text
User Request
 ↓
Extract filters
 ↓
Product DB / Search
 ↓
Ranking
 ↓
Results
```

Nếu câu phức tạp:

```text
LLM → Structured JSON → Product Search
```

### Order Tracking

```text
User
 ↓
Authentication
 ↓
Extract Order ID
 ↓
Order API
 ↓
Response Template
```

Không cần LLM nếu xác định được order.

### Cancel / Change Order

```text
Request
 ↓
Authentication
 ↓
Order API
 ↓
Business Rules
 ↓
Confirmation
 ↓
Execute
 ↓
Audit Log
```

AI **không quyết định business rule**.

### Product Recommendation

```text
User Requirement
 ↓
LLM Extract Requirements
 ↓
Product Search
 ↓
Ranking
 ↓
LLM Explain
```

### Sales Lead

```text
Message
 ↓
Intent Classification
 ↓
Extract Lead Information
 ↓
Webhook
 ↓
n8n
 ↓
CRM
 ↓
Assign Sales
```

### Complaint

```text
Message
 ↓
Classification / Sentiment
 ↓
Create Ticket
 ↓
Priority
 ↓
Human Support
```

### AI Agent

Chỉ dùng cho yêu cầu nhiều bước.

```text
User Goal
 ↓
Agent
 ├─ Product API
 ├─ Order API
 ├─ CRM
 ├─ RAG
 └─ Ticket API
 ↓
Response
```

Ví dụ:

> "Kiểm tra đơn gần nhất, nếu trễ hơn 3 ngày thì tạo ticket."

### Human Handoff

```text
Low confidence
OR
Sensitive action
OR
Customer complaint
OR
AI cannot answer
        ↓
Human Support
```

---

## 4. Kiến trúc tổng thể

```text
                         User
                           ↓
                     Chat Backend
                           ↓
                     Intent Router
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
       Rules           FAQ Search       Backend API
          ↓                ↓                ↓
       Template         RAG            DB / Services
                           │
                           ↓
                         LLM
                           │
                     Complex task?
                           ↓
                        Agent
                           │
                    Tool Calling
                           ↓
                 External Services

CRM / Zalo / Email / Ticket
            ↑
           n8n
```

---

## 5. Vai trò công nghệ

```text
Node.js
→ API + Business Logic

PostgreSQL
→ Product / Order / Conversation

Weaviate (Dify source stack hiện tại)
→ Vector Search / RAG

Ollama
→ Local LLM

Cloud LLM
→ Complex reasoning / fallback

Dify
→ Chatflow / RAG / Agent / internal AI Studio / Service API

bge-m3 qua Ollama
→ Embedding tài liệu và truy vấn RAG

n8n
→ Automation / Integration

Redis
→ Cache / Session / Queue

Sentry
→ Error Monitoring

Prometheus + Grafana
→ Infrastructure / Metrics
```

---

## 6. Nguyên tắc Production

**AI dùng cho:**

```text
Understand language
Classification
Information extraction
RAG
Recommendation explanation
Summarization
Complex reasoning
Agent planning
```

**Backend dùng cho:**

```text
Authentication
Authorization
Price
Inventory
Order
Payment
Business Rules
Transactions
Validation
Audit
```

**n8n dùng cho:**

```text
CRM
Email
Zalo
Notification
Webhook
Scheduled automation
External integrations
```

### Quy tắc quan trọng

> **LLM hiểu ý định. Backend quyết định. Tool thực thi.**

Không để LLM tự quyết định các thao tác quan trọng như payment, refund, giá, permission hoặc transaction.
