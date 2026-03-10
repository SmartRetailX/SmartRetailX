### Product Capability Queries

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| P-01 | `සුදු සහල් 1kg මිල කීයද?` | product | Returns factual product response with price and stock details. |
| P-02 | `Anchor milk powder price එක කියන්න` | product | Returns matching product(s) with price; no generic unrelated text. |
| P-03 | `කොත්මලේ ජෑම් 500ml තියෙනවද?` | product | Returns stock availability and product name. |
| P-04 | `Sunlight dishwash gel cost` | product | If not in DB, returns explicit unavailable/not-found style response. Must not reply with generic `ඔබට අවශ්‍ය භාණ්ඩයේ නම කියන්න...`. |
| P-05 | `Chili powder search කරන්න` | product | Returns one or more catalog matches when available; otherwise explicit unavailable response. |
| P-06 | `Neo Ultra Dish Tabs 5000 price` | product | For unknown item, clearly says product is not found/unavailable. |
| P-07 | `Dove soap` | product | Treated as product query; returns product info if found or explicit unavailable message if not. |
| P-08 | `milk powder products show කරන්න` | product | Returns multiple relevant product matches, not a generic chatbot answer. |
| P-09 | `Signal toothpaste available ද?` | product | Returns stock availability response or explicit unavailable message. |
| P-10 | `අලුත් brand එකක්: SuperFresh noodle pack price` | product | Unknown brand should still be classified as product query and return unavailable response. |

### Latest Order Queries

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| O-L-01 | `මගේ අවසාන ඇණවුමේ විස්තර දෙන්න` | order | Includes order number, status, total, item list/summary. |
| O-L-02 | `my latest order` | order | Returns latest order details for authenticated user (no order-id prompt). |
| O-L-03 | `recent order status එක` | order | Returns latest order status and basic summary. |
| O-L-04 | `පසුගිය ඇණවුම පෙන්නන්න` | order | Returns latest order information in Sinhala-friendly format. |

### All Orders / History Queries

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| O-A-01 | `මගේ සියලුම ඔර්ඩර් වල විස්තර ලබා දෙන්න` | order | Returns list format (`මුළු ඇණවුම් ගණන`, order lines). |
| O-A-02 | `all my orders` | order | Returns multiple orders, not only latest order. |
| O-A-03 | `order history show කරන්න` | order | Returns history list with totals/status/date. |
| O-A-04 | `පෙර මිලදී ගැනීම් ලැයිස්තුව දෙන්න` | order | Returns order history list for authenticated user. |
| O-A-05 | `ඇණවුම් ලැයිස්තුව` | order | Returns list response with pagination note when applicable. |

### Specific Order Number Queries

Replace `<REAL_ORDER_NO>` with a real order number.

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| O-S-01 | `Order number <REAL_ORDER_NO> විස්තර දෙන්න` | order | Returns that exact order details. |
| O-S-02 | `<REAL_ORDER_NO> status එක මොකද්ද?` | order | Returns matched order status; no fallback to latest order. |
| O-S-03 | `ORD-20260101-XXXX order details` | order | For invalid number, returns not-found message clearly. |

### Recommendation Queries

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| R-01 | `මට ගන්න දේවල් recommend කරන්න` | recommendation | Returns list based on multiple recent orders plus available offers section when relevant. |
| R-02 | `what should I buy this week?` | recommendation | Returns suggested items with price/stock lines from DB-grounded capability response. |
| R-03 | `buying list එක suggest කරන්න` | recommendation | Returns `නිර්දේශිත ලැයිස්තුව` style output with multi-order, category-based, and offer-aware recommendations. |
| R-04 | `shopping list recommendations` | recommendation | Uses multiple recent orders, broader category analysis, and available offers; not generic chat-only output. |

### Offer Queries (Primary DB + Fallback)

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| F-01 | `දැනට ඔෆර්ස් තියෙනවද?` | offer (primary) | If active promotions exist, returns active offers. Expired offers must appear in a separate `අවසන් වූ Offers` section for clarity. |
| F-02 | `current promotions list` | offer (primary) | No crash; returns DB-backed promotions list from `pe_promotions` joined with `products` mapping. |
| F-03 | `discount items මොනවද?` | offer (primary) | Returns relevant offer entries with discount and validity from DB-backed path only (no generated override). |
| F-04 | `දැනට මොනවා හරි ඔපර්ස් තියෙනවද?` | offer (primary) | Even with Sinhala transcription/misspelling noise, still routes to offer path and must not return product-unavailable response. |

### Transcript Refinement Queries (Mixed Language)

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| T-01 | `මගේ odr histroy show කරන්න` | order | Refinement converts typo-heavy mixed query to order-history intent and returns order list/history response. |
| T-02 | `ඔපර්ස් / offres අද තියනවද?` | offer | Refinement normalizes noisy offer terms and returns offer response (not product unavailable). |
| T-03 | `price eka prize කියලා ආවා, stok එක කියන්න` | product | Refinement normalizes `prize`/`stok` to `price`/`stock` and returns product details response. |
| T-04 | `buying list suggestion එක recomnd කරන්න` | recommendation | Refinement normalizes recommendation words and returns recommendation sectioned response. |
| T-05 | `මගේ last odr histroy details` | order | If first capability pass misses, refined transcript re-check should still resolve DB-backed order response before fallback safety response. |

### General Queries

| ID | Query | Expected Capability | Pass Criteria |
|---|---|---|---|
| G-01 | `ඔයාට මොනවද කරන්න පුළුවන්?` | agent | Returns assistant capabilities summary. |
| G-02 | `help me with shopping` | agent | Helpful generic response without wrong order/product assumptions. |
| G-03 | `hello` | agent | Returns greeting; no errors/timeouts. |

## Session Persistence Checks

After sending 3-5 test queries:

1. Call `GET /v1/voice/chat/session?limit=20`.
2. Verify user and assistant messages were persisted in correct order.
3. Verify `userId` is consistent with authenticated user.

## Failure Report Template

When a test fails, send me this exact structure so I can patch quickly:

```text
Test ID: <e.g., O-A-01>
Query: <exact query sent>
Endpoint: </v1/voice/chat/text or /v1/voice/chat>
User ID: <authenticated user id>
Expected: <what should happen>
Actual: <actual response text>
HTTP Status: <status code>
Agent Up/Down: <up/down/unknown>
Relevant Logs:
- api-gateway: <paste lines>
- agent-service: <paste lines>
```

## Notes

- Order-related queries should not ask for order ID by default when latest/history intent is clear.
- All-orders requests should return list/history, not only the latest order.
- Recommendation output quality depends on latest-order data and catalog matches.
- Offer fallback is specifically valuable when agent transport is unavailable.
- Product queries with zero catalog matches should return an explicit not-found/unavailable response, not a generic clarification-only response.
