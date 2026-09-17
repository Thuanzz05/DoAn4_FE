---
name: Hệ thống quản lý trung tâm ngoại ngữ
description: Một ngôn ngữ giao diện rõ ràng cho luồng vận hành học vụ và tài chính.
colors:
  ink: "#092c28"
  ink-soft: "#385a53"
  paper: "#f2f6f0"
  paper-deep: "#e7eee8"
  sage: "#d7e4d8"
  sage-strong: "#bed2c1"
  line: "#c7d4cc"
  action-coral: "#e9553f"
  alert-coral: "#b83224"
  white: "#fbfdf9"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3rem, 5vw, 5.2rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.55
rounded:
  control: "10px"
  surface: "14px"
  panel: "16px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "54px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "46px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "48px"
---

# Design System: Hệ thống quản lý trung tâm ngoại ngữ

## Overview

**Creative North Star: "Một nguồn dữ liệu"**

Giao diện kể câu chuyện về một trung tâm được kết nối: con người thật ở tuyến đầu, dữ liệu rõ ràng ở phía sau và mọi vai trò cùng làm việc trên một nguồn thông tin thống nhất. Nền giấy sáng, đường kẻ chính xác và các trạng thái có ý nghĩa giữ cho nội dung đáng tin mà không biến trang chủ thành dashboard.

Newsreader tạo tiếng nói rõ ràng và có tính học thuật cho tiêu đề, trong khi Manrope giữ dữ liệu và điều khiển dễ đọc. Màu san hô xuất hiện có chủ đích ở hành động quan trọng hoặc điều kiện bị chặn.

**Key Characteristics:**

- Nền giấy ngà xanh với chữ mực xanh đen.
- Lưới, đường phân cách và nhãn trạng thái tạo cấu trúc.
- Bố cục bất đối xứng, nội dung nghiệp vụ là điểm nhìn chính.
- Chuyển động ngắn chỉ hỗ trợ việc đọc trạng thái.

## Colors

Bảng màu lấy độ tin cậy từ xanh đen và sage, sau đó dùng san hô như tín hiệu hiếm có chủ đích.

### Primary

- **Mực điều phối:** màu nền hành động chính, chữ quan trọng và panel nghiệp vụ tối.
- **San hô hành động:** dùng cho CTA lớn, tab đang chọn và tín hiệu cần chú ý.
- **San hô cảnh báo:** dùng cho chữ nhỏ hoặc badge cần tương phản cao.

### Neutral

- **Giấy vận hành:** nền trang chính.
- **Giấy phân lớp:** trạng thái thi, trường nhập liệu và vùng phân cấp nhẹ.
- **Đường hồ sơ:** divider, lưới lịch và viền điều khiển.
- **Mực dịu:** nội dung phụ và chú thích.

**The Rare Coral Rule.** San hô chỉ đánh dấu hành động chính hoặc ngoại lệ nghiệp vụ; không phủ đều khắp giao diện.

## Typography

**Display Font:** Newsreader, dự phòng Georgia và serif  
**Body Font:** Manrope, dự phòng sans-serif

**Character:** Serif có nét học thuật cho thông điệp lớn đi cùng sans-serif gọn, hiện đại cho dữ liệu vận hành.

### Hierarchy

- **Display** (600, co giãn theo viewport, line-height 0.92 đến 0.98): tiêu đề hero và tiêu đề section.
- **Title** (550 đến 600, 2.25rem đến 4rem): tiêu đề panel và vai trò.
- **Body** (400, 1rem, line-height 1.75): nội dung giải thích, giới hạn khoảng 65 ký tự mỗi dòng khi có thể.
- **Label** (700 đến 800, 0.58rem đến 0.88rem): trạng thái, điều hướng và dữ liệu ngắn.

**The Two Voices Rule.** Newsreader chỉ dẫn câu chuyện; Manrope điều khiển và báo cáo trạng thái.

## Layout

Trang dùng container rộng tối đa 1540px và khoảng trống lớn giữa các chương nội dung. Hero desktop chia bất đối xứng giữa thông điệp và ảnh bối cảnh trung tâm; các section tiếp tục nhịp đường kẻ thay vì chuỗi thẻ đồng đều. Ở dưới 900px, bố cục chuyển thành một cột và ảnh theo sau CTA.

## Elevation & Depth

Phần lớn bề mặt phẳng và được phân tách bằng sắc độ cùng đường kẻ. Shadow chỉ xuất hiện ở ảnh hero, panel quy tắc, dialog và nút hành động cần nổi khỏi mặt giấy.

### Shadow Vocabulary

- **Ambient panel:** bóng rộng, mềm và có độ lệch xuống cho bề mặt nổi lớn.
- **Action lift:** bóng gọn hơn cho nút chính ở trạng thái nghỉ và hover.

**The Paper First Rule.** Dùng đường kẻ hoặc đổi sắc độ trước; chỉ dùng shadow khi bề mặt thực sự nằm trên một lớp khác.

## Shapes

Điều khiển dùng góc 9 đến 10px; panel dùng 12 đến 16px. Badge trạng thái nhỏ có thể dùng dạng pill. Đường viền luôn mảnh 1px, giữ cảm giác của biểu mẫu và lịch làm việc.

## Components

### Buttons

- **Shape:** hình chữ nhật bo vừa, cao 46px hoặc 54px.
- **Primary:** nền mực điều phối, chữ sáng, icon mũi tên nằm sau nhãn.
- **Hover / Focus:** nâng nhẹ 2px, tăng bóng; focus dùng vòng san hô rõ ràng.
- **Outline:** nền trong suốt, viền mực và đổi sang nền mực khi hover.

### Chips

- **Style:** nhãn nhỏ, bo gọn; trạng thái bình thường dùng sage, cảnh báo dùng san hô đậm.

### Cards / Containers

- **Corner Style:** panel bo 14 đến 16px; điều khiển bo 8 đến 10px.
- **Background:** giấy sáng, sage hoặc mực tối tùy cấp độ.
- **Shadow Strategy:** chỉ panel nổi mới có ambient shadow.
- **Border:** đường mảnh màu Đường hồ sơ.

### Inputs / Fields

- **Style:** nền Giấy phân lớp, viền 1px và chiều cao 48px.
- **Focus:** viền mực cùng vòng focus xanh đen nhẹ.
- **Error:** dùng San hô cảnh báo cho chữ và viền.

### Navigation

Điều hướng dùng nhãn Manrope đậm, underline mảnh chạy vào khi hover hoặc focus. Mobile giữ wordmark và nút đăng nhập, ẩn các liên kết phụ.

### Trang đăng nhập

Route `/login` dùng bố cục chia đôi trên desktop: câu chuyện phân quyền và ảnh trung tâm ở bên trái, biểu mẫu tập trung ở bên phải. Trên tablet và mobile, biểu mẫu được đưa lên trước để hành động chính luôn xuất hiện sớm. Trường mật khẩu có điều khiển hiện hoặc ẩn, trạng thái gửi và phản hồi khi API chưa được kết nối.

### Trang đăng ký

Route `/register` dành riêng cho học viên tự tạo hồ sơ. Form thu thập họ tên, email, số điện thoại và mật khẩu; kiểm tra mật khẩu xác nhận ngay tại giao diện. Giáo viên và quản trị viên tiếp tục nhận tài khoản từ trung tâm. Trang đăng nhập và đăng ký liên kết hai chiều để người dùng không bị ngắt luồng.

### Dashboard quản trị viên

Route `/admin` chuyển ngôn ngữ thương hiệu sang một không gian làm việc dày thông tin hơn: sidebar mực xanh đen, topbar cố định và các panel phẳng được phân cấp bằng đường kẻ. Màn hình tổng quan ưu tiên chỉ số học viên, lớp học, lịch trong ngày, tình trạng học phí và cảnh báo nghiệp vụ. Dữ liệu hiện tại luôn được ghi rõ là minh họa cho đến khi kết nối API và phân quyền từ backend.

Ở dưới 820px, sidebar trở thành menu trượt có backdrop; lưới chỉ số chuyển thành hai cột, các panel xếp thành một cột và bảng học phí có thể cuộn ngang. Thông báo được mở tại chỗ để người quản trị không rời ngữ cảnh.

### Quản lý học viên

Route `/admin/students` dùng lại khung quản trị và đặt việc tra cứu lên trước. Ba chỉ số tóm tắt dẫn vào bảng hồ sơ có tìm kiếm theo tên, mã hoặc lớp và lọc theo trạng thái. Mỗi hàng mở panel chi tiết ở cạnh phải để xem thông tin liên hệ, lớp hiện tại, chuyên cần và học phí mà không mất vị trí trong danh sách. Bảng cuộn ngang trong chính panel trên màn hình hẹp, không làm tràn toàn trang.

### Quản lý lớp học

Route `/admin/classes` tiếp tục cùng mẫu tương tác với chỉ số sĩ số, phòng học, tìm kiếm, lọc trạng thái và panel chi tiết. Nội dung tập trung vào giáo viên, lịch, phòng, sĩ số và tiến độ để quản trị viên kiểm tra nhanh tình trạng từng lớp.

### Hero hình ảnh

Ảnh editorial chân thực về không gian trung tâm là điểm nhìn chính. Chú thích bên dưới kết nối ba miền Học vụ, Tài chính và Kết quả học tập, làm rõ thông điệp “cùng một nguồn dữ liệu” mà không mô phỏng màn hình nội bộ.

## Do's and Don'ts

### Do:

- **Do** dùng đường kẻ và khoảng trắng để biểu đạt cấu trúc nghiệp vụ.
- **Do** giữ màu san hô cho hành động quan trọng hoặc ngoại lệ thật sự.
- **Do** ghi rõ dữ liệu minh họa khi chưa có bằng chứng vận hành thực tế.
- **Do** duy trì focus rõ và hỗ trợ `prefers-reduced-motion`.

### Don't:

- **Don't** biến trang thành dãy thẻ tính năng cùng kích thước.
- **Don't** dùng gradient, glass hoặc bóng màu chỉ để trang trí.
- **Don't** dùng dashboard hoặc lịch học làm hình ảnh chính của trang giới thiệu công khai.
- **Don't** dùng màu san hô cho trạng thái thông thường.
