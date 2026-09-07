# Câu hỏi thường gặp — AI Commerce Support

> Phạm vi: nội dung dùng cho môi trường demo của project. Các dữ liệu động như
> giá hiện tại, tồn kho và trạng thái đơn hàng phải lấy từ Medusa API ở Phase 4,
> không được suy đoán từ tài liệu này.

## Cửa hàng bán những nhóm sản phẩm nào?

Catalog demo có bốn nhóm: Laptops, Phones & Tablets, Audio & Wearables và
Accessories. Tổng cộng có 24 sản phẩm, mỗi sản phẩm có hai phiên bản Standard
và Pro.

## Sản phẩm được bảo hành bao lâu?

Tất cả sản phẩm trong catalog demo có thời hạn bảo hành 24 tháng. Đây là dữ
liệu metadata của catalog mẫu.

## Cửa hàng giao hàng ở đâu?

Vùng giao hàng hiện được cấu hình cho Việt Nam. Project chưa cấu hình giao hàng
quốc tế.

## Có những phương thức giao hàng nào?

- Standard Shipping: 30.000₫, dự kiến 2–4 ngày làm việc.
- Express Shipping: 80.000₫, giao trong ngày tại khu vực được hỗ trợ.

Phí và phương thức cuối cùng phải được xác nhận lại tại checkout.

## Có hỗ trợ COD hoặc thanh toán online thật không?

Chưa. Môi trường hiện tại dùng `pp_system_default` để mô phỏng vòng đời thanh
toán của Medusa. Không được nói rằng giao dịch thực, COD, thẻ hoặc ví điện tử đã
được hỗ trợ.

## Có thể đổi trả sản phẩm không?

Có trong phạm vi chính sách demo: khách hàng gửi yêu cầu trong vòng 7 ngày kể
từ khi nhận hàng. Điều kiện và trường hợp loại trừ nằm trong tài liệu
`returns.md`.

## Chatbot có thể kiểm tra giá, tồn kho hoặc đơn hàng không?

Chưa ở Phase 3. Chatbot hiện trả lời từ knowledge base tĩnh. Các câu hỏi cần dữ
liệu thời gian thực như giá, tồn kho, trạng thái đơn hoặc hoàn tiền phải được
chuyển sang Medusa API/tool calling ở Phase 4.

## Khi không tìm thấy thông tin thì chatbot phải làm gì?

Chatbot phải nói rõ chưa có thông tin trong tài liệu và đề nghị người dùng cung
cấp thêm chi tiết hoặc liên hệ nhân viên hỗ trợ. Không được tự bịa chính sách,
giá, tồn kho hay trạng thái đơn hàng.
