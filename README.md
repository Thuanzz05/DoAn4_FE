# FE_DoAn4

Frontend cho Đồ án 4, xây dựng bằng React, TypeScript và Vite.

## Chạy project

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trên terminal (mặc định là `http://localhost:5173`).

## Các lệnh chính

- `npm run dev`: chạy môi trường phát triển.
- `npm run build`: kiểm tra TypeScript và tạo bản production.
- `npm run lint`: kiểm tra chất lượng code.
- `npm test`: kiểm tra các handler giao diện bằng API giả lập, không thay đổi dữ liệu thật. Đây không thay thế kiểm thử đầu-cuối trên trình duyệt.
- `npm run preview`: xem thử bản production.

## Kiểm tra đầu vào

- Quản trị viên: Học viên → Thêm học viên (khóa có thể để trống) → Hồ sơ → Kiểm tra đầu vào.
- Ghi nhận kết quả đánh giá trực tiếp, trình độ và khóa đề xuất. Kết quả nhập sai được hủy có lý do, không xóa lịch sử.
- Ghi danh khóa đề xuất mở form ghi danh/xếp lớp để xác nhận, không tự tạo hóa đơn.
- Học viên: Kết quả học tập → Kiểm tra đầu vào, xem được ngay cả khi chưa ghi danh.
- Backend cần chạy `npm run migrate:academic-finance` trước khi dùng phiên bản này.
