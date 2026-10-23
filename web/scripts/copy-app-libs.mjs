// Dùng chung số liệu với app: chép kho món + công thức tính calo từ ../src sang web/lib/app (không sửa tay bản chép).
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const out = join(here, "..", "lib", "app");
mkdirSync(out, { recursive: true });
for (const [src, dst] of [["src/lib/localFoodDB.js", "localFoodDB.js"], ["src/lib/cookMethods.js", "cookMethods.js"], ["src/lib/foodSyn.js", "foodSyn.js"], ["src/lib/foodRef.js", "foodRef.js"], ["src/lib/foodDishes.js", "foodDishes.js"], ["src/calcMacro.js", "calcMacro.js"], ["src/pc/web/sources.js", "sources.js"]]) copyFileSync(join(root, src), join(out, dst));
console.log("copied app libs → web/lib/app");
