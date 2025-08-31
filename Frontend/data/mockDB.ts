import { Animal, Record } from "@/types";

// Mock Database - 実際のアプリケーションではFirestoreなどに置き換える
export const MOCK_DB: {
  animals: { [key: string]: Animal };
  records: { [key: string]: Record[] };
} = {
  animals: {
    "1234567890": {
      microchip_number: "1234567890",
      farm_id: "佐藤牧場",
      name: "はなこ",
    },
    "0987654321": {
      microchip_number: "0987654321",
      farm_id: "佐藤牧場",
      name: "ももこ",
    },
    "1122334455": {
      microchip_number: "1122334455",
      farm_id: "鈴木牧場",
      name: "はなこ",
    },
    "5566778899": {
      microchip_number: "5566778899",
      farm_id: "高橋ファーム",
      name: "さくら",
    },
    "2233445566": {
      microchip_number: "2233445566",
      farm_id: "佐藤牧場",
      name: "たろう",
    },
    "3344556677": {
      microchip_number: "3344556677",
      farm_id: "田中牧場",
      name: "メリー",
    },
    "4455667788": {
      microchip_number: "4455667788",
      farm_id: "高橋ファーム",
      name: "ジョン",
    },
  },
  records: {
    "1234567890": [
      {
        id: "rec_1",
        visit_date: "2025-07-28",
        soap: {
          s: "農家より、昨日から食欲がなく元気がないとの稟告。",
          o: "体温39.5度。右前肢に軽度の跛行を認める。触診にて第一胃の運動が弱い。",
          a: "第一胃アシドーシスの疑い。",
          p: "補液と胃機能改善剤を投与。明日再診予定。",
        },
        medication_history: ["ビタミンB群", "ブドウ糖液"],
        next_visit_date: "2025-07-29T10:30",
        images: ["https://placehold.co/600x400/d1d5db/374151?text=患部の写真1"],
      },
    ],
    "0987654321": [
      {
        id: "rec_2",
        visit_date: "2025-07-27",
        soap: {
          s: "定期検診。",
          o: "健康状態良好。",
          a: "異常なし。",
          p: "経過観察。",
        },
        medication_history: [],
        next_visit_date: "2025-08-05T14:00",
        images: [],
      },
    ],
    "1122334455": [
      {
        id: "rec_3",
        visit_date: "2025-07-20",
        soap: {
          s: "咳が続いている。",
          o: "呼吸音に軽度のラッセル音。",
          a: "軽度の気管支炎。",
          p: "抗生物質を投与。",
        },
        medication_history: [],
        next_visit_date: "2025-08-10T09:00",
        images: [],
      },
    ],
    "5566778899": [
      {
        id: "rec_4",
        visit_date: "2025-08-01",
        soap: {
          s: "乳房炎の疑い。",
          o: "右後部乳房の腫脹と発赤。",
          a: "急性乳房炎",
          p: "抗生物質の局所注入。",
        },
        medication_history: [],
        next_visit_date: "2025-08-05T10:30",
        images: [],
      },
    ],
    "2233445566": [
      {
        id: "rec_5",
        visit_date: "2025-08-02",
        soap: {
          s: "食欲不振",
          o: "第一胃の運動低下",
          a: "消化不良",
          p: "胃運動促進剤の投与",
        },
        medication_history: [],
        next_visit_date: "2025-08-07T15:00",
        images: [],
      },
    ],
    "3344556677": [
      {
        id: "rec_6",
        visit_date: "2025-07-30",
        soap: {
          s: "跛行",
          o: "左後肢の蹄に熱感",
          a: "蹄葉炎の疑い",
          p: "抗炎症剤投与、削蹄",
        },
        medication_history: [],
        next_visit_date: "2025-08-08T11:00",
        images: [],
      },
    ],
    "4455667788": [
      {
        id: "rec_7",
        visit_date: "2025-07-25",
        soap: {
          s: "定期健康診断",
          o: "体温正常、健康状態良好",
          a: "異常なし",
          p: "次回の定期検診は3ヶ月後",
        },
        medication_history: [],
        next_visit_date: "2025-10-25T09:30",
        images: [],
      },
    ],
  },
};
