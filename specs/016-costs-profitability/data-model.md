# Data model

## `product_cost_states`

- `product_id` PK/FK
- `method`: `WEIGHTED_AVERAGE` o `REFERENCE`
- `rate_micros_per_base`: entero positivo
- `covered_quantity_base`: cantidad cuyo costo es conocido para promedios
- `revision`, `effective_at_utc`, `actor_user_id`, `actor_name`

## `product_cost_events`

Libro inmutable con valor anterior y posterior, motivo, compra/renglón opcional, responsable y fecha. Una recepción produce como máximo un evento por renglón; una reversión queda vinculada al evento original.

## Extensión de `sale_items`

- `cost_method` nullable
- `cost_rate_micros_per_base` nullable
- `cost_cents` nullable
- `cost_effective_at_utc` nullable

Los cuatro campos nulos significan «Sin costo» y no cero.
