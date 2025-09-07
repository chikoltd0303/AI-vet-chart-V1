import type { Animal, Record } from "@/types";

export const MOCK_DB: {
  animals: { [key: string]: Animal };
  records: { [key: string]: Record[] };
} = {
  animals: {
    "1234567890": { id: "1234567890", microchip_number: "1234567890", farm_id: "佐藤牧場", name: "はな" },
    "0987654321": { id: "0987654321", microchip_number: "0987654321", farm_id: "伊藤牧場", name: "たろう" },
    "1122334455": { id: "1122334455", microchip_number: "1122334455", farm_id: "鈴木牧場", name: "さくら" },
    "5566778899": { id: "5566778899", microchip_number: "5566778899", farm_id: "田中牧場", name: "こむぎ" },
    "2233445566": { id: "2233445566", microchip_number: "2233445566", farm_id: "高橋牧場", name: "モカ" },
    "3344556677": { id: "3344556677", microchip_number: "3344556677", farm_id: "中村牧場", name: "ラテ" },
    "4455667788": { id: "4455667788", microchip_number: "4455667788", farm_id: "山本牧場", name: "ジロー" },
  },
  records: {
    "1234567890": [],
    "0987654321": [],
    "1122334455": [],
    "5566778899": [],
    "2233445566": [],
    "3344556677": [],
    "4455667788": [],
  },
};
