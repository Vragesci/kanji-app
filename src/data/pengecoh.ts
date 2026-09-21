import { shuffle } from "../engine/acak";
import type { Kosakata } from "../types";
import { SEMUA_KATA } from "./katalog";

/**
 * Pengecoh soal arti: pilihan salah diambil dari kosakata yang satu lingkup makna dengan kata soal
 * (mis. 南 → 北, 東, 西), bukan acak dari seluruh data. Kelompok ditulis tangan; kosakata yang
 * tidak masuk kelompok mana pun dicarikan pengecoh sejenis (kelas kata, tingkat, panjang arti).
 * Tidak ada arti yang dikarang: semua pilihan berasal dari arti di data.
 */
const KELOMPOK_MENTAH: Record<string, string> = {
  mataangin: "北 南 東 西",
  posisi: "上 下 左 右 前 後ろ 横 外 中 隣 近く 入口 出口 西側 裏側 底 隅 奥行き",
  angka: "二 三 四 五 六 七 八 九 十 百 千 万 半 数",
  hitungan: "一つ 二つ 三つ 四つ 五つ 六つ 七つ 八つ 九つ",
  uang: "円 百円 千円 一万円 三百 お金 給料 税金 価格 値段 賞金 金銭",
  bulan: "二月 三月 四月 六月 七月 八月 九月 十月 今月 正月 お正月",
  hari: "月曜日 火曜日 水曜日 木曜日 金曜日 土曜日 日曜日",
  musim: "春 夏 秋 冬",
  warna: "赤 青 黒 白 緑 黄色 紫 色",
  keluarga: "父 母 兄 姉 弟 妹 夫 妻 両親 お父さん お母さん お兄さん お姉さん 息子 娘 子供 子ども 親 家族 兄弟 孫 叔母さん 親類 家内 夫婦 夫妻",
  tubuh: "手 足 目 耳 口 頭 顔 体 腰 首 肩 胸 髪 歯 指 骨 お腹 背中 肌 爪 脳 心臓 肝臓 筋肉 涙 汗 身体",
  cuaca: "晴れ 雨 雪 風 曇り 台風 天気 雲 気温 津波 地震",
  waktu: "今日 昨日 明日 今年 去年 来年 昨年 毎日 毎年 今週 先週 来週 週末 一昨日 翌日 翌年 今 朝 昼 夜 夕方 午前 午後 時間",
  tempat: "銀行 駅 学校 病院 図書館 博物館 公園 動物園 郵便局 食堂 お寺 神社 店 町 市 会社 工場 空港 港 橋 事務所 市役所 台所 部屋 庭 家 大学 本屋 交番",
  makanan: "お茶 お酒 野菜 牛肉 牛乳 豚肉 卵 ご飯 塩 油 米 肉 果物 紅茶 お湯 湯 飲み物 料理 味",
  alam: "山 川 海 島 森 空 石 砂 岩 湖 池 谷 波 星 太陽 地球 花 桜 植物 岸 岬 丘 陸",
  hewan: "犬 魚 金魚 動物 蛸 白鳥 恐竜 穴熊",
  kendaraan: "車 電車 自転車 船 飛行機 新幹線 地下鉄 救急車 消防車",
  benda: "机 椅子 鏡 窓 傘 鍋 箸 皿 靴 財布 鋏 封筒 箱 定規 切符 手紙 辞書 新聞 紙 絵 写真 時計 薬",
  pakaian: "服 着物 浴衣 上着 帽子 水着",
  orang: "先生 学生 医者 歌手 社長 部長 課長 社員 大工 弁護士 看護師 講師 漁師 泥棒 警官 記者 客 店長 店員 友達 友だち 大統領 首相 大臣",
  sekolah: "勉強 宿題 試験 授業 教室 教科書 黒板 卒業 入学 教員 教師 教授 学期 生徒",
};

/** kata → nama kelompoknya (satu kata hanya di satu kelompok; yang pertama menang) */
export const KELOMPOK_KATA = new Map<string, string>();
for (const [nama, daftar] of Object.entries(KELOMPOK_MENTAH)) {
  for (const kata of daftar.split(/\s+/)) if (!KELOMPOK_KATA.has(kata)) KELOMPOK_KATA.set(kata, nama);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Huruf pertama kapital di layar, supaya gaya penulisan arti (mis. "tiba tiba" vs "Selatan") tidak membocorkan jawaban. */
export const kapital = (s: string): string => (/^[a-z]/.test(s) && s.length > 2 ? s[0]!.toUpperCase() + s.slice(1) : s);

type Kelas = "kerja" | "sifat-i" | "sifat-na" | "benda";
export function kelasKata(kata: string, v: Kosakata): Kelas {
  if (/（な）$|的$/.test(kata)) return "sifat-na";
  if (/(します|する)$/.test(kata)) return "kerja";
  if (/い$/.test(kata) && /い$/.test(v.kana) && kata.length >= 2 && !/^お/.test(kata)) return "sifat-i";
  if (/[一-龯ぁ-ん][うくぐすつぬぶむる]$/.test(kata) && /[うくぐすつぬぶむる]$/.test(v.kana)) return "kerja";
  return "benda";
}

/** dua arti dianggap bertumpuk kalau sama, atau yang satu memuat yang lain ("Ayah" dan "Ayah (sapaan)") */
const bertumpuk = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);

/** Tiga arti pengecoh (bukan arti yang benar), satu lingkup makna bila ada. */
export function pengecohArti(kata: string, v: Kosakata, n = 3): string[] {
  const benar = norm(v.arti);
  const hasil: string[] = [];
  const dipakai: string[] = [benar];
  const tambah = (arti: string) => {
    const k = norm(arti);
    if (!k || dipakai.some((d) => bertumpuk(d, k))) return;
    dipakai.push(k);
    hasil.push(arti);
  };

  // 1. kata sekelompok makna
  const grup = KELOMPOK_KATA.get(kata);
  if (grup) {
    for (const x of shuffle(SEMUA_KATA.filter((y) => y.kata !== kata && KELOMPOK_KATA.get(y.kata) === grup))) {
      if (hasil.length >= n) break;
      tambah(x.v.arti);
    }
  }
  if (hasil.length >= n) return hasil;

  // 2. sejenis: kelas kata sama, tingkat sama, panjang arti mirip (acak ringan supaya tidak selalu itu-itu saja)
  const kls = kelasKata(kata, v);
  const panjang = v.arti.length;
  const skor = (y: { kata: string; v: Kosakata }) =>
    (kelasKata(y.kata, y.v) === kls ? 0 : 100) +
    (y.v.tingkat === v.tingkat ? 0 : 20) +
    (KELOMPOK_KATA.has(y.kata) ? 15 : 0) + // kata dari kelompok lain kurang cocok sebagai pengecoh umum
    Math.abs(y.v.arti.length - panjang) / 2 +
    Math.abs(y.kata.length - kata.length) * 3 + // bentuk kata mirip (mis. dua kanji dengan dua kanji)
    Math.random() * 12;
  const sisa = SEMUA_KATA.filter((y) => y.kata !== kata).map((y) => ({ y, s: skor(y) })).sort((a, b) => a.s - b.s);
  for (const { y } of sisa) {
    if (hasil.length >= n) break;
    tambah(y.v.arti);
  }
  return hasil;
}
