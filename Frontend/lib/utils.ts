/**
 * 指定時間帯での時間オプションを生成するユーティリティ関数
 * @param startHour 開始時（既定: 0）
 * @param endHour 終了時（既定: 23）
 * @param intervalMinutes 分間隔（既定: 15）
 */
const generateTimeOptions = (startHour = 0, endHour = 23, intervalMinutes = 15) => {
  const options: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      // 終了時刻を越えないようにチェック
      if (h === endHour && m > 45) break;
      const hour = String(h).padStart(2, "0");
      const minute = String(m).padStart(2, "0");
      options.push(`${hour}:${minute}`);
    }
  }
  return options;
};

// 既定の時間選択オプション（00:00〜23:45）
export const TIME_OPTIONS = generateTimeOptions();

// 営業時間例（9:00-19:00、30分間隔）- 必要に応じて使用
export const BUSINESS_TIME_OPTIONS = generateTimeOptions(9, 19, 30);

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
export const WEEKDAYS_FULL = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

// カスタム時間オプション生成関数をエクスポート（必要に応じて使用）
export { generateTimeOptions };

