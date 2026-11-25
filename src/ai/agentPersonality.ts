/** Stable synthetic personality, derived from employee ID; no save migration required. */
export interface AgentPersonality {
  focus: number;
  sociability: number;
  resilience: number;
}
export function personalityFor(agentId: string): AgentPersonality {
  const score = (salt: string): number => {
    let hash = 2166136261;
    for (const c of salt + ':' + agentId) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    return 25 + ((hash >>> 0) % 51);
  };
  return {focus:score('focus'),sociability:score('social'),resilience:score('resilience')};
}
