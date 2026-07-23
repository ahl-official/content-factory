# Project Context & History

This folder (`memory`) serves as a persistent record of the project's state, what it is, what we have done, and what decisions or ideas were rejected. This ensures that even if the project is hosted elsewhere or worked on by different agents, the full history is retained.

## What is this project?
The project (currently in `d:/Project/ContentFactory`) is a Node.js-based backend service called **Script Skill**. It is a WhatsApp-driven viral reel script generator tailored for American Hairline. It takes voice notes or text via WhatsApp, transcribes them using Groq (whisper-large-v3), classifies intent, and generates reel scripts using Anthropic Claude models. The state is stored in Supabase.

## Memory Structure
- `changelog.md`: A log of what we did, changes made, and features added.
- `rejected_ideas.md`: A log of what the user didn't like and rejected, to prevent repeating mistakes.
