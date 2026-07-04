import { Component } from "react";
import { C, card, redBtn } from "./theme";

// Bọc quanh toàn bộ <App/> — nếu 1 component con lỗi lúc render (runtime error),
// React sẽ unmount toàn bộ cây về phía trên component lỗi nếu không có
// Error Boundary nào bắt, khiến cả app thành trang trắng. Boundary này chặn
// lỗi lại ở đây, hiện màn hình thân thiện thay vì trắng trang.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Lỗi runtime bị chặn:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ fontFamily: "'Inter',Roboto,-apple-system,'Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <img src="/logo.png" alt="Fipilot AI" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover" }} />
            </div>
            <div style={{ ...card, textAlign: "center", padding: "32px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😵</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, marginBottom: 8 }}>Đã có lỗi xảy ra</div>
              <div style={{ fontSize: 14, color: C.t2, marginBottom: 20, lineHeight: 1.5 }}>Ứng dụng gặp sự cố ngoài dự kiến. Thử tải lại trang — dữ liệu của bạn vẫn an toàn.</div>
              <button onClick={() => window.location.reload()} style={redBtn}>🔄 Tải lại trang</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
