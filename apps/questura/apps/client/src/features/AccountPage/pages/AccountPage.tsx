"use client";
import { deferQueryScreen } from "@/components/providers/deferQueryScreen";
export default deferQueryScreen(() => import("./AccountScreen"), { redirect: '/account' });
