# Insert, Batch Insert and Copy

Goal is to measure the time it takes to read 1,000,000 rows of data from a csv and insert into a postgres database.

## Getting Started

1. `npm ci`
2. `npm run t create-csv`
3. `cp .env.template .env`
4. `docker-compose up db -d`

### Insert one by one

* `npm run t insert`

### Insert in bulk

* `npm run t bulk-insert`

### Insert using copy

* `npm run t copy`
