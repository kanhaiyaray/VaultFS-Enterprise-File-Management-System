/**
 * server/utils/workflowEngine.js
 * Core workflow automation engine.
 */
const fs = require("fs");
const path = require("path");
const { sendMail, emails } = require("./sendMail");
const File = require("../models/File");
const User = require("../models/User");
const Workflow = require("../models/Workflow");
const { getIO } = require("./socket");

let scheduler = null;

const normalizeTime = (value) => {
  if (!value || typeof value !== "string") return null;
  const [hours, minutes] = value.split(":").map((v) => parseInt(v, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours: Math.max(0, Math.min(23, hours)), minutes: Math.max(0, Math.min(59, minutes)) };
};

const dayName = (index) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][index];

const shouldRunSchedule = (workflow) => {
  if (!workflow.trigger || workflow.trigger.type !== "time") return false;
  const time = normalizeTime(workflow.trigger.scheduleTime || "00:00");
  if (!time) return false;

  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const targetMinute = time.hours * 60 + time.minutes;
  if (currentMinute !== targetMinute) return false;

  const lastRun = workflow.lastRunAt ? new Date(workflow.lastRunAt) : null;
  if (!lastRun) return true;

  const sameDay = lastRun.getFullYear() === now.getFullYear()
    && lastRun.getMonth() === now.getMonth()
    && lastRun.getDate() === now.getDate();

  if (workflow.trigger.scheduleType === "daily") {
    return !sameDay;
  }

  if (workflow.trigger.scheduleType === "weekly") {
    const todayKey = dayName(now.getDay());
    const allowed = Array.isArray(workflow.trigger.daysOfWeek) ? workflow.trigger.daysOfWeek : [];
    if (!allowed.includes(todayKey)) return false;
    return !sameDay;
  }

  if (workflow.trigger.scheduleType === "monthly") {
    const dayOfMonth = workflow.trigger.dayOfMonth || 1;
    if (now.getDate() !== dayOfMonth) return false;
    return !sameDay;
  }

  return false;
};

const matchesCondition = (workflow, payload) => {
  if (!workflow.condition || !workflow.condition.value) return true;
  const { field, operator, value } = workflow.condition;
  const raw = value.toString().toLowerCase();
  let target = "";

  if (field === "tags") {
    target = Array.isArray(payload.tags) ? payload.tags.join(" ") : "";
  } else if (field === "owner") {
    target = payload.owner?.toString() || "";
  } else if (field === "mimetype") {
    target = payload.mimetype || "";
  } else if (field === "originalName") {
    target = payload.originalName || "";
  } else if (field === "description") {
    target = payload.description || "";
  }

  target = target.toString().toLowerCase();
  if (operator === "contains") return target.includes(raw);
  if (operator === "equals") return target === raw;
  if (operator === "not_equals") return target !== raw;
  if (operator === "greater_than") return parseFloat(target) > parseFloat(raw);
  if (operator === "less_than") return parseFloat(target) < parseFloat(raw);
  return true;
};

const appendRunHistory = async (workflow, runData) => {
  workflow.runHistory.unshift(runData);
  if (workflow.runHistory.length > 50) workflow.runHistory = workflow.runHistory.slice(0, 50);
  workflow.lastRunAt = runData.startedAt;
  workflow.nextRunAt = null;
  await workflow.save();
};

const executeAction = async (workflow, action, payload, runLog) => {
  const logs = [];
  const actionLabel = action.label || action.type;
  const params = action.params || {};

  const addLog = (entry) => {
    logs.push(`${actionLabel}: ${entry}`);
  };

  try {
    if (action.type === "delete") {
      const retentionDays = parseInt(params.retentionDays, 10) || 0;
      if (!retentionDays) {
        if (payload.file) {
          const file = payload.file;
          if (!file.isDeleted) {
            await File.findByIdAndUpdate(file._id, { isDeleted: true, deletedAt: new Date() });
            addLog(`Marked file ${file.originalName} as deleted.`);
          }
        }
      } else {
        const cutoff = new Date(Date.now() - retentionDays * 86400_000);
        const removed = await File.updateMany(
          { createdAt: { $lte: cutoff }, isDeleted: false },
          { isDeleted: true, deletedAt: new Date() }
        );
        addLog(`Auto-deleted ${removed.modifiedCount} files older than ${retentionDays} days.`);
      }
    } else if (action.type === "backup") {
      const destination = params.destinationPath || path.join(__dirname, "../backups", workflow._id.toString());
      // Local filesystem backup (default)
      if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
      if (payload.file?.path && fs.existsSync(payload.file.path)) {
        const destFile = path.join(destination, path.basename(payload.file.path));
        fs.copyFileSync(payload.file.path, destFile);
        addLog(`Backed up file ${payload.file.originalName} to ${destFile}.`);
      } else {
        addLog("No file available for backup.");
      }

      // Optional S3 backup support if params.s3 is provided. Uses lazy require so missing SDK won't crash.
      if (params.s3 && payload.file?.path && fs.existsSync(payload.file.path)) {
        try {
          const AWS = require('aws-sdk');
          const s3 = new AWS.S3({
            region: params.s3.region || process.env.AWS_REGION,
            accessKeyId: params.s3.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: params.s3.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
          });
          const key = `${(params.s3.keyPrefix || '').replace(/\/+$/, '')}/${path.basename(payload.file.path)}`.replace(/^\//, '');
          const fileStream = fs.createReadStream(payload.file.path);
          await s3.upload({ Bucket: params.s3.bucket, Key: key, Body: fileStream }).promise();
          addLog(`Backed up file to s3://${params.s3.bucket}/${key}`);
        } catch (err) {
          addLog(`S3 backup failed: ${err.message}`);
        }
      }
    } else if (action.type === "notify") {
      const email = params.email;
      const subject = params.subject || `Workflow notification: ${workflow.name}`;
      const message = params.message || `Workflow ${workflow.name} executed.`;
      if (email) {
        await sendMail({ to: email, subject, html: `<p>${message}</p>` });
        addLog(`Notification sent to ${email}.`);
      } else {
        addLog("Notification skipped because email was not configured.");
      }
    } else if (action.type === "report") {
      const report = {
        workflow: workflow.name,
        triggeredAt: new Date().toISOString(),
        payloadSummary: payload || {},
      };
      addLog(`Generated report: ${JSON.stringify(report).slice(0, 300)}.`);
    } else if (action.type === "approval") {
      addLog("Approval step is configured; no execution action performed here.");
    }

    // Branching action type: execute nested actions based on a condition
    else if (action.type === "branch") {
      const cond = params.condition || action.condition || {};
      const truthy = matchesCondition({ condition: cond }, payload);
      addLog(`Branch evaluated to ${truthy}`);
      const thenActions = params.thenActions || [];
      const elseActions = params.elseActions || [];
      const toRun = truthy ? thenActions : elseActions;
      for (const sub of toRun) {
        try {
          await executeAction(workflow, sub, payload, runLog);
        } catch (err) {
          addLog(`Branch sub-action failed: ${err.message}`);
        }
      }
    }
  } catch (err) {
    addLog(`Action failed: ${err.message}`);
  }

  runLog.logs.push(...logs);
  return logs;
};

const executeWorkflow = async (workflow, payload = {}, options = {}) => {
  const runLog = {
    status: "running",
    triggerType: workflow.trigger?.type || "manual",
    triggerPayload: payload,
    logs: [],
    startedAt: new Date(),
  };

  if (workflow.approval?.required && !options.skipApproval) {
    workflow.pendingApproval = {
      status: "pending",
      requestedBy: options.requestedBy || payload.userId,
      requestedAt: new Date(),
      payload,
      note: options.note || "Approval required before workflow actions execute.",
    };
    runLog.status = "pending";
    runLog.logs.push("Approval required before execution.");
    await appendRunHistory(workflow, runLog);

    try {
      const io = getIO();
      io.emit("workflow:approval_requested", {
        workflowId: workflow._id,
        name: workflow.name,
        requestedAt: workflow.pendingApproval.requestedAt,
      });
    } catch {
      // best effort
    }
    return runLog;
  }

  let finalStatus = "completed";
  for (const action of workflow.actions) {
    await executeAction(workflow, action, payload, runLog);
  }

  runLog.completedAt = new Date();
  runLog.status = finalStatus;

  await appendRunHistory(workflow, runLog);
  return runLog;
};

const dispatchEvent = async (event) => {
  try {
    const workflows = await Workflow.find({ isActive: true, "trigger.type": "file_event" });
    for (const workflow of workflows) {
      if (workflow.trigger.event !== "any" && workflow.trigger.event !== event.type) continue;
      if (!matchesCondition(workflow, event.file || {})) continue;
      await executeWorkflow(workflow, { ...event, file: event.file, userId: event.userId });
    }
  } catch (err) {
    console.error("[workflowEngine] dispatchEvent error:", err.message);
  }
};

const triggerWebhook = async (pathKey, secret, payload) => {
  try {
    const workflow = await Workflow.findOne({
      isActive: true,
      "trigger.type": "webhook",
      "trigger.webhookPath": pathKey,
    });
    if (!workflow) return null;
    if (workflow.trigger.webhookSecret && workflow.trigger.webhookSecret !== secret) return null;
    return await executeWorkflow(workflow, { event: "webhook", payload, source: pathKey });
  } catch (err) {
    console.error("[workflowEngine] triggerWebhook error:", err.message);
    return null;
  }
};

const runScheduledWorkflows = async () => {
  try {
    const workflows = await Workflow.find({ isActive: true, "trigger.type": "time" });
    for (const workflow of workflows) {
      if (shouldRunSchedule(workflow)) {
        await executeWorkflow(workflow, { event: "schedule" });
      }
    }
  } catch (err) {
    console.error("[workflowEngine] runScheduledWorkflows error:", err.message);
  }
};

const startEngine = () => {
  if (scheduler) return;
  scheduler = setInterval(runScheduledWorkflows, 60_000);
  runScheduledWorkflows().catch(() => { });
  console.log("✅ Workflow engine started");
};

const stopEngine = () => {
  if (!scheduler) return;
  clearInterval(scheduler);
  scheduler = null;
};

module.exports = {
  dispatchEvent,
  triggerWebhook,
  executeWorkflow,
  startEngine,
  stopEngine,
};
