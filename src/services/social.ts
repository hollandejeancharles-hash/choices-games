import { playerAuth } from "./supabase";
export type InvitationKind = "circle" | "friend";
export interface Invitation {
  id: string;
  token: string | null;
  kind: InvitationKind;
  circleName: string | null;
  senderName: string;
  outgoing: boolean;
  email: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  delivery: "unsent" | "sending" | "sent" | "failed";
  createdAt: string;
}
export interface Friend {
  id: string;
  name: string;
}
export interface SocialState {
  friends: Friend[];
  invitations: Invitation[];
}
export interface InvitationPreview {
  token: string;
  kind: InvitationKind;
  outgoing: boolean;
  senderName: string;
  circleName: string | null;
}
async function rpc<T>(
  name: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await playerAuth.rpc(name, params);
  if (error) throw error;
  return data as T;
}
export const socialState = () => rpc<SocialState>("dilemma_social_state");
export const createInvitation = (
  kind: InvitationKind,
  circle: string | null,
  email: string | null,
  request: string,
) =>
  rpc<{ id: string; token: string }>("create_dilemma_invitation", {
    p_kind: kind,
    p_circle: circle,
    p_email: email,
    p_request: request,
  });
export const previewInvitation = (token: string) =>
  rpc<InvitationPreview>("preview_dilemma_invitation", { p_token: token });
export const respondInvitation = (token: string, accept: boolean) =>
  rpc<void>("respond_dilemma_invitation", { p_token: token, p_accept: accept });
export const cancelInvitation = (id: string) =>
  rpc<void>("cancel_dilemma_invitation", { p_id: id });
export const removeFriend = (id: string) =>
  rpc<void>("remove_dilemma_friend", { p_user: id });
export async function sendInvitationEmail(id: string) {
  const { data, error } = await playerAuth.functions.invoke("send-invitation", {
    body: { id },
  });
  if (error || !data?.sent) throw new Error("email-not-sent");
}
export function invitationToken(): string | null {
  const value = new URLSearchParams(location.search).get("invite");
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}
export function invitationLink(token: string) {
  return (
    location.origin +
    location.pathname +
    "?account=1&invite=" +
    encodeURIComponent(token)
  );
}
export function accountRedirect() {
  const token = invitationToken();
  return (
    location.origin +
    location.pathname +
    "?account=1" +
    (token ? "&invite=" + encodeURIComponent(token) : "")
  );
}

export function playerRecoveryRedirect() {
  return location.origin + location.pathname + "?account=1&player-recovery=1";
}

export function playerRecoveryRequested() {
  return new URLSearchParams(location.search).get("player-recovery") === "1";
}
