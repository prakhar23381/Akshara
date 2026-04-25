import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ProfileSetupData {
  name: string;
  setName: (n: string) => void;
  age: number | null;
  setAge: (a: number) => void;
  avatar: string | null;
  setAvatar: (a: string) => void;
}

const ProfileSetupContext = createContext<ProfileSetupData | null>(null);

export function ProfileSetupProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  return (
    <ProfileSetupContext.Provider value={{ name, setName, age, setAge, avatar, setAvatar }}>
      {children}
    </ProfileSetupContext.Provider>
  );
}

export function useProfileSetup() {
  const ctx = useContext(ProfileSetupContext);
  if (!ctx) throw new Error("useProfileSetup must be used inside ProfileSetupProvider");
  return ctx;
}
