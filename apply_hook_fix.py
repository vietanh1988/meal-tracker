import sys

old = '''  const saveDefaultTemplate = useCallback(async (name, dayType, mealsData, totalCal) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("weekly_templates").insert({
        user_id: userId,
        name: name || "Template mới",
        day_name: "thu_2",
        day_type: dayType,
        meals: mealsData,
        total_cal: totalCal || 0,
        is_default: true,
      });
      if (error) { console.error("Save default template error:", error); return; }
      console.log("✅ Default template saved:", name);
      const { data: refreshed } = await supabase.from("weekly_templates")
        .select("*").eq("is_default", true).order("created_at");
      if (refreshed) setDefaultTemplates(refreshed);
    } catch (e) { console.error("Default template error:", e); }
  }, [userId]);'''

new = '''  const saveDefaultTemplate = useCallback(async (name, dayType, mealsData, totalCal, editId = null) => {
    if (!userId) return;
    try {
      if (editId) {
        const { error } = await supabase.from("weekly_templates").update({
          name: name || "Template mới",
          day_type: dayType,
          meals: mealsData,
          total_cal: totalCal || 0,
        }).eq("id", editId);
        if (error) { console.error("Update default template error:", error); return; }
        console.log("✅ Default template updated:", name);
      } else {
        const { error } = await supabase.from("weekly_templates").insert({
          user_id: userId,
          name: name || "Template mới",
          day_name: "thu_2",
          day_type: dayType,
          meals: mealsData,
          total_cal: totalCal || 0,
          is_default: true,
        });
        if (error) { console.error("Save default template error:", error); return; }
        console.log("✅ Default template saved:", name);
      }
      const { data: refreshed } = await supabase.from("weekly_templates")
        .select("*").eq("is_default", true).order("created_at");
      if (refreshed) setDefaultTemplates(refreshed);
    } catch (e) { console.error("Default template error:", e); }
  }, [userId]);'''

path = "src/hooks/useUserData.js"
with open(path) as f:
    content = f.read()

if old not in content:
    print("❌ KHÔNG TÌM THẤY đoạn code cần thay — có thể file đã khác. Dừng lại, không sửa gì.")
    sys.exit(1)

count = content.count(old)
if count > 1:
    print(f"❌ Tìm thấy {count} chỗ khớp (nên chỉ có 1) — dừng lại để an toàn.")
    sys.exit(1)

content = content.replace(old, new)
with open(path, "w") as f:
    f.write(content)
print("✅ Đã sửa xong src/hooks/useUserData.js — saveDefaultTemplate giờ hỗ trợ cả tạo mới và cập nhật.")
