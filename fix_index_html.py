import sys

path = "index.html"
with open(path) as f:
    content = f.read()

old1 = '<meta name="apple-mobile-web-app-capable" content="yes" />'
new1 = '<meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="mobile-web-app-capable" content="yes" />'

old2 = "<style>html,body{margin:0;padding:0;overflow-x:hidden;width:100%;font-family:'Inter',Roboto,-apple-system,'Segoe UI',sans-serif}*{box-sizing:border-box;font-family:inherit}</style>"
new2 = "<style>html,body{margin:0;padding:0;overflow-x:hidden;width:100%;font-family:'Inter',Roboto,-apple-system,'Segoe UI',sans-serif}*{box-sizing:border-box;font-family:inherit}::-webkit-scrollbar{width:0;height:0;background:transparent}*{scrollbar-width:none;-ms-overflow-style:none}</style>"

if old1 not in content:
    print("❌ Không tìm thấy dòng meta apple-mobile-web-app-capable — dừng lại, không sửa gì.")
    sys.exit(1)
if old2 not in content:
    print("❌ Không tìm thấy dòng style gốc — dừng lại, không sửa gì.")
    sys.exit(1)

content = content.replace(old1, new1)
content = content.replace(old2, new2)

with open(path, "w") as f:
    f.write(content)
print("✅ Đã sửa xong index.html — thêm meta tag + CSS ẩn scrollbar.")
