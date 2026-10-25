"use client";
import { deferQueryScreen } from "@/components/providers/deferQueryScreen";
export default deferQueryScreen(() => import("./SubscriptionSuccessScreen"), { requireIdentity: false });
