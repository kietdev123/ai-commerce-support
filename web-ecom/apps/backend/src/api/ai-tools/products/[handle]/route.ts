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

  const handle = normalizeText(req.params.handle);
  const products = await loadCatalog(req);
  const product = products.find(
    (candidate) => normalizeText(candidate.handle) === handle,
  );

  if (!product) {
    res.status(404).json({
      error: {
        code: "product_not_found",
        message: "Không tìm thấy sản phẩm theo handle đã cung cấp.",
      },
    });
    return;
  }

  const availability = await loadAvailability(req, [product]);
  res.json({ product: presentProduct(product, availability) });
}
