---
version: '0.4.0'
date: 2026-08-06
title: A site and a manual
summary: The landing page and the documentation became their own deployments.
kinds: ['added']
---

Reading about HABI should not mean downloading HABI.

### Added

- **habi.app**, a landing page that ships no editor, no compiler and no
  WebAssembly — and, as it happens, no JavaScript framework either.
- **Documentation**, covering the compiler, what you can import, storage,
  security, appearance and self-hosting.
- Both are separate deployments from the same repository, so each one carries
  only what it needs.
