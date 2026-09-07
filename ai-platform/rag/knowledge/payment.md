# Thanh toán — môi trường demo

> Project hiện chưa tích hợp cổng thanh toán thật. Nội dung này mô tả đúng giới
> hạn kỹ thuật của môi trường local, không phải danh sách phương thức thanh toán
> production.

## Cấu hình hiện tại

- Medusa region Việt Nam sử dụng provider `pp_system_default`.
- Provider này phục vụ dữ liệu và luồng demo; không xử lý tiền thật.
- Chưa cấu hình COD, thẻ ngân hàng, chuyển khoản hoặc ví điện tử.
- Tiền tệ mặc định của storefront là VND; catalog mẫu cũng có giá USD phụ trợ.

## Quy tắc trả lời

- Không tuyên bố một giao dịch đã thanh toán nếu chưa gọi Order/Payment API.
- Không yêu cầu khách gửi số thẻ, CVV, mật khẩu, OTP hoặc thông tin đăng nhập
  trong hội thoại.
- Nếu khách hỏi phương thức thanh toán production, trả lời rằng môi trường hiện
  tại chỉ có thanh toán mô phỏng và cần tích hợp cổng thanh toán thật.
- Xác nhận thanh toán, hoàn tiền và đối soát là thao tác backend có xác thực;
  chatbot không tự quyết định hoặc tự thực thi.
