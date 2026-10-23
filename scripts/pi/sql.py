#!/usr/bin/env python3
"""23/10 — Sinh migration món Pi bộ mới từ src/pi/manifest.json (chạy sau build.py):
    python3 scripts/pi/sql.py > supabase/migrations/<14 số>_pi_bo_moi.sql
Giá theo ô khớp src/pi/piCatalog.js PRICE. Chạy lại migration vẫn an toàn (đã có món thì giữ chỉnh sửa của Quản trị)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
man = json.load(open(os.path.join(ROOT, "src", "pi", "manifest.json"), encoding="utf-8"))
PRICE = {"giay": 80, "toc": 100, "gang": 100, "co": 100, "mat": 120, "tay": 150, "dau": 150, "lung": 200, "ao": 250, "phong": 400}
EV = ["tet", "trungthu", "halloween", "giangsinh", "muadong", "muahe"]
q = lambda s: "'" + str(s).replace("'", "''") + "'"
rows = [f"  ({q(it['id'])},{q(it['name'])},{q(it['slot'])},'common',{PRICE.get(it['slot'], 100)},1,array[{q(it['g'])}],false,{2000 + i})" for i, it in enumerate(man["items"])]
for j, ev in enumerate(e for e in EV if man["rooms"].get(e)):
    rows.append(f"  ({q('phong-' + ev)},{q('Phòng ' + man['events'][ev])},'phong','common',{PRICE['phong']},1,array['nam','nu'],false,{3000 + j})")
ids = ", ".join(q(it["id"]) for it in man["items"]) + ", " + ", ".join(q("phong-" + e) for e in EV if man["rooms"].get(e))
print(open(os.path.join(ROOT, "scripts", "pi", "migration_head.sql"), encoding="utf-8").read().rstrip())
print("\n-- ===== Món bộ mới (sinh từ src/pi/manifest.json bằng scripts/pi/sql.py) =====")
print("insert into public.pet_items (id, name, slot, rarity, price, level, variants, achievement, sort) values")
print(",\n".join(rows) + "\non conflict (id) do nothing;")
print(open(os.path.join(ROOT, "scripts", "pi", "migration_tail.sql"), encoding="utf-8").read().replace("__NEW_IDS__", ids).rstrip())
