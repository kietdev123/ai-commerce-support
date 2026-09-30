import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import {
  authorizeAiTool,
  loadAvailability,
  loadCatalog,
  normalizeText,
  presentProduct,
} from "../../_shared";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!authorizeAiTool(req, res)) {
    return;
  }

  const sku = normalizeText(req.params.sku);
  const products = await loadCatalog(req);
  const product = products.find((candidate) =>
    (candidate.variants ?? []).some(
      (variant) => normalizeText(variant.sku) === sku,
    ),
  );

  if (!product) {
    res.status(404).json({
      error: {
        code: "sku_not_found",
        message: "Không tìm thấy biến thể theo SKU đã cung cấp.",
      },
    });
    return;
  }

  const availability = await loadAvailability(req, [product]);
  const presented = presentProduct(product, availability);
  const variant = presented.variants.find(
    (candidate) => normalizeText(candidate.sku) === sku,
  );

  if (!variant) {
    res.status(404).json({
      error: {
        code: "sku_not_found",
        message: "Không tìm thấy biến thể theo SKU đã cung cấp.",
      },
    });
    return;
  }

  res.json({
    inventory: {
      product_title: presented.title,
      product_handle: presented.handle,
      storefront_path: presented.storefront_path,
      ...variant,
    },
  });
}
