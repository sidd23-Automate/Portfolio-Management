import { openDB } from "idb";
import { empty, validateData, type Data } from "./model";
const db = () =>
  openDB("holdings-private", 1, {
    upgrade(d) {
      d.createObjectStore("dataset");
    },
  });
export async function load() {
  return validateData(
    (await (await db()).get("dataset", "current")) || empty(),
  );
}
export async function save(d: Data) {
  validateData(d);
  await (await db()).put("dataset", d, "current");
}
