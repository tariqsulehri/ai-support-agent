# MongoDB / Mongoose stack module

**Status:** vetted
**Last reviewed:** 2026-11-08
**Author:** audit kit maintainer

**Detection signals:** `package.json` with `mongoose` or `mongodb`; `mongoose.connect`, `new Schema(`, `model(` calls; `MONGODB_URI` / `MONGO_URL` in env names; `models/` folder.

**Loads with dimensions:** data, security, performance, reliability, compliance.

## Vulnerability and defect patterns

### Security
- Operator injection: `Model.find(req.body)`, `findOne({ email: body.email })` where the value can be an object such as `{ "$ne": null }` or `{ "$gt": "" }`. Check that inputs are validated as strings (Zod) or that `mongoose.set('sanitizeFilter', true)` / `sanitizeFilter` is used.
- `$where`, `$function`, `$accumulator`, `mapReduce` with user input: server-side JavaScript execution.
- `$regex` built from user input with no escaping: ReDoS and data probing; prefer an escaped, anchored regex or a text index.
- Mass assignment: `findByIdAndUpdate(id, req.body)` or `new Model(body)` lets callers set `role`, `shopId`, `status`, `passwordHash`. Look for an allow-list of fields.
- `findById(params.id)` with no tenant or owner filter: object-level access. The filter should include the scope (`{ _id, shopId }`).
- Password hashes or tokens returned in responses: check `select: false` on secret fields, `.select('-passwordHash')`, or `toJSON` transforms.
- Connection string with credentials logged, or sent to the client in an error.
- Atlas network access set to `0.0.0.0/0` with a weak database user (note as config, verify with the owner).

### Data
- No `required`, `enum`, `min`/`max` on fields that must be valid; status and category stored as free strings.
- JSON stored as strings (`items: String` holding JSON) instead of arrays or subdocuments: no validation, no query by element.
- Missing indexes on fields used in filters and sorts (`shopId`, `createdAt`, `status`); `autoIndex` off in production with no index migration.
- Missing unique indexes where duplicates break logic (user email, shop code).
- Multi-document writes (review + lead) without a transaction (`session.withTransaction`, needs a replica set): partial data.
- No soft delete or audit trail on records that matter; `deleteMany({})` reachable.
- String `_id` defaults (`crypto.randomUUID`) mixed with ObjectId refs: joins and `populate` silently fail.
- No retention or TTL index for personal data (transcripts, phone numbers).

### Performance
- `find()` with no `limit` on list endpoints; `.lean()` missing on read-only queries.
- N+1: queries inside loops instead of `$in` or aggregation `$lookup`.
- Aggregations that `$match` after `$group` or `$lookup` instead of first.
- Full collection scans for dashboards; check `explain()` only on a local copy.

### Reliability
- Connection not cached across hot-reloads and serverless invocations (`globalThis` cache): connection storms.
- `bufferCommands: false` with no connect-before-query: first query throws.
- No `serverSelectionTimeoutMS` / `socketTimeoutMS` tuning; errors surfaced as 500 with driver text.

### Testing
- No tests against a real MongoDB (`mongodb-memory-server` or a local container); queries mocked away.

### Code health
- Schemas and TypeScript interfaces defined twice and drifting.
- Leftover code or files from a previous ORM (Prisma schema, SQLite files) still in the repo.

## Framework misconfigurations

- `strictQuery` / `strict` disabled: unknown fields accepted or filters silently dropped.
- `sanitizeFilter` not enabled where filters come from requests.
- `autoIndex: true` in production on large collections (blocking builds) or `false` with no other index process.

## Scanner and project commands

All run only if approved at Checkpoint A. **Never connect to the production cluster.** Read model files as plain files.
- No migration tool by default; look for scripts that change data (`seed`, `migrate`) and do not run them.
- Local test database: `docker run -d -p 27017:27017 mongo:7` (only in fix mode, never in audit mode).

## Where to look first

- Connection: `src/lib/db/connection.*`, `lib/mongodb.*`.
- Models: `src/lib/db/models/`, `models/`.
- Queries: dashboard and report query modules, route handlers calling `Model.find*`, `aggregate`.
- Seeds: `seed*.ts`. The real layout comes from the System Map.

## Looks wrong but is fine

- `_id` of type String with a UUID default, when used consistently.
- Missing transactions where only one document is written.
- `bufferCommands: false` when every handler awaits `connectDB()` first.

## Version notes

- Mongoose 7+: `strictQuery` default changed; callbacks removed. Mongoose 8: `findOneAndUpdate` returns the pre-update document unless `new: true` (or `returnDocument: 'after'`).
- Transactions need a replica set (Atlas has one; a plain local `mongod` does not).
- Verify against the installed version.
