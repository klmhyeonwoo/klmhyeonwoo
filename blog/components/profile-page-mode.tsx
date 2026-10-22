"use client";

import type { ReactNode } from "react";
import type { Profile } from "@/lib/profile";
import { useAdminSession } from "./admin-session";
import { ProfileEditor } from "./profile-editor";

type Props = {
  profile: Profile;
  children: ReactNode;
};

/**
 * Keep the public profile statically rendered. Only an authenticated browser
 * replaces that read view with the editor after its private session check.
 */
export function ProfilePageMode({ profile, children }: Props) {
  const { authenticated } = useAdminSession();
  return authenticated === true ? <ProfileEditor profile={profile} /> : <>{children}</>;
}
