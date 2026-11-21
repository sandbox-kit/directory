# Provider documentation links (`docs[]`)

Each provider may include multiple reference URLs:

```json
{
  "description": "Pricing and billing",
  "link": "https://example.com/pricing"
}
```

| Suggested `description`     | Use for                                |
| --------------------------- | -------------------------------------- |
| Documentation hub           | Main `/docs` or developer portal entry |
| Getting started / overview  | Product overview, quickstart           |
| API reference               | REST/SDK reference, OpenAPI            |
| Pricing / billing           | Plans, meters, enterprise pricing      |
| Self-host install guide     | OSS/docker/k8s install                 |
| GitHub repository           | Primary OSS repo                       |
| Help center                 | Support / FAQ                          |
| Third-party sandbox profile | e.g. agentsandboxes.org                |

**Sources**

- Firecrawl **extract** / **reconcile** when explicit
- **Enrich** infers doc-shaped URLs already present in `sources[]` or `profile`

Helpers: `src/schemas/provider-docs.ts` (`providerHasPricingDoc` for reconcile eligibility).
