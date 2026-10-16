// Mã QR tối giản, không thư viện (byte mode, mức sửa lỗi M, phiên bản 1–10 ≈ tối đa 213 byte).
// Chuyển thể theo thuật toán chuẩn ISO/IEC 18004 (cách làm của Nayuki "QR Code generator").
// qrMatrix("https://app.fipilotai.com") → mảng 2 chiều true = ô đen.
const ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]; // số byte sửa lỗi / khối (theo phiên bản)
const BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]; // số khối sửa lỗi
const FORMAT_M = 0; // bit định dạng cho mức M

const rawModules = (v) => {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
};
const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC_M[v] * BLOCKS_M[v];

const gfMul = (x, y) => {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z & 0xff;
};
function rsDivisor(deg) {
  const r = new Array(deg).fill(0); r[deg - 1] = 1;
  let root = 1;
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0);
  for (const b of data) {
    const f = b ^ r.shift(); r.push(0);
    div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}
function alignPositions(v) {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let pos = v * 4 + 10; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function penalty(m) {
  const n = m.length; let p = 0;
  const lines = [];
  for (let y = 0; y < n; y++) lines.push(m[y]);
  for (let x = 0; x < n; x++) lines.push(m.map((row) => row[x]));
  for (const line of lines) {
    // Luật 1: dãy ≥ 5 ô cùng màu
    let run = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && line[i] === line[i - 1]) run++;
      else { if (run >= 5) p += 3 + (run - 5); run = 1; }
    }
    // Luật 3: mẫu giống ô định vị 1011101 có 4 ô trắng 1 bên
    const s = line.map((b) => (b ? "1" : "0")).join("");
    for (const pat of ["10111010000", "00001011101"]) { let i = s.indexOf(pat); while (i >= 0) { p += 40; i = s.indexOf(pat, i + 1); } }
  }
  // Luật 2: khối 2×2 cùng màu
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  // Luật 4: tỉ lệ ô đen lệch 50%
  let dark = 0; m.forEach((row) => row.forEach((b) => { if (b) dark++; }));
  p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return p;
}

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let v = 1;
  for (; v <= 10; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCodewords(v) * 8) break; }
  if (v > 10) throw new Error("Chuỗi quá dài cho mã QR");
  const cap = dataCodewords(v) * 8;
  // ---- bit dữ liệu ----
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4); push(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => push(b, 8));
  push(0, Math.min(4, cap - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // ---- sửa lỗi + xen kẽ khối ----
  const nb = BLOCKS_M[v], eccLen = ECC_M[v], raw = Math.floor(rawModules(v) / 8);
  const nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const codewords = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) codewords.push(b[i]); });

  // ---- vẽ mẫu cố định ----
  const size = v * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); }
    }
  }
  const al = alignPositions(v), last = al.length - 1;
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask) => {
    const d = (FORMAT_M << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (v >= 7) {
    let rem = v;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (v << 12) | rem;
    for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1; const a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, d); set(c, a, d); }
  }
  // ---- đặt dữ liệu theo đường zigzag ----
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && bi < codewords.length * 8) { mod[y][x] = ((codewords[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; }
    }
  }
  // ---- chọn mặt nạ ít điểm phạt nhất ----
  let best = null, bestP = Infinity;
  for (let k = 0; k < 8; k++) {
    const m = mod.map((row, y) => row.map((b, x) => (fn[y][x] ? b : b !== MASKS[k](x, y))));
    const keep = mod.map((r) => r.slice());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) mod[y][x] = m[y][x];
    drawFormat(k);
    const p = penalty(mod);
    if (p < bestP) { bestP = p; best = mod.map((r) => r.slice()); }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) mod[y][x] = keep[y][x];
  }
  return best;
}

// Đường SVG (mỗi ô đen 1 hình vuông 1×1), kèm lề trắng `quiet` ô — dùng viewBox = size + 2*quiet
export function qrSvgPath(matrix, quiet = 2) {
  let d = "";
  matrix.forEach((row, y) => row.forEach((b, x) => { if (b) d += `M${x + quiet} ${y + quiet}h1v1h-1z`; }));
  return d;
}
