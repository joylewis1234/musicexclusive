# RLS Changes Documentation

## Scope
This document lists the RLS changes applied during Milestone 1 hardening.

## Source
- Migration: `supabase/migrations/20260218133000_rls_hardening_wave1.sql`

## Changes Applied

### user_roles
- Removed: broad role policies (legacy).
- Added: service-role-only policy for all actions.
- Effect: only service role can manage roles.

### tracks
- Removed: public read policy.
- Added: "Authorized users can read tracks" policy.
- Allowed: service role, admins, owning artist, or active vault member.
- Effect: no public track reads.

### fan_invites
- Removed: public read/validate policy.
- Added: service-role-only read policy.
- Effect: invite token validation is server-side only.

### vault_members
- Removed: public roster access policy.
- Effect: authenticated users can no longer enumerate vault member names.

### track_likes
- Removed: public read policy.
- Added: "Users can read their own likes" policy.
- Allowed: service role, admins, or the fan who created the like.

## Summary
These changes eliminate public reads for sensitive tables and enforce least-privilege access via service role, admin role, ownership, or vault membership.
