# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for high scores. Currently an unmodified `create-next-app` scaffold (App Router, no game logic implemented yet).

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, extends `eslint-config-next`)

There is no test runner configured yet.

## Architecture

- **Next.js 16 / React 19, App Router**, TypeScript, Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config` — theme lives in `app/globals.css`).
- `app/layout.tsx` — root layout, loads Geist fonts.
- `app/page.tsx` — home page (still the default starter content).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).

## Before writing code

This repo pins a Next.js version with breaking changes relative to older training data. Per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before implementing anything Next.js-specific (routing, data fetching, caching, server actions, etc.), and follow any deprecation notices found there.

## Spec-driven workflow

Per `README.md`, this project follows Spec Driven Design using `/spec` and `/spec-impl` commands from the `Klerith/fernando-skills` skill pack (installed via `npx skills@latest add Klerith/fernando-skills`). These skills are not present in this checkout yet — install them if the user references `/spec` or `/spec-impl` workflows and they aren't available.
