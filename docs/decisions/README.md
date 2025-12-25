# Architecture Decision Records (ADRs)

Use ADRs to capture decisions that affect architecture, dependencies, or
long-term maintenance. Keep them short, opinionated, and easy to reference.

## When to write an ADR

- Introducing a new service, dependency, or major workflow.
- Making a trade-off that impacts security, scalability, or cost.
- Reversing or revisiting a prior architectural decision.

## Naming convention

Create a new file for each ADR:

```
docs/decisions/NNNN-title-slug.md
```

Example: `docs/decisions/0002-api-auth-strategy.md`

## ADR template

```
# Title

## Status

Proposed | Accepted | Rejected | Superseded

## Context

What problem are we solving? What constraints or forces matter?

## Decision

What choice are we making and why?

## Consequences

What changes because of this decision? What trade-offs are we accepting?
```
