# Sprint 06 — AI Brain 3.0 foundation
Base: 636e2b9908d11ad840a64cf5897bceb2a6f9c9c8, V0.3 RC1 (CI passed).
## Implemented
Career profile derived from actual retained completed tasks, deduplicated by task ID: low 10, medium 20, high 30 XP; milestones 0/60/180/360. Experience levels are advisory, not formal employment positions or automatic promotion. No financial or personnel mutation. Goal planner prioritizes recovery, working hours, assigned work, blocked-work discussion, mentoring or learning. Learning is a goal label only, not a new activity or skill award. Mentoring is contextual dialogue, not verified skill transfer. Reflection at most once per day while retained in bounded memory, recorded after completed work when no dialogue is selected. Existing memory persistence reused, no migration. Three new regression tests authored; CI pending.
## Shared integration contract
UI may call careerProfile(agent.id, company.tasks.getTasksForAgent(agent.id)) and planCareer(agent,snapshot,tasks). HR owns formal title, salary, employment and promotion decisions. XP is derived from retained task history, not a durable independent ledger; retain completed tasks or implement a migration before pruning. No new agent states, no external API. Preserve all existing public interfaces.
## Next
HR and ownership/board decisions on separate backend branch; visual upgrades on separate scene branch. Do not dynamically alter 20-agent roster until save identity migration and safe desk allocation are coordinated. No deployment and no changes to main or V0.3 RC1.
