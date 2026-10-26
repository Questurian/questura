"use client";
import { deferQueryScreen } from "@/components/providers/deferQueryScreen";
export default deferQueryScreen(() => import("./EmailChangeScreen"), { redirect: '/account/change-email' });
