# AGENTS.md

## Code Style

- Always use **vanilla web standards** (HTML, CSS, JS, Web APIs) whenever possible.
- Only use external frameworks, libraries, or dependencies when:
  - They are strictly required to achieve the functionality,
  - Their use is explicitly specified by the user, **or**
  - They are already present in the codebase, in which case **do not remove or replace them** without instruction. Existing usage likely reflects a deliberate choice by the user or a prior agent.
- Write **clean, maintainable code** that adheres to modern best practices.
  - Prioritize clarity, readability, and modularity.
  - Avoid overengineering or premature optimization.

## Network Access

- This agent has **unrestricted internet access** for the purpose of:
  - Fetching packages, modules, or dependencies
  - Accessing documentation or public APIs required by the code
- Use online access **only when necessary** to fulfill a task. Prefer local resources and existing code first.
- Do **not** install or use online resources unless they’re:
  - Clearly needed to complete a task,
  - Already used in the codebase,
  - Or explicitly requested by the user.
