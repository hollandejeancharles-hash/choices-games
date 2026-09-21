import { supabase } from "./supabase";

const VOTER_KEY = "dilemma.public-voter.v1";
let memoryVoter = "";

export interface PublicVoteState {
  mine: 0 | 1 | null;
  a: number;
  b: number;
}

export function publicVoterId() {
  if (memoryVoter) return memoryVoter;
  try {
    const stored = localStorage.getItem(VOTER_KEY);
    if (stored && /^[0-9a-f-]{36}$/i.test(stored)) {
      memoryVoter = stored;
      return stored;
    }
    memoryVoter = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY, memoryVoter);
    return memoryVoter;
  } catch {
    memoryVoter = crypto.randomUUID();
    return memoryVoter;
  }
}

export async function publicVote(
  question: string,
  option?: 0 | 1,
): Promise<PublicVoteState> {
  const { data, error } = await supabase.rpc("dilemma_public_vote", {
    p_question: question,
    p_voter: publicVoterId(),
    p_option: option ?? null,
  });
  if (error) throw error;
  return data as PublicVoteState;
}
