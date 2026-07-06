# AgriAdvisor

A multilingual, multi-agent chat assistant that helps smallholder farmers diagnose crop diseases from a photo and get weather-aware, cost-conscious treatment advice — in their own language.

## Problem Statement

Smallholder farmers are often the first line of defense against crop disease, but they frequently lack easy access to:
- **Expert diagnosis** — agricultural extension officers are scarce, and a sick-looking leaf can mean several different things.
- **Localized advice** — generic treatment guides rarely account for local weather conditions that affect how fast a disease spreads, or how urgent treatment really is.
- **Affordable options** — advice that jumps straight to chemical fungicides ignores farmers who need the cheaper, more accessible option first.
- **Language access** — most agronomy content is written in English, excluding farmers who are more comfortable in Malayalam, Hindi, Spanish, Swahili, French, or Bengali.

AgriAdvisor addresses this with a simple chat interface: upload a photo of the affected plant, answer a couple of follow-up questions if needed, optionally share your location, and get back a diagnosis, treatment options ranked by cost, and a weather-informed note on how urgently to act — all in the language you asked in.

## Solution Overview: 4-Agent Pipeline

Each farmer turn flows through four sequential agents, each with a single responsibility:

1. **Intake Agent** — validates and sanitizes the raw input (image magic-byte check, text cleanup, location name), detects the farmer's language from their text, and normalizes everything into a clean internal shape for the rest of the pipeline.
2. **Diagnosis Agent** — sends the photo to the [Plant.id](https://plant.id) API for combined crop identification + health assessment. High-confidence results are returned immediately; ambiguous ones trigger 2–3 targeted follow-up questions (using Plant.id's own disambiguation question when available, or a plant-part-aware question set otherwise) before finalizing on a later turn.
3. **Weather Agent** — if a location was given, fetches current conditions from OpenWeatherMap (temperature, humidity, recent rainfall) and derives a disease-spread-risk level and whether treatment can safely be delayed.
4. **Response Agent** — composes the final farmer-facing message: translated diagnosis and treatment content (with a cost-aware note on biological vs. chemical options), the weather risk context, and an optional preventive tip for the crop's current growth stage — all in the farmer's detected language.

Each agent logs its reasoning to a shared trace, so the full decision path for a turn (why a question was asked, why a candidate was chosen, why a risk level was assigned) is inspectable, not a black box.

## Key Features

- **Multilingual support** — English, Malayalam, Hindi, Spanish, Swahili, French, and Bengali, detected automatically from the farmer's text and carried across the conversation.
- **Plant.id integration** — real crop identification + disease detection from a photo, restricted to five supported crops (rice, maize, tomato, potato, pepper); anything else is reported as out-of-scope rather than guessed at.
- **Weather-aware disease risk advice** — humidity/rainfall-driven risk level and delay-treatment guidance, so the same diagnosis can carry a different urgency message depending on local conditions.
- **Cost-aware treatment suggestions** — treatments are split into biological/organic and chemical options with an explicit cost framing, so farmers can weigh the cheaper option against faster-acting but pricier ones.
- **Preventive tips by growth stage** — optional, crop- and growth-stage-specific (seedling / vegetative / flowering / fruiting) preventive advice, independent of any diagnosis.
- **Plant-part-aware follow-up questions** — when Plant.id's result is ambiguous and it hasn't supplied its own question, the assistant asks which part of the plant is affected (leaf/fruit/stem/root/flower) and tailors the next questions accordingly, with a translated confirmation line so the farmer can immediately spot a misunderstanding.

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: plain HTML, CSS, and vanilla JavaScript (no framework) — a minimal chat UI served as static files
- **External APIs**: Plant.id (diagnosis), OpenWeatherMap (weather)
- **No LLM calls**: all farmer-facing text is either pre-translated static content or simple pattern/keyword matching over API responses — deliberately no external LLM in the request path

## Architecture

```
Farmer input (text + optional image + optional location)
            │
            ▼
   ┌─────────────────┐
   │  Intake Agent   │  validate image, sanitize text, detect language
   └────────┬────────┘
            ▼
   ┌─────────────────┐
   │ Diagnosis Agent │  Plant.id API → crop + disease + confidence
   └────────┬────────┘  (may ask follow-up questions across turns)
            ▼
   ┌─────────────────┐
   │  Weather Agent  │  OpenWeatherMap (via in-process MCP server) →
   └────────┬────────┘  disease-spread risk + delay-treatment advice
            ▼
   ┌─────────────────┐
   │ Response Agent   │  translated message: diagnosis, cost-aware
   └────────┬────────┘  treatment, weather risk, preventive tip
            ▼
     Farmer-facing reply
```

Session state (detected language, in-progress diagnosis awaiting follow-up answers) is kept in an in-memory store keyed by session ID, so a conversation stays coherent across turns without a database.

## Technical Concepts Demonstrated

- **Built in the Antigravity IDE** as an end-to-end agent-assisted development exercise.
- **Security practices**: API keys are read exclusively from environment variables (never hardcoded), all incoming input is validated (image magic-byte verification via `file-type`, text/location sanitization, size limits), and known dependency vulnerabilities were patched as part of development.
- **MCP (Model Context Protocol) integration**: the Weather Agent talks to OpenWeatherMap through a real in-process MCP server/client pair (`@modelcontextprotocol/sdk`), using the actual MCP tool-call protocol rather than a plain function call — a working demonstration of the protocol without needing a separate OS process.
- **Agent skills (Agents CLI)**: the repository is managed and pushed using the Antigravity CLI (`agy`).
- **Deployed on Google Cloud Run**, running as a stateless container serving both the API and static frontend.

## Setup Instructions

### Prerequisites
- Node.js 18+
- A [Plant.id](https://plant.id) API key
- An [OpenWeatherMap](https://openweathermap.org/api) API key

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd agri-adviser

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
```

Edit `.env` and fill in your API keys:

```
PORT=3000
PLANT_ID_API_KEY=your_plant_id_key_here
MOCK_PLANT_ID=false
MOCK_PLANT_ID_SCENARIO=high_confidence

OPENWEATHER_API_KEY=your_openweathermap_key_here
MOCK_WEATHER=false
MOCK_WEATHER_SCENARIO=normal
```

Setting `MOCK_PLANT_ID`/`MOCK_WEATHER` to `true` lets you run and test the full pipeline against saved sample responses without spending real API credits.

```bash
# 4. Run in development (auto-reload on change)
npm run dev

# Or build and run in production mode
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

## Live Demo

[https://agri-adviser-867706729124.us-central1.run.app](https://agri-adviser-867706729124.us-central1.run.app)

## Known Limitations

- **Follow-up answer resolution is keyword-based, not ML-driven**: when Plant.id doesn't supply its own disambiguation question, the farmer's free-text follow-up answer is matched against candidate diseases using simple word-overlap scoring — intentionally explainable, but a cruder signal than a real re-ranking model.
- **In-memory session storage**: conversation state (language, pending diagnosis) lives in a process-local `Map`, so the app currently assumes a single running instance. A multi-instance deployment would need a shared store (e.g. Redis) to keep sessions consistent.
- **Curated disease translations cover ~20 diseases** across the five supported crops with full translated descriptions, treatments, and cost framing in all seven languages; diseases outside that curated set fall back to Plant.id's original English text with a translated note explaining why.
