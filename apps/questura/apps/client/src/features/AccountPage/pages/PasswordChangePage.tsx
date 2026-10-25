"use client";
import { deferQueryScreen } from "@/components/providers/deferQueryScreen";
export default deferQueryScreen(() => import("./PasswordChangeScreen"), { redirect: '/account/change-password' });
