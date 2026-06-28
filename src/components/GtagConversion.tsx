"use client";
import { useEffect } from "react";

interface UserData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
}

export function GtagConversion({
  sendTo,
  value,
  currency,
  userData,
}: {
  sendTo: string;
  value?: number;
  currency?: string;
  userData?: UserData;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      if (userData && Object.values(userData).some(Boolean)) {
        window.gtag("set", "user_data", {
          ...(userData.email && { email: userData.email }),
          ...(userData.phone_number && { phone_number: userData.phone_number }),
          ...((userData.first_name || userData.last_name) && {
            address: {
              ...(userData.first_name && { first_name: userData.first_name }),
              ...(userData.last_name && { last_name: userData.last_name }),
            },
          }),
        });
      }
      window.gtag("event", "conversion", {
        send_to: sendTo,
        ...(value !== undefined && { value }),
        ...(currency !== undefined && { currency }),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
