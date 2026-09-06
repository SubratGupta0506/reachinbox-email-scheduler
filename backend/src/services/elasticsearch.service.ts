import { Client } from "@elastic/elasticsearch";

const elasticsearch = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

const EMAIL_INDEX = "emails";

export interface EmailSearchDocument {
  id: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
}

export const createEmailIndex = async () => {
  const exists = await elasticsearch.indices.exists({
    index: EMAIL_INDEX,
  });

  if (!exists) {
    await elasticsearch.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          id: { type: "keyword" },
          userId: { type: "keyword" },
          sender: { type: "keyword" },
          recipient: { type: "text" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
          createdAt: { type: "date" },
        },
      },
    });

    console.log(`Elasticsearch index "${EMAIL_INDEX}" created`);
  } else {
    console.log(
      `Elasticsearch index "${EMAIL_INDEX}" already exists`
    );
  }
};

export const indexEmail = async (
  email: EmailSearchDocument
) => {
  await elasticsearch.index({
    index: EMAIL_INDEX,
    id: email.id,
    document: email,
    refresh: "wait_for",
  });

  console.log(
    `Email ${email.id} indexed in Elasticsearch`
  );
};

export const searchEmails = async (
  userId: string,
  searchText: string
) => {
  const response = await elasticsearch.search<EmailSearchDocument>({
    index: EMAIL_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              userId,
            },
          },
          {
            multi_match: {
              query: searchText,
              fields: [
                "recipient",
                "subject",
                "body",
              ],
            },
          },
        ],
      },
    },
  });

  return response.hits.hits.map((hit) => hit._source);
};