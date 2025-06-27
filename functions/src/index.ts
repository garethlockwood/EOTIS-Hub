
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {Storage} from "@google-cloud/storage";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import * as xlsx from "xlsx";

admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();

export const onFileUpload = functions.storage
  .object()
  .onFinalize(async (object: functions.storage.ObjectMetadata) => {
    const filePath = object.name;
    const bucketName = object.bucket;
    const contentType = object.contentType;
    const metadata = object.metadata || {};
    const userId = metadata.associatedUserId;

    if (!filePath || !userId || !contentType) {
      console.error("Missing required fields:", {
        filePath,
        userId,
        contentType,
      });
      return;
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const buffer = (await file.download())[0];

    let text = "";

    try {
      if (contentType.includes("pdf")) {
        text = (await pdfParse(buffer)).text;
      } else if (
        contentType.includes("officedocument.wordprocessingml.document")
      ) {
        text = (await mammoth.extractRawText({buffer})).value;
      } else if (
        contentType.includes("spreadsheet") ||
        filePath.endsWith(".xlsx")
      ) {
        const workbook = xlsx.read(buffer, {type: "buffer"});
        text = workbook.SheetNames.map((sheetName) =>
          xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName])
        ).join("\n");
      } else {
        console.warn(`Unsupported file type: ${contentType}`);
        return;
      }
    } catch (err) {
      console.error("Error parsing file:", err);
      return;
    }

    const CHUNK_SIZE = 1000;
    const chunks = text.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) || [];

    const batch = db.batch();
    const docRef = db.collection("userDocuments").doc(userId);
    const docMeta = docRef
      .collection("files")
      .doc(filePath.replace(/\//g, "_"));

    batch.set(docMeta, {
      originalPath: filePath,
      uploadedAt: new Date(),
      totalChunks: chunks.length,
    });

    chunks.forEach((chunk, index) => {
      const chunkRef = docMeta.collection("chunks").doc(`chunk_${index}`);
      batch.set(chunkRef, {
        content: chunk,
        index,
        embedded: false,
      });
    });

    await batch.commit();
    console.log(
      `Processed and stored ${chunks.length} chunks for user ${userId}`
    );
  });
