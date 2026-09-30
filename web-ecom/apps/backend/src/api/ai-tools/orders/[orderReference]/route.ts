import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  authorizeAiTool,
  formatMoney,
  getQueryString,
  normalizeText,
} from "../../_shared";

type OrderRecord = {
  id: string;
  display_id?: number | null;
  status?: string | null;
  fulfillment_status?: string | null;
  payment_status?: string | null;
  email?: string | null;
  currency_code?: string | null;
  total?: number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  metadata?: Record<string, unknown> | null;
  items?: Array<{
    id?: string | null;
    title?: string | null;
    product_title?: string | null;
    product_handle?: string | null;
    variant_title?: string | null;
    variant_sku?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
  }> | null;
};

const statusLabels: Record<string, string> = {
  pending: "Đang xử lý",
  completed: "Hoàn thành",
  canceled: "Đã hủy",
  archived: "Đã lưu trữ",
  draft: "Bản nháp",
  requires_action: "Cần xử lý",
  not_fulfilled: "Chưa giao",
  partially_fulfilled: "Đã giao một phần",
  fulfilled: "Đã giao",
  partially_shipped: "Đã vận chuyển một phần",
  shipped: "Đã vận chuyển",
  partially_delivered: "Đã giao một phần",
  delivered: "Đã giao hàng",
  not_paid: "Chưa thanh toán",
  awaiting: "Đang chờ thanh toán",
  authorized: "Đã xác thực thanh toán",
  partially_authorized: "Đã xác thực một phần",
  captured: "Đã thanh toán",
  partially_captured: "Đã thanh toán một phần",
  partially_refunded: "Đã hoàn tiền một phần",
  refunded: "Đã hoàn tiền",
};

const statusLabel = (status?: string | null) =>
  status ? statusLabels[status] ?? status : null;

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeAiTool(req, res)) {
    return;
  }

  const orderReference = getQueryString(req.params.orderReference).toUpperCase();
  const email = normalizeText(getQueryString(req.query.email));

  if (!orderReference || !email) {
    res.status(400).json({
      error: {
        code: "missing_order_verification",
        message: "Cần cung cấp cả mã đơn hàng và email đặt hàng.",
      },
    });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "fulfillment_status",
      "payment_status",
      "email",
      "currency_code",
      "total",
      "created_at",
      "updated_at",
      "metadata",
      "items.id",
      "items.title",
      "items.product_title",
      "items.product_handle",
      "items.variant_title",
      "items.variant_sku",
      "items.quantity",
      "items.unit_price",
    ],
    filters: { email },
    pagination: { take: 100 },
  });
  const orders = data as unknown as OrderRecord[];
  const order = orders.find(
    (candidate) =>
      String(candidate.metadata?.order_reference ?? "").toUpperCase() ===
        orderReference && normalizeText(candidate.email) === email,
  );

  if (!order) {
    res.status(404).json({
      error: {
        code: "order_not_found",
        message:
          "Không tìm thấy đơn hàng khớp với mã đơn và email đã cung cấp.",
      },
    });
    return;
  }

  const currencyCode = order.currency_code ?? "vnd";

  res.json({
    order: {
      order_reference: orderReference,
      display_id: order.display_id ?? null,
      status: order.status ?? null,
      status_label: statusLabel(order.status),
      fulfillment_status: order.fulfillment_status ?? null,
      fulfillment_status_label: statusLabel(order.fulfillment_status),
      payment_status: order.payment_status ?? null,
      payment_status_label: statusLabel(order.payment_status),
      created_at: order.created_at ?? null,
      updated_at: order.updated_at ?? null,
      total:
        typeof order.total === "number"
          ? {
              amount: order.total,
              currency_code: currencyCode,
              formatted: formatMoney(order.total, currencyCode),
            }
          : null,
      items: (order.items ?? []).map((item) => ({
        title: item.product_title ?? item.title ?? null,
        product_handle: item.product_handle ?? null,
        variant_title: item.variant_title ?? null,
        sku: item.variant_sku ?? null,
        quantity: item.quantity ?? null,
        unit_price:
          typeof item.unit_price === "number"
            ? {
                amount: item.unit_price,
                currency_code: currencyCode,
                formatted: formatMoney(item.unit_price, currencyCode),
              }
            : null,
      })),
      verified_by: "order_reference_and_email",
    },
  });
}
