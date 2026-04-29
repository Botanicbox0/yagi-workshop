-- ============================================================
-- Phase 3.1 K-05 LOOP 2 fix
-- HIGH-A residual: Postgres function overloading.
-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
-- in 20260429113853 was NOT replaced by the 3-arg version in 20260429124343.
-- Both signatures coexisted; the 2-arg version still lacked the auth.uid()/owner gate.
-- Fix: explicitly DROP the unsafe 2-arg signature so only the auth-gated 3-arg
-- version remains callable.
-- ============================================================

DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);
