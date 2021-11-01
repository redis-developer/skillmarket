## Introduction
In this blogpost we'll build a social network application using RediSearch and NodeJS. This is the idea that
we used for our app Skillmarket, which we developed as part of the Redis Hackathon in 2020.

The goal of the application is to match users with complementary skills. It will allow users to register and
provide some information about themselves, like location, areas of expertise and interests. Using RediSearch
it will match two users which are geographically close, and which have complementary areas of expertise and interests,
e.g., one of them will know French and want to learn Guitar and the other will know Guitar and want to learn French.

The full source code of our application can be found in GitHub (note that we used some features like [`FT.ADD`](https://oss.redis.com/redisearch/Commands/#ftadd) which now are deprecated):
- https://github.com/julianmateu/skillmarket-backend
- https://github.com/manuelaguirre/skillmarket-front

Refer to the [official tutorial](https://github.com/RediSearch/redisearch-getting-started) for more information
about RediSearch.

## Familiarizing ourselves with RediSearch by using the CLI
### Launching ReadiSearch in a docker container

Let's start by launching redis from the redisearch image using docker:
```bash
docker run -d --name redis redislabs/redisearch:latest
```
Here we use the `docker run` command to start the container and pull the image if it is not present. The `-d`
flag tells docker to launch the container in the background (detached mode). We provide a name with `--name redis`
which will allow us to refer to this container with a friendly name instead of the hash or the random name
docker will assing to it. Finally, `redislabs/readisearch:latest` tells docker to use the `latest` version of the
[`redislabs/readisearch` image](https://hub.docker.com/r/redislabs/redisearch)

Once the image starts, we can use `docker exec` to launch a terminal inside the container, using the `-it` flag
(interactive tty) and specifying the `redis` name provided before when creating the image, and the `bash` comamnd:
```bash
docker exec -it redis bash
```

Once inside the container, let's launch a `redis-cli` instance fo familiarize ourselves with the CLI:
```bash
redis-cli
```
You will notice the prompt now indicates we're connected to `127.0.0.1:6379>`

### Creating Users
We'll use a Hash as the data structure to store information about our users. This will be a proof of concept,
so our application will only use Redis as the data store. For a real life scenario, it would probably be better
to have a primary data store which is the authoritative source of user data, and use Redis as the search index
which can be used to speed up searches.

In a nutshell, you can think of a hash as a key/value store where the key can be any string we want, and the
values are a document with several fields. It's common practise to use the hash to store many different types
of objects, so they can be prefixed with their type, so a key would take the form of `<object_type>:<id>`.

An index will then be used on this hash data structure, to efficiently search for values of given fields.
The following diagram taken from the RediSearch docs exeplifies this with a database for movies:
![secondary-index](./secondary-index.png)

Use the `help @hash` command (or refer to the [documentation](https://redis.io/commands#hash)) to get a list
of commands that can be used to manipulate hashes. To get help for a single command, like `HSET` let's type
`help HSET`:
```
127.0.0.1:6379> help hset

  HSET key field value [field value ...]
  summary: Set the string value of a hash field
  since: 2.0.0
  group: hash
```
As we see, we can provide a key and a list of `field value` pairs.

We'll create a user in the hash table by using `user:<id>` as the key, and we'll provide the fields `expertises`,
`interests` and `location`:
```
HSET users:1 name "Alice" expertises "piano, dancing" interests "spanish, bowling" location "2.2948552,48.8736537"

HSET users:2 name "Bob" expertises "french, spanish" interests "piano" location "2.2945412,48.8583206"

HSET users:3 name "Charles" expertises "spanish, bowling" interests "piano, dancing" location "-0.124772,51.5007169"
```

### Query to match users
Here we can see the power of the RediSearch index, which allows us to query by [tags](https://oss.redis.com/redisearch/Tags/) (we provide a list of values,
such as interests, and it will return any user whose interests match at least one value in the list), and [geo](https://oss.redis.com/redisearch/Query_Syntax/#geo_filters_in_query)
(we can ask for users whose location is at a given radius in km from a point).

To be able to do this, we have to instruct RediSearch to create an index:
```
FT.CREATE idx:users ON hash PREFIX 1 "users:" SCHEMA interests TAG expertises TAG location GEO
```
We use the [`FT.CREATE` command](https://oss.redis.com/redisearch/Commands/#ftcreate) to create a full text search index named `idx:users`. We specify `ON hash` to 
indicate that we're indexing the hash table, and provide `PREFIX 1 "users:"` to indicate that we should index
any document whose key starts with the prefix "users:". Finally we indicate the `SCHEMA` of the index by providing
a list of fields to index, and their type.

Finally, we can query the index using the [`FT.SEARCH` command](https://oss.redis.com/redisearch/Commands/#ftsearch) (see the
[query syntax reference](https://oss.redis.com/redisearch/Query_Syntax/#search_query_syntax)):
```
127.0.0.1:6379> FT.SEARCH idx:users "@interests:{dancing|piano} @expertises:{spanish|bowling} @location:[2.2948552 48.8736537 5 km]"
1) (integer) 1
2) "users:2"
3) 1) "name"
   2) "Bob"
   3) "expertises"
   4) "french, spanish"
   5) "interests"
   6) "piano"
   7) "location"
   8) "2.2945412,48.8583206"
```
In this case we're looking for matches for Alice, so we use her expertises in the `interests` field of the query,
and her interests in the `expertises` field. We also search for users in a 5km radius from her location, and we get
Bob as a match.

If we expand the search radius to 500km we'll also see that Charles is returned:
```
127.0.0.1:6379> FT.SEARCH idx:users "@interests:{dancing|piano} @expertises:{spanish|bowling} @location:[2.2948552 48.8736537 500 km]"
1) (integer) 2
2) "users:3"
3) 1) "name"
   2) "Charles"
   3) "expertises"
   4) "spanish, bowling"
   5) "interests"
   6) "piano, dancing"
   7) "location"
   8) "-0.124772,51.5007169"
4) "users:2"
5) 1) "name"
   2) "Bob"
   3) "expertises"
   4) "french, spanish"
   5) "interests"
   6) "piano"
   7) "location"
   8) "2.2945412,48.8583206"
```

## Building a minimal backend
After understanding how the index works, let's build a minimal backend API in NodeJS that will allow us to
create a user, and query for matching users.