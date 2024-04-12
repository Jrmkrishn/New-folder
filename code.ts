import { MongoClient, AggregationCursor } from "mongodb";

const uri = "mongodb://localhost:27017";
const dbName = "db";
const collectionName = "test";

interface UserDocument {
  userId: string;
  logged_in: string;
  logged_out: string | null;
  lastSeenAt: string;
}

const pipeline = [
  {
    $project: {
      userId: 1,
      loggedIn: { $toDate: "$logged_in" },
      loggedOut: {
        $cond: {
          if: { $eq: ["$logged_out", ""] },
          then: "$$REMOVE",
          else: { $toDate: "$logged_out" },
        },
      },
      lastSeenAt: { $toDate: "$lastSeenAt" },
    },
  },
  {
    $match: {
      $or: [
        {
          $and: [
            { loggedIn: { $gte: new Date("2024-04-01") } },
            { loggedOut: { $lte: new Date("2024-05-01") } },
          ],
        },
        {
          $and: [
            { loggedIn: { $gte: new Date("2024-04-01") } },
            { loggedOut: { $eq: null } },
          ],
        },
        {
          $and: [
            { lastSeenAt: { $gte: new Date("2024-04-01") } },
            { loggedIn: { $lt: new Date("2024-04-01") } },
          ],
        },
      ],
    },
  },
  {
    $group: {
      _id: "$userId",
      totalLogins: { $sum: 1 },
      isActiveUser: {
        $sum: { $cond: [{ $gte: ["$loggedIn", new Date("2024-04-01")] }, 1, 0] },
      },
    },
  },
];

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection<UserDocument>(collectionName);

    const cursor: AggregationCursor<any> = collection.aggregate(pipeline);

    const result = await cursor.toArray();

    console.log(result);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

run();
