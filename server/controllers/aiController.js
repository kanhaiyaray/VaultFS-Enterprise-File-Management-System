/**
 * controllers/aiController.js
 * VaultFS AI utilities for file organization, duplicate discovery, and image-aware search.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const File = require("../models/File");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const normalizeText = (value) =>
  value?.toString().toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ") || "";

const tokenize = (value) => {
  const normalized = normalizeText(value);
  return [...new Set(normalized.split(" ").filter(Boolean))];
};

const jaccardSimilarity = (a, b) => {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (!tokensA.size || !tokensB.size) return 0;
  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  return intersection / new Set([...tokensA, ...tokensB]).size;
};

const numericRatio = (a, b) => {
  if (!a || !b) return 0;
  const smaller = Math.min(a, b);
  const larger = Math.max(a, b);
  return smaller / larger;
};

const sanitizeRegex = (term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const callOpenAI = async (prompt) => {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const response = await axios.post(
    "https://api.openai.com/v1/responses",
    {
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 300,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  const output = response.data?.output;
  if (!output) return "";

  if (Array.isArray(output)) {
    return output
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.content) {
          if (typeof item.content === "string") return item.content;
          return Array.isArray(item.content)
            ? item.content.map((child) => child?.text || "").join("")
            : "";
        }
        return "";
      })
      .join(" ")
      .trim();
  }

  if (typeof output === "string") return output.trim();
  return "";
};

const buildAIDescription = ({ originalName, description, tags, mimetype, metadata }) => {
  const base = normalizeText(originalName).replace(/\b(jpe?g|png|gif|webp|bmp|svg)\b/g, "").trim();
  const words = [base || "untitled file"];
  if (mimetype?.startsWith("image/")) words.unshift("image");
  if (description) words.push(description);
  if (Array.isArray(tags) && tags.length) words.push(`tags: ${tags.join(", ")}`);
  if (metadata?.width && metadata?.height) words.push(`dimensions: ${metadata.width}x${metadata.height}`);
  return words.join(". ");
};

const detectFolderHints = (text = "") => {
  const normalized = normalizeText(text);
  const hints = new Set();

  if (/invoice|receipt|bill|statement|expense/.test(normalized)) hints.add("Invoices & Receipts");
  if (/contract|agreement|nda|terms|policy/.test(normalized)) hints.add("Contracts");
  if (/proposal|project|roadmap|specification|scope/.test(normalized)) hints.add("Project Files");
  if (/presentation|deck|slides|pitch/.test(normalized)) hints.add("Presentations");
  if (/photo|picture|image|screenshot|screengrab/.test(normalized)) hints.add("Photos");
  if (/tax|finance|budget|payroll/.test(normalized)) hints.add("Finance");
  if (/design|mockup|wireframe|ui|ux/.test(normalized)) hints.add("Design");
  if (/legal|court|lawsuit|claim|resume|cv/.test(normalized)) hints.add("Legal");
  if (/meeting|minutes|notes|agenda/.test(normalized)) hints.add("Meeting Notes");
  if (/research|report|analysis|audit/.test(normalized)) hints.add("Reports");
  if (/personal|family|travel|vacation/.test(normalized)) hints.add("Personal");

  return [...hints];
};

const buildFolderSuggestions = async ({ originalName, description, tags, mimetype, metadata }, extraContent = "") => {
  const candidates = new Set();
  const sourceText = [originalName, description, tags?.join(" "), extraContent].filter(Boolean).join(" ");

  detectFolderHints(sourceText).slice(0, 4).forEach((suggestion) => candidates.add(suggestion));

  if (mimetype?.startsWith("image/")) {
    candidates.add("Photos");
    candidates.add("Image Library");
    if (/screenshot|screengrab/.test(normalizeText(sourceText))) candidates.add("Screenshots");
  }

  if (mimetype?.includes("pdf") || /doc|pdf/.test(normalizeText(originalName))) {
    candidates.add("Documents");
  }

  if (candidates.size < 3) {
    candidates.add("Shared Documents");
    candidates.add("Work Files");
  }

  if (OPENAI_API_KEY) {
    try {
      const prompt = `You are an intelligent folder suggestion assistant. Suggest three short folder names for organizing a file based on the following metadata:\n\nFile title: ${originalName || "n/a"}\nDescription: ${description || "n/a"}\nTags: ${Array.isArray(tags) ? tags.join(", ") : "n/a"}\nMIME type: ${mimetype || "n/a"}\nAdditional notes: ${extraContent || "n/a"}\n\nProvide exactly 3 unique folder suggestions separated by commas.`;
      const raw = await callOpenAI(prompt);
      raw
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
        .forEach((item) => candidates.add(item));
    } catch (err) {
      // ignore and fallback to local suggestions
    }
  }

  return [...candidates].slice(0, 3);
};

const computeSimilarityScore = (base, candidate) => {
  const hashScore = base.hash && candidate.hash && base.hash === candidate.hash ? 0.45 : 0;
  const nameScore = jaccardSimilarity(base.originalName, candidate.originalName) * 0.25;
  const descScore = Math.max(
    jaccardSimilarity(base.description, candidate.description),
    jaccardSimilarity(base.aiDescription, candidate.aiDescription)
  ) * 0.2;
  const tagScore = jaccardSimilarity((base.tags || []).join(" "), (candidate.tags || []).join(" ")) * 0.1;
  const sizeScore = numericRatio(base.size, candidate.size) * 0.1;
  const typeScore = base.mimetype === candidate.mimetype ? 0.05 : 0;
  return Math.min(hashScore + nameScore + descScore + tagScore + sizeScore + typeScore, 1);
};

const getFolderSuggestions = async (req, res, next) => {
  try {
    const { fileId, content = "" } = req.body;
    let file;
    if (fileId) {
      file = await File.findOne({ _id: fileId, owner: req.user.id, isDeleted: false }).lean();
      if (!file) return res.status(404).json({ success: false, message: "File not found." });
    }

    const metadata = file || {
      originalName: req.body.originalName || "",
      description: req.body.description || "",
      tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean) : []),
      mimetype: req.body.mimetype || "application/octet-stream",
      metadata: req.body.metadata || {},
    };

    const suggestions = await buildFolderSuggestions(metadata, content);
    return res.json({ success: true, suggestions });
  } catch (err) { next(err); }
};

const getDuplicateSimilarity = async (req, res, next) => {
  try {
    const { fileId } = req.query;
    const files = await File.find({ owner: req.user.id, isDeleted: false }).lean();

    if (!files.length) return res.json({ success: true, duplicates: [] });

    if (fileId) {
      const base = files.find((file) => file._id.toString() === fileId.toString());
      if (!base) return res.status(404).json({ success: false, message: "File not found." });

      const candidates = files
        .filter((file) => file._id.toString() !== fileId.toString())
        .map((candidate) => ({
          file: candidate,
          similarity: computeSimilarityScore(base, candidate),
        }))
        .filter((entry) => entry.similarity >= 0.18)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 12);

      return res.json({ success: true, file: base, duplicates: candidates });
    }

    const exactGroups = await File.aggregate([
      { $match: { owner: req.user.id, isDeleted: false, hash: { $exists: true, $ne: null } } },
      { $group: { _id: "$hash", count: { $sum: 1 }, files: { $push: { id: "$_id", originalName: "$originalName", size: "$size", mimetype: "$mimetype" } } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const nearDuplicated = [];
    for (let i = 0; i < files.length; i += 1) {
      for (let j = i + 1; j < files.length; j += 1) {
        const similarity = computeSimilarityScore(files[i], files[j]);
        if (similarity >= 0.3 && files[i].hash !== files[j].hash) {
          nearDuplicated.push({
            pair: [files[i]._id, files[j]._id],
            files: [files[i], files[j]].map((f) => ({ id: f._id, originalName: f.originalName, size: f.size, mimetype: f.mimetype })),
            similarity,
          });
        }
      }
    }

    return res.json({ success: true, exactDuplicates: exactGroups, similarDuplicates: nearDuplicated.slice(0, 20) });
  } catch (err) { next(err); }
};

const searchContent = async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) return res.status(400).json({ success: false, message: "Query parameter 'q' is required." });

    const regex = new RegExp(sanitizeRegex(query), "i");
    const files = await File.find({
      owner: req.user.id,
      isDeleted: false,
      $or: [
        { originalName: regex },
        { description: regex },
        { aiDescription: regex },
        { tags: regex },
      ],
    }).lean();

    const scored = files.map((file) => {
      let score = 0;
      if (regex.test(file.originalName)) score += 3;
      if (regex.test(file.description || "")) score += 2;
      if (regex.test(file.aiDescription || "")) score += 2.5;
      if (regex.test((file.tags || []).join(" "))) score += 1;
      return { file, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return res.json({ success: true, files: scored.map((entry) => entry.file) });
  } catch (err) { next(err); }
};

const describeImage = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user.id, isDeleted: false });
    if (!file) return res.status(404).json({ success: false, message: "File not found." });
    if (!file.mimetype?.startsWith("image/")) return res.status(400).json({ success: false, message: "Only images can be described." });

    const fallback = buildAIDescription(file);
    let aiDescription = fallback;

    if (OPENAI_API_KEY) {
      try {
        const prompt = `You are a smart metadata assistant. Based on the following image metadata, write a concise descriptive summary that could be used for search and organization:\n\nFile name: ${file.originalName}\nDescription: ${file.description || "none"}\nTags: ${Array.isArray(file.tags) ? file.tags.join(", ") : "none"}\nMIME type: ${file.mimetype}\nDimensions: ${file.metadata?.width || "unknown"}x${file.metadata?.height || "unknown"}\n\nReturn one descriptive sentence.`;
        const aiResult = await callOpenAI(prompt);
        if (aiResult) aiDescription = aiResult;
      } catch (err) {
        // fallback to local description
      }
    }

    file.aiDescription = aiDescription;
    await file.save();

    return res.json({ success: true, aiDescription, file });
  } catch (err) { next(err); }
};

module.exports = {
  getFolderSuggestions,
  getDuplicateSimilarity,
  searchContent,
  describeImage,
};
