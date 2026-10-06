import { connection } from "next/server";
import { readState } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json(await readState());
}
