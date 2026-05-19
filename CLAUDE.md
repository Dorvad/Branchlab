# BranchLab Project Instructions

BranchLab is a branching-video scenario maker and player.

The app lets creators:
- Create branching video scenarios
- Upload or attach video clips
- Build a scenario as a visual graph
- Add choices that connect one video node to another
- Preview the scenario
- Validate the scenario
- Publish it to a unique public URL

The app has two major modes:

1. Creator Studio
A desktop-first scenario editor with a visual node graph.

2. Scenario Player
A mobile-first public player where users play through the branching video experience.

Core product model:
- Scenario = a project
- Node = a video scene
- Choice = a button shown after a video
- Edge = connection from one node to another
- Ending node = final state
- Published scenario = locked playable version with a public slug

Development rules:
- Build incrementally.
- Do not overbuild.
- Do not add Supabase until the local mock version works.
- Do not add AI features until the core editor and player work.
- Keep scenario logic data-driven.
- Keep types clean and centralized.
- Prefer simple, understandable code over clever abstractions.
- Use TypeScript strictly.
- Use modular components.
- Make the app responsive, but prioritize desktop for editor and mobile for player.
- Use beautiful, modern UI with strong spacing, hierarchy, and motion.
- Avoid generic admin-dashboard aesthetics.

Tech stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- @xyflow/react for the branching canvas
- Framer Motion for transitions
- Supabase later, not in the first local prototype

Important:
The first version should use mock/local data only.
The first goal is to prove:
“I can create a branching scenario, preview it, and play it through a shareable route.”
