"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { clientAuth } from "./firebase";

/** The signed-in Firebase user: `undefined` while loading, `null` when signed out. */
export function useAuthUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(clientAuth(), setUser), []);
  return user;
}
