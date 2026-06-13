export type LimitMode = "full" | "capped";

export type LimitFrequency = "daily" | "monthly";

export type MaxQuotaForm = {
  mode: LimitMode;
  max: string;
};

export type FrequencyQuotaForm = {
  mode: LimitMode;
  max: string;
  frequency: LimitFrequency;
};

export type SupportChatForm = {
  mode: "full" | "capped" | "community" | "legacy_boolean";
  max: string;
  frequency: LimitFrequency;
};

export type SupportAttachmentsForm = {
  mode: "off" | "on_unlimited" | "on_capped" | "full";
  max: string;
  frequency: LimitFrequency;
};

export type SupportTrialForm = {
  enabled: boolean;
  chatMax: string;
  chatFrequency: LimitFrequency;
  attachmentsMode: "off" | "on_unlimited" | "on_capped";
  attachmentsMax: string;
  attachmentsFrequency: LimitFrequency;
  agentChat: boolean;
};

export type CustomLimitationEntry = {
  id: string;
  key: string;
  valueJson: string;
};

export type PlanLimitationsFormValues = {
  customers: MaxQuotaForm;
  transactions: FrequencyQuotaForm;
  aiTools: FrequencyQuotaForm;
  onlineOrders: FrequencyQuotaForm;
  staffAdmin: string;
  staffRider: string;
  supportChat: SupportChatForm;
  supportAttachments: SupportAttachmentsForm;
  supportAgentChat: boolean;
  supportTrial: SupportTrialForm;
  customEntries: CustomLimitationEntry[];
};

const KNOWN_LIMITATION_KEYS = new Set([
  "customers",
  "transactions",
  "aiTools",
  "online_orders",
  "onlineOrders",
  "staff",
  "support",
]);

const LEGACY_LIMITATION_KEYS = ["supportAi", "supportAiTrial"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ?
      (value as Record<string, unknown>)
    : null;
}

function readNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function isUnlimited(value: unknown): boolean {
  return value === "full" || value === "unlimited";
}

function parseMaxQuota(value: unknown, defaultMode: LimitMode = "full"): MaxQuotaForm {
  if (isUnlimited(value)) {
    return { mode: "full", max: "" };
  }
  const record = asRecord(value);
  if (record && record.max !== undefined) {
    return { mode: "capped", max: String(record.max) };
  }
  if (typeof value === "number") {
    return { mode: "capped", max: String(value) };
  }
  return { mode: defaultMode, max: "" };
}

function parseFrequencyQuota(
  value: unknown,
  defaultFrequency: LimitFrequency = "daily",
): FrequencyQuotaForm {
  if (isUnlimited(value)) {
    return { mode: "full", max: "", frequency: defaultFrequency };
  }
  const record = asRecord(value);
  if (record) {
    const frequency =
      String(record.frequency || defaultFrequency).toLowerCase() === "monthly" ?
        "monthly"
      : "daily";
    return {
      mode: "capped",
      max: record.max !== undefined ? String(record.max) : "",
      frequency,
    };
  }
  return { mode: "full", max: "", frequency: defaultFrequency };
}

function parseSupportChat(support: unknown): SupportChatForm {
  if (typeof support === "string") {
    if (support === "community") {
      return { mode: "community", max: "", frequency: "monthly" };
    }
    if (isUnlimited(support) || support === "chat") {
      return { mode: "full", max: "", frequency: "monthly" };
    }
  }

  const supportRecord = asRecord(support);
  if (!supportRecord) {
    return { mode: "capped", max: "", frequency: "monthly" };
  }

  const chat = supportRecord.chat;
  if (isUnlimited(chat)) {
    return { mode: "full", max: "", frequency: "monthly" };
  }
  if (chat === true) {
    return { mode: "legacy_boolean", max: "", frequency: "monthly" };
  }
  const chatRecord = asRecord(chat);
  if (chatRecord?.max !== undefined) {
    const frequency =
      String(chatRecord.frequency || "monthly").toLowerCase() === "daily" ?
        "daily"
      : "monthly";
    return {
      mode: "capped",
      max: String(chatRecord.max),
      frequency,
    };
  }

  return { mode: "capped", max: "", frequency: "monthly" };
}

function parseSupportAttachments(support: unknown): SupportAttachmentsForm {
  const supportRecord = asRecord(support);
  const attachments = supportRecord?.attachments;

  if (attachments === false || attachments === 0 || attachments === "none") {
    return { mode: "off", max: "", frequency: "monthly" };
  }
  if (attachments === true) {
    return { mode: "on_unlimited", max: "", frequency: "monthly" };
  }
  if (isUnlimited(attachments)) {
    return { mode: "full", max: "", frequency: "monthly" };
  }

  const record = asRecord(attachments);
  if (record) {
    if (record.enabled === false) {
      return { mode: "off", max: "", frequency: "monthly" };
    }
    const frequency =
      String(record.frequency || "monthly").toLowerCase() === "daily" ?
        "daily"
      : "monthly";
    if (record.max !== undefined) {
      return {
        mode: "on_capped",
        max: String(record.max),
        frequency,
      };
    }
    return { mode: "on_unlimited", max: "", frequency };
  }

  return { mode: "off", max: "", frequency: "monthly" };
}

function parseSupportAgentChat(support: unknown): boolean {
  const supportRecord = asRecord(support);
  return supportRecord?.agentChat === true;
}

function parseSupportTrial(support: unknown): SupportTrialForm {
  const supportRecord = asRecord(support);
  const trial = asRecord(supportRecord?.trial);
  if (!trial) {
    return {
      enabled: false,
      chatMax: "",
      chatFrequency: "daily",
      attachmentsMode: "off",
      attachmentsMax: "",
      attachmentsFrequency: "daily",
      agentChat: false,
    };
  }

  const chat = asRecord(trial.chat);
  const attachments = asRecord(trial.attachments);

  let attachmentsMode: SupportTrialForm["attachmentsMode"] = "off";
  if (attachments?.enabled === true) {
    attachmentsMode =
      attachments.max !== undefined ? "on_capped" : "on_unlimited";
  }

  return {
    enabled: true,
    chatMax: chat?.max !== undefined ? String(chat.max) : "",
    chatFrequency:
      String(chat?.frequency || "daily").toLowerCase() === "monthly" ?
        "monthly"
      : "daily",
    attachmentsMode,
    attachmentsMax:
      attachments?.max !== undefined ? String(attachments.max) : "",
    attachmentsFrequency:
      String(attachments?.frequency || "daily").toLowerCase() === "monthly" ?
        "monthly"
      : "daily",
    agentChat: trial.agentChat === true,
  };
}

function customEntryId(key: string): string {
  return `custom-${key}`;
}

export function emptyPlanLimitationsForm(): PlanLimitationsFormValues {
  return {
    customers: { mode: "capped", max: "" },
    transactions: { mode: "capped", max: "", frequency: "daily" },
    aiTools: { mode: "capped", max: "", frequency: "monthly" },
    onlineOrders: { mode: "capped", max: "", frequency: "daily" },
    staffAdmin: "0",
    staffRider: "0",
    supportChat: { mode: "capped", max: "", frequency: "monthly" },
    supportAttachments: { mode: "off", max: "", frequency: "monthly" },
    supportAgentChat: false,
    supportTrial: {
      enabled: false,
      chatMax: "",
      chatFrequency: "daily",
      attachmentsMode: "off",
      attachmentsMax: "",
      attachmentsFrequency: "daily",
      agentChat: false,
    },
    customEntries: [],
  };
}

export function planLimitationsFormFromFirestore(
  limitations: unknown,
): PlanLimitationsFormValues {
  const record = asRecord(limitations) ?? {};
  const staff = asRecord(record.staff);
  const onlineOrdersSource = record.online_orders ?? record.onlineOrders;

  const customEntries: CustomLimitationEntry[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (KNOWN_LIMITATION_KEYS.has(key)) continue;
    customEntries.push({
      id: customEntryId(key),
      key,
      valueJson: JSON.stringify(value, null, 2),
    });
  }

  for (const legacyKey of LEGACY_LIMITATION_KEYS) {
    if (!(legacyKey in record)) continue;
    if (customEntries.some((entry) => entry.key === legacyKey)) continue;
    customEntries.push({
      id: customEntryId(legacyKey),
      key: legacyKey,
      valueJson: JSON.stringify(record[legacyKey], null, 2),
    });
  }

  return {
    customers: parseMaxQuota(record.customers, "capped"),
    transactions: parseFrequencyQuota(record.transactions, "daily"),
    aiTools: parseFrequencyQuota(record.aiTools, "monthly"),
    onlineOrders: parseFrequencyQuota(onlineOrdersSource, "daily"),
    staffAdmin: staff?.admin !== undefined ? String(staff.admin) : "0",
    staffRider: staff?.rider !== undefined ? String(staff.rider) : "0",
    supportChat: parseSupportChat(record.support),
    supportAttachments: parseSupportAttachments(record.support),
    supportAgentChat: parseSupportAgentChat(record.support),
    supportTrial: parseSupportTrial(record.support),
    customEntries,
  };
}

function buildMaxQuota(form: MaxQuotaForm): unknown {
  if (form.mode === "full") return "full";
  return { max: readNumber(form.max) ?? 0 };
}

function buildFrequencyQuota(form: FrequencyQuotaForm): unknown {
  if (form.mode === "full") return "full";
  return {
    max: readNumber(form.max) ?? 0,
    frequency: form.frequency,
  };
}

function buildSupportChat(form: SupportChatForm): unknown {
  if (form.mode === "full") return "full";
  if (form.mode === "community") return "community";
  if (form.mode === "legacy_boolean") return true;
  return {
    max: readNumber(form.max) ?? 0,
    frequency: form.frequency,
  };
}

function buildSupportAttachments(form: SupportAttachmentsForm): unknown {
  if (form.mode === "off") return false;
  if (form.mode === "full") return "full";
  if (form.mode === "on_unlimited") return true;
  return {
    enabled: true,
    max: readNumber(form.max) ?? 0,
    frequency: form.frequency,
  };
}

function buildSupportTrial(form: SupportTrialForm): Record<string, unknown> | undefined {
  if (!form.enabled) return undefined;
  const trial: Record<string, unknown> = {
    agentChat: form.agentChat,
  };

  if (form.chatMax.trim()) {
    trial.chat = {
      max: readNumber(form.chatMax) ?? 0,
      frequency: form.chatFrequency,
    };
  }

  if (form.attachmentsMode === "off") {
    trial.attachments = { enabled: false };
  } else if (form.attachmentsMode === "on_unlimited") {
    trial.attachments = { enabled: true };
  } else {
    trial.attachments = {
      enabled: true,
      max: readNumber(form.attachmentsMax) ?? 0,
      frequency: form.attachmentsFrequency,
    };
  }

  return trial;
}

function parseCustomEntries(entries: CustomLimitationEntry[]): Record<string, unknown> {
  const custom: Record<string, unknown> = {};
  for (const entry of entries) {
    const key = entry.key.trim();
    if (!key) continue;
    if (
      KNOWN_LIMITATION_KEYS.has(key) ||
      LEGACY_LIMITATION_KEYS.includes(key as (typeof LEGACY_LIMITATION_KEYS)[number])
    ) {
      continue;
    }
    custom[key] = JSON.parse(entry.valueJson) as unknown;
  }
  return custom;
}

export function validatePlanLimitationsForm(
  values: PlanLimitationsFormValues,
): string | null {
  for (const entry of values.customEntries) {
    const key = entry.key.trim();
    if (!key) return "Custom limitation key cannot be empty.";
    if (KNOWN_LIMITATION_KEYS.has(key)) {
      return `Custom key "${key}" conflicts with a built-in limitation.`;
    }
    try {
      JSON.parse(entry.valueJson);
    } catch {
      return `Custom limitation "${key}" must be valid JSON.`;
    }
  }

  const keys = values.customEntries.map((entry) => entry.key.trim()).filter(Boolean);
  if (new Set(keys).size !== keys.length) {
    return "Custom limitation keys must be unique.";
  }

  return null;
}

export function planLimitationsToFirestore(
  values: PlanLimitationsFormValues,
): Record<string, unknown> {
  const onlineOrdersValue = buildFrequencyQuota(values.onlineOrders);

  let support: unknown;
  if (
    values.supportChat.mode === "community" &&
    values.supportAttachments.mode === "off" &&
    !values.supportAgentChat &&
    !values.supportTrial.enabled
  ) {
    support = "community";
  } else {
    const supportObject: Record<string, unknown> = {
      chat: buildSupportChat(values.supportChat),
      attachments: buildSupportAttachments(values.supportAttachments),
      agentChat: values.supportAgentChat,
    };
    const trial = buildSupportTrial(values.supportTrial);
    if (trial) {
      supportObject.trial = trial;
    }
    support = supportObject;
  }

  const limitations: Record<string, unknown> = {
    customers: buildMaxQuota(values.customers),
    transactions: buildFrequencyQuota(values.transactions),
    aiTools: buildFrequencyQuota(values.aiTools),
    online_orders: onlineOrdersValue,
    onlineOrders: onlineOrdersValue,
    staff: {
      admin: readNumber(values.staffAdmin) ?? 0,
      rider: readNumber(values.staffRider) ?? 0,
    },
    support,
    ...parseCustomEntries(values.customEntries),
  };

  return limitations;
}

export function createCustomLimitationEntry(key = ""): CustomLimitationEntry {
  const normalized = key.trim() || `feature_${Date.now()}`;
  return {
    id: `new-${normalized}-${Math.random().toString(36).slice(2, 8)}`,
    key: normalized,
    valueJson: '{\n  \n}',
  };
}
