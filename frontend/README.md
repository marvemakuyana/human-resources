# BIHL Pay Premium – n8n Deployment Plan

**Date:** 2026-04-24  
**Workflows:** 3  
**Environment targets:** Development (`rndchat.finchatbot.com`) and Live (`livechat.finchatbot.com`)

---

## 1. Workflow Overview

### 1.1 Workflow Summaries

| #   | File                                              | Workflow Name                                 | n8n ID             | Role                                                                                               |
| --- | ------------------------------------------------- | --------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| 1   | `BIHL - Pay Premium.json`                         | **BIHL - Pay Premium**                        | `TWsbkLcHo7DP5yKa` | Primary entry point – AI chat agent that verifies users, retrieves policies, and initiates payment |
| 2   | `BIHL - Create DPO Token.json`                    | **BIHL - Create DPO Token**                   | `EQbSepuzQaeAhCu6` | Sub-workflow – creates a DPO payment token and sends the payment link to the user via WhatsApp     |
| 3   | `BIHL - DPO Verify  Token - Make Collection.json` | **BIHL - DPO Verify Token – Make Collection** | `3i644YxmzCVDKW0M` | Sub-workflow – polls DPO to verify payment, calls the BLILSP collection API, retries up to 3 times |

> **Note:** A fourth workflow, **BIHL - Get FAQs** (`KRvfT0PadSFkPFPG`), is referenced as a tool by BIHL - Pay Premium. It must already exist in n8n before Pay Premium is imported. It is **not** included in this bundle.

---

### 1.2 Dependency Chain

```
[WhatsApp / Chat UI]
        │
        ▼
BIHL - Pay Premium  (TWsbkLcHo7DP5yKa)
  ├── Tool: BIHL - Get FAQs  (KRvfT0PadSFkPFPG)  ← must pre-exist
  └── Tool: Process DPO Payment  ──calls──►  BIHL - Create DPO Token  (EQbSepuzQaeAhCu6)
                                                      │
                                                      │ sends WhatsApp payment link
                                                      │
                                                      └──calls──►  BIHL - DPO Verify Token – Make Collection  (3i644YxmzCVDKW0M)
                                                                          │
                                                                          ├── verifyToken (DPO API)
                                                                          ├── makeExternalPayment (BLILSP API)
                                                                          └── on retry: calls back ──►  BIHL - Create DPO Token
```

---

### 1.3 Entry Points

| Workflow                                  | Trigger Type                 | Detail                                                                                                                                                                  |
| ----------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BIHL - Pay Premium                        | **Chat Trigger (Webhook)**   | Webhook ID `291ad74d-eb72-4c2c-9075-d9745b7e521f` — public, streaming response mode. Also has a secondary `When Executed by Another Workflow` trigger for internal use. |
| BIHL - Create DPO Token                   | **Execute Workflow Trigger** | Called only by BIHL - Pay Premium (via the `Process DPO Payment` tool node)                                                                                             |
| BIHL - DPO Verify Token – Make Collection | **Execute Workflow Trigger** | Called only by BIHL - Create DPO Token (node: `Call 'BIHL - DPO Verify  Token - Make Collection'`)                                                                      |

---

## 2. Dependencies & Integrations

### 2.1 External Services

| Service                                       | Purpose                                                                   | Used By                                          |
| --------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| **BLILSP API** (Botswana Life Insurance REST) | User validation, policy lookup, payment details, collection               | All 3 workflows                                  |
| **DPO Pay API** (`/API/v6/`)                  | Create payment token, verify payment                                      | BIHL - Create DPO Token, BIHL - DPO Verify Token |
| **OpenAI GPT-4o**                             | AI chat agent (model: `gpt-4o`, temperature `0.1`)                        | BIHL - Pay Premium                               |
| **WhatsApp Business API**                     | Send payment link and status messages to user                             | BIHL - Create DPO Token, BIHL - DPO Verify Token |
| **PostgreSQL**                                | User sessions, conversation history, environment config, payment attempts | All 3 workflows                                  |

---

### 2.2 BLILSP API Endpoints

All endpoints are relative to `baseUrl` stored in the `env` / `env_dev` table (index 0).

| Node Name                     | Method | Path                                                                                                            |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `Get Token`                   | POST   | `{{ tokenUrl }}` (env index 6/4)                                                                                |
| `Validate User`               | GET    | `/BLILSP/1.0/sais/api/validateOmangWithMobile/?IDNumber=...&mobile=...`                                         |
| `Get User Policies`           | GET    | `/BLILSP/1.0/sais/api/getPoliciesByOmangCustCarePortal/?IDNumber=...`                                           |
| `Display Payment Information` | GET    | `/BLILSP/1.0/sais/api/getExtPayCustomerDetails/?policyNumber=...`                                               |
| `Make Collection`             | POST   | `/BLILSP/1.0/sais/api/makeExternalPayment/?transcationValue=...&policyNumber=...&transactionReference=WA-{ref}` |

All BLILSP calls use `Authorization: Bearer {access_token}` (token retrieved fresh per session).

---

### 2.3 DPO Pay API Endpoints

**Base URL:** `baseUrlDPO` (stored in `env`/`env_dev` table — index 7 for `env_dev`, index 5 for `env`)  
**Company Token (hardcoded):** `8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3`

| Operation    | Node             | URL Pattern                                                 | Method          |
| ------------ | ---------------- | ----------------------------------------------------------- | --------------- |
| Create Token | `createDPOToken` | `{baseUrlDPO}/API/v6/?CompanyToken=...&Request=createToken` | POST (text/xml) |
| Verify Token | `Verify Token`   | `{baseUrlDPO}/API/v6/`                                      | POST (text/xml) |

**DPO Service Config (hardcoded in XML):**

- `ServiceType`: `3854`
- `ServiceDescription`: `DPO API Test - BLIL Premium Payment`
- `RedirectURL`: `https://api.whatsapp.com/send/?phone=26775257556`
- `BackURL`: `https://www.botswanalife.co.bw/`
- `PTLtype`: `minutes`, `PTL`: `5` (payment link expires in 5 minutes)

**Payment portal URL sent to user:**  
`https://secure.3gdirectpay.com/payv2.php?ID={TransToken}`

---

### 2.4 Credentials Required in n8n

| Credential Name          | Type          | Used By                                                                                             | Notes                                                                        |
| ------------------------ | ------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Botswana Life Open AI`  | `openAiApi`   | BIHL - Pay Premium (nodes: `OpenAI Chat Model`, `OpenAI Chat Model1`)                               | Requires OpenAI API key with GPT-4o access                                   |
| `SanlamBIHLDBCredential` | `postgres`    | All 3 workflows (all Postgres nodes)                                                                | Must have access to `public` schema; requires read/write on all tables below |
| `BIHL WhatsApp`          | `whatsAppApi` | BIHL - Create DPO Token (`Send message`), BIHL - DPO Verify Token (`Send message`, `Send message1`) | WhatsApp Business API token + phone number ID                                |

---

### 2.5 Database Tables Required

The following tables must exist in the PostgreSQL database before workflows are activated:

| Table                  | Used By                                          | Operations                                                                                                                                                   |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`                | All workflows                                    | SELECT (by `session_id`, `phone_number`), UPDATE (`access_token`, `token_expire_time`, `validation_status`, `id_number`, `user_policies`, `selected_policy`) |
| `env`                  | All workflows                                    | SELECT (live environment config — 7 rows, indexed 0–6)                                                                                                       |
| `env_dev`              | All workflows                                    | SELECT (dev environment config — 8 rows, indexed 0–7)                                                                                                        |
| `messages_pay_premium` | BIHL - Pay Premium                               | INSERT/SELECT (conversation messages)                                                                                                                        |
| `conversation_history` | All workflows                                    | SELECT/INSERT (Postgres Chat Memory nodes, context window 10)                                                                                                |
| `messages`             | BIHL - Create DPO Token, BIHL - DPO Verify Token | SELECT/INSERT (Postgres memory nodes)                                                                                                                        |
| `payment_attempts`     | BIHL - DPO Verify Token                          | SELECT, INSERT, UPDATE (tracks retry count per `session_id`)                                                                                                 |

---

### 2.6 Environment Configuration (`env` / `env_dev` Tables)

Each table must contain rows with a `value` column, ordered by index:

| Index | Field                 | Description                                                                     |
| ----- | --------------------- | ------------------------------------------------------------------------------- |
| 0     | `baseUrl`             | Base URL of the BLILSP API                                                      |
| 1     | `username`            | BLILSP API login username                                                       |
| 2     | `password`            | BLILSP API login password                                                       |
| 3     | `tenant` (env_dev)    | X-ebao-tenant-id header value (`env_dev` only at index 3; `env` at index 3 too) |
| 4     | `tokenUrl` / `tenant` | `env_dev`: tokenUrl at index 4; `env`: tenant at index 3, tokenUrl at index 4   |
| 5     | `access_token`        | Cached access token (updated by workflow at runtime)                            |
| 6     | `tokenUrl` (env)      | Token endpoint URL (`env` table only, index 6)                                  |
| 7     | `baseUrlDPO`          | DPO Pay gateway base URL (`env_dev` only — index 7)                             |

> **Important:** The index mapping differs slightly between `env` and `env_dev`. Verify the exact row order in your database matches what the `Edit Fields` nodes expect (see `Edit Fields` node in Pay Premium for `env_dev` mapping and `Edit Fields3` for `env` mapping).

---

### 2.7 Environment Detection Logic

All three workflows contain a `Code in JavaScript` node that detects the environment at runtime:

```javascript
// Pseudo-logic (actual code in each workflow)
if (executionUrl.includes("rndchat.finchatbot.com")) → environment = "dev"  → use env_dev table
if (executionUrl.includes("livechat.finchatbot.com")) → environment = "live" → use env table
```

The `executionUrl` is hardcoded in the `Edit Fields1` node of BIHL - Pay Premium as:

- **Dev:** `https://rndchat.finchatbot.com/workflow/`
- **Live:** Update this value to `https://livechat.finchatbot.com/workflow/` before activating on the live instance

---

## 3. Pre-Deployment Checklist

### 3.1 Credentials (Create in n8n Before Importing)

- [ ] Create credential: **`Botswana Life Open AI`** (type: `OpenAI API`)
  - Set API Key to the project's OpenAI key
  - Verify GPT-4o access is enabled on that key

- [ ] Create credential: **`SanlamBIHLDBCredential`** (type: `Postgres`)
  - Host, Port, Database, Username, Password for the BIHL PostgreSQL instance
  - SSL as required by your DB configuration

- [ ] Create credential: **`BIHL WhatsApp`** (type: `WhatsApp Business Cloud API`)
  - Access Token for the WhatsApp Business Account
  - Phone Number ID for the sending number

### 3.2 Database Setup (Before Import)

- [ ] Confirm all 7 tables listed in §2.5 exist with correct schemas
- [ ] Confirm `env_dev` table has at least 8 rows (indices 0–7) populated correctly
- [ ] Confirm `env` table has at least 7 rows (indices 0–6) populated correctly
- [ ] Confirm `payment_attempts` table has `session_id` column and tracking fields

### 3.3 Pre-existing Workflows

- [ ] Confirm **BIHL - Get FAQs** (`KRvfT0PadSFkPFPG`) is already deployed and **active** in n8n — BIHL - Pay Premium will fail at runtime without it

### 3.4 Network & API Access

- [ ] n8n instance can reach the BLILSP API base URL (`baseUrl` in env table)
- [ ] n8n instance can reach DPO Pay gateway (`baseUrlDPO` in env table)
- [ ] n8n instance can reach `https://secure.3gdirectpay.com`
- [ ] n8n instance can reach OpenAI API (`api.openai.com`)
- [ ] WhatsApp Business API is active and the phone number `26775257556` is the correct redirect number

---

## 4. Deployment Steps

### 4.1 Import Order

**Deploy in this exact order** (sub-workflows must exist before the parent references them):

```
Step 1 → BIHL - DPO Verify  Token - Make Collection
Step 2 → BIHL - Create DPO Token
Step 3 → BIHL - Pay Premium
```

### 4.2 Step-by-Step Import Instructions

#### Step 1 – Import BIHL - DPO Verify Token – Make Collection

1. In n8n, go to **Workflows → Add Workflow → Import from File**
2. Select `BIHL - DPO Verify  Token - Make Collection.json`
3. After import, open the workflow
4. **Verify credentials** are auto-mapped:
   - All `Get user details1`, `GET ENV`, `GET ENV1`, `Get payment_attempts`, `Update rows in a table`, `Insert rows in a table`, `Postgres`, `Postgres1`, `Postgres2`, `Postgres7` nodes → `SanlamBIHLDBCredential`
   - `Send message`, `Send message1` nodes → `BIHL WhatsApp`
5. Do **not** activate yet — it is a sub-workflow triggered only by BIHL - Create DPO Token
6. Note the workflow ID assigned by n8n — if it differs from `3i644YxmzCVDKW0M`, you must update the reference in BIHL - Create DPO Token (node: `Call 'BIHL - DPO Verify  Token - Make Collection'` → `workflowId` field)

#### Step 2 – Import BIHL - Create DPO Token

1. Go to **Workflows → Add Workflow → Import from File**
2. Select `BIHL - Create DPO Token.json`
3. After import, open the workflow
4. **Verify credentials** are auto-mapped:
   - `Get user details1`, `GET ENV`, `GET ENV1`, `Postgres5`, `Postgres7` nodes → `SanlamBIHLDBCredential`
   - `Send message` node → `BIHL WhatsApp`
5. **Verify sub-workflow link:** Open the node `Call 'BIHL - DPO Verify  Token - Make Collection'` → confirm `workflowId` value is `3i644YxmzCVDKW0M` (or the actual ID assigned in Step 1 if it was re-assigned)
6. Do **not** activate yet

#### Step 3 – Import BIHL - Pay Premium

1. Go to **Workflows → Add Workflow → Import from File**
2. Select `BIHL - Pay Premium.json`
3. After import, open the workflow
4. **Verify credentials** are auto-mapped:
   - `OpenAI Chat Model`, `OpenAI Chat Model1` → `Botswana Life Open AI`
   - All Postgres nodes (`Get user by phone`, `Get user by phone1`, `GET ENV`, `GET ENV1`, `Update Access Token1`, `Postgres Chat Memory`, `SaveValidationStatus`, `SaveUserPolicies`, `SaveSelectedPolicy`) → `SanlamBIHLDBCredential`
5. **Verify sub-workflow links:**
   - Node `Process DPO Payment` → `workflowId` must be `EQbSepuzQaeAhCu6` (BIHL - Create DPO Token)
   - Node `BIHL - Get FAQs` → `workflowId` must be `KRvfT0PadSFkPFPG`
6. **Set target environment** (if deploying to live):
   - Open node `Edit Fields1`
   - Change `executionUrl` from `https://rndchat.finchatbot.com/workflow/` to `https://livechat.finchatbot.com/workflow/`
7. **Activate** BIHL - DPO Verify Token (Step 1) — toggle to Active
8. **Activate** BIHL - Create DPO Token (Step 2) — toggle to Active
9. **Activate** BIHL - Pay Premium (Step 3) — toggle to Active

### 4.3 Post-Import Configuration

| Item                    | Location                                                                                | Action                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Chat webhook URL        | BIHL - Pay Premium → `When chat message received` node                                  | Copy the webhook URL and register it with the WhatsApp or chat platform sending messages to the bot                     |
| Webhook ID              | `291ad74d-eb72-4c2c-9075-d9745b7e521f`                                                  | Verify this matches the URL configured on the chat client                                                               |
| DPO Company Token       | `Process DPO Payment 1` and `createDPOToken` nodes (hardcoded)                          | Confirm `8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3` is the correct production token; update if using a different DPO account |
| Whitelist phone numbers | `Whitelist phoneNumber` (Code node in Pay Premium)                                      | Review and update the whitelist logic if needed for production numbers                                                  |
| Payment link redirect   | `RedirectURL` in DPO XML (hardcoded `https://api.whatsapp.com/send/?phone=26775257556`) | Confirm the WhatsApp redirect phone number is correct for your deployment                                               |

---

## 5. Testing & Verification

### 5.1 End-to-End Test Flow

1. **Trigger Pay Premium** by sending a chat message to the webhook URL (or via the n8n chat UI)
2. Send a test message: `"I want to pay my premium"`
3. Agent (Mosa) should prompt for ID / Omang number
4. Provide a test Omang number — `Validate User` tool calls `/validateOmangWithMobile/`
5. Agent should return matching policies — `Get User Policies` tool calls `/getPoliciesByOmangCustCarePortal/`
6. Select a policy — `Display Payment Information` calls `/getExtPayCustomerDetails/`
7. Confirm the payment amount — agent calls `Process DPO Payment` tool → triggers **BIHL - Create DPO Token**
8. Verify WhatsApp receives the payment link message with `https://secure.3gdirectpay.com/payv2.php?ID=...`
9. Complete (or simulate) a payment on the DPO portal
10. After ~2 minutes, BIHL - DPO Verify Token polls DPO via `verifyToken`
11. On success, it calls `/makeExternalPayment/` and sends a payment confirmation WhatsApp message

### 5.2 Key Nodes to Test First

| Node                         | Workflow         | How to Test                                                                  |
| ---------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `When chat message received` | Pay Premium      | Confirm webhook is reachable; send a test POST and check n8n execution logs  |
| `Get user by phone`          | Pay Premium      | Confirm `users` table connection; check that a test `session_id` is returned |
| `GET ENV` / `GET ENV1`       | All workflows    | Check n8n execution output shows 7–8 rows with populated values              |
| `Get Token`                  | Pay Premium      | Verify BLILSP API responds with a valid Bearer token                         |
| `Validate User`              | Pay Premium      | Returns `validation_status` and populates `users.id_number`                  |
| `createDPOToken`             | Create DPO Token | Returns an XML body with `TransToken` and `TransRef`                         |
| `Send message`               | Create DPO Token | WhatsApp message received by test number with payment URL                    |
| `Verify Token`               | DPO Verify Token | DPO returns transaction status — check `TransactionApproval` field           |
| `Make Collection`            | DPO Verify Token | BLILSP returns HTTP 200 on `/makeExternalPayment/`                           |

### 5.3 Execution Log Checks

After each test, review the n8n execution history for:

- No credential errors on Postgres or WhatsApp nodes
- `createDPOToken` output contains `API3G.TransToken` (not an error XML)
- `Verify Token` output `ResultExplanation` = `"Test Transaction Approved"` (or production equivalent)
- `Make Collection` response body indicates successful posting
- `payment_attempts` table updated correctly (max 3 retries before giving up)

---

## 6. Rollback Plan

### 6.1 Immediate Rollback

If any workflow causes errors immediately after activation:

1. **Deactivate** the affected workflow(s) in n8n → toggle to Inactive
2. Rollback order (reverse of deploy): deactivate Pay Premium first, then Create DPO Token, then DPO Verify Token
3. No data changes occur from deactivation alone — in-flight executions will complete or error out

### 6.2 Sub-Workflow ID Mismatch

If n8n assigned new IDs on import (different from the hardcoded IDs):

1. Open **BIHL - Pay Premium** → node `Process DPO Payment` → update `workflowId` to the actual ID of BIHL - Create DPO Token
2. Open **BIHL - Create DPO Token** → node `Call 'BIHL - DPO Verify  Token - Make Collection'` → update `workflowId` to the actual ID of DPO Verify Token
3. Open **BIHL - DPO Verify Token** → node `Call 'BIHL - Create DPO Token'` → update `workflowId` to the actual ID of BIHL - Create DPO Token
4. Save and re-activate all workflows

### 6.3 Database Rollback

If the `env` / `env_dev` tables were modified:

- Restore the original row values from your DB backup
- No schema changes are made by these workflows — only the `users.access_token` and `users.token_expire_time` columns are updated at runtime

### 6.4 DPO Token Already Sent

If a user received a payment link before rollback:

- DPO tokens expire automatically after **5 minutes** (`PTL=5`), so no action is needed for expired tokens
- If a payment was already captured by DPO but `makeExternalPayment` failed, check the `payment_attempts` table and manually call `/makeExternalPayment/` with the `transactionReference` from the execution log

### 6.5 Restoring Previous Workflow Versions

The JSON files contain backup agent nodes (e.g., `BIHL - Pay Premium Agent - backup 16 April`) inside the workflow canvas. To revert the agent logic without a full reimport:

1. In the Pay Premium workflow, locate the backup agent node
2. Re-wire connections from `Merge2` and `Postgres Chat Memory` to the backup agent node
3. Deactivate and re-activate the workflow

---

## Appendix: Quick Reference

### Credential IDs (as stored in JSON — must match after import)

| Credential Name          | Type          | JSON ID            |
| ------------------------ | ------------- | ------------------ |
| `Botswana Life Open AI`  | `openAiApi`   | `swSOGhpUz3EsxpRh` |
| `SanlamBIHLDBCredential` | `postgres`    | `wzZwoe4E9awxPxws` |
| `BIHL WhatsApp`          | `whatsAppApi` | `xNlDYX5MiY8jGdPj` |

### Workflow IDs (as stored in JSON — may change on import to a new n8n instance)

| Workflow                                             | JSON ID            |
| ---------------------------------------------------- | ------------------ |
| BIHL - Pay Premium                                   | `TWsbkLcHo7DP5yKa` |
| BIHL - Create DPO Token                              | `EQbSepuzQaeAhCu6` |
| BIHL - DPO Verify Token – Make Collection            | `3i644YxmzCVDKW0M` |
| BIHL - Get FAQs _(pre-existing, not in this bundle)_ | `KRvfT0PadSFkPFPG` |

### Payment Retry Logic Summary

```
User pays → DPO token created (5 min TTL)
         → Verify Token waits 2 min, then polls DPO
         → If not approved AND attempts < 3:
               wait 1 min → re-verify
         → If still not approved after 3 attempts:
               Call 'BIHL - Create DPO Token' again (new token + new WhatsApp message)
         → On success:
               makeExternalPayment called → confirmation WhatsApp sent
```
