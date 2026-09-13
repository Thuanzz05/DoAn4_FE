---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/App.css","src/index.css"]
---

THESIS: Một trung tâm, một nguồn dữ liệu. Trang chủ giới thiệu hệ thống bằng bối cảnh trung tâm thật và một luồng nghiệp vụ rõ ràng, không dùng dashboard nội bộ làm hình ảnh tiếp thị.

OWN-WORLD: Nền giấy ngà pha xanh rất nhạt, chữ mực xanh đen, bề mặt xanh sage và một màu san hô dành cho hành động chính hoặc cảnh báo. Component có đường kẻ mảnh, góc bo vừa phải và thứ bậc nội dung rõ ràng.

STORY: Người xem nhận ra vấn đề dữ liệu rời rạc, thấy hệ thống hợp nhất lịch học, học phí, điểm danh, điểm số và chứng chỉ, hiểu cách ba vai trò dùng chung một nguồn dữ liệu, rồi chọn đăng nhập để vào không gian làm việc.

FIRST VIEWPORT: Header mảnh ở trên; cột trái chứa tiêu đề serif hai dòng, mô tả và nút Đăng nhập; cột phải là ảnh bối cảnh trung tâm cùng chú thích ba miền dữ liệu. Hero vừa đủ trong một màn hình desktop.

FORM: Hai route `/login` và `/register` dùng bố cục chia đôi trên desktop, đưa biểu mẫu lên trước trên màn hình hẹp và liên kết hai chiều. Route `/admin` là dashboard quản trị responsive; `/admin/students` bổ sung tìm kiếm, lọc, bảng hồ sơ và panel chi tiết. Toàn bộ số liệu nội bộ hiện tại được ghi rõ là minh họa. Form có trạng thái gửi, kiểm tra mật khẩu và thông báo trung thực khi backend chưa kết nối.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
