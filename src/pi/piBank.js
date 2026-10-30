// 24/10 — bộ câu thoại Pi (src/pi/chatLines.json, chép từ game/pi_chat_lines.json) + hàm chọn câu gắn sẵn bộ câu
import bank from "./chatLines.json";
import { linesIndex, pickLine as pick, lineById as byId } from "./piLines.js";
export const GROUPS = linesIndex(bank);
export const pickLine = (ma, opts) => pick(GROUPS, ma, opts);
export const lineById = (id, vars, g) => byId(GROUPS, id, vars, g);
export * from "./piLines.js";
