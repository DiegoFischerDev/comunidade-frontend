/** Versão do modelo de dados (incrementar se o formato mudar de forma incompatível). */
export const IMMIGRATION_PLAN_STORAGE_VERSION = 1;

const STORAGE_KEY = 'rpm_immigration_plan_v1';

export type ImmigrationPlanVisaType =
  | ''
  | 'ESTUDO'
  | 'TRABALHO'
  | 'D8_NOMADE'
  | 'D7_PASSIVO'
  | 'D2_EMPREENDEDOR'
  | 'REAGRUPAMENTO';

export type ImmigrationPlanCityKey =
  | ''
  | 'INTERIOR'
  | 'LISBOA'
  | 'PORTO'
  | 'BRAGA'
  | 'COIMBRA'
  | 'AVEIRO'
  | 'FARO'
  | 'ALGARVE'
  | 'EVORA'
  | 'VISEU';

export type ImmigrationPlanData = {
  meta?: {
    visaType?: ImmigrationPlanVisaType;
    cidade?: ImmigrationPlanCityKey;
    cidadePlanoB?: ImmigrationPlanCityKey;
    agregadoFamiliar?: '' | '1' | '2' | '3' | '4' | '5+';
    numQuartos?: '' | '0' | '1' | '2' | '3' | '4+';
    profissoesPossiveis?: string[];
    precisaCarro?: boolean | null;
    dataViagem?: string;
    notas?: string;
  };
  checks?: Record<string, boolean>;
};

type StoredEnvelope = {
  version: number;
  data: ImmigrationPlanData;
  savedAt: string;
};

export const EMPTY_IMMIGRATION_PLAN: ImmigrationPlanData = { meta: {}, checks: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeData(raw: unknown): ImmigrationPlanData {
  if (!isRecord(raw)) return { ...EMPTY_IMMIGRATION_PLAN };
  const meta = isRecord(raw.meta) ? raw.meta : {};
  const checksRaw = raw.checks;
  const checks: Record<string, boolean> = {};
  if (isRecord(checksRaw)) {
    for (const [k, v] of Object.entries(checksRaw)) {
      if (typeof v === 'boolean') checks[k] = v;
    }
  }
  return { meta: meta as ImmigrationPlanData['meta'], checks };
}

export function loadImmigrationPlanLocal(): ImmigrationPlanData {
  if (typeof window === 'undefined') return { ...EMPTY_IMMIGRATION_PLAN };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_IMMIGRATION_PLAN };
    const parsed = JSON.parse(raw) as StoredEnvelope;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_IMMIGRATION_PLAN };
    if (parsed.version !== IMMIGRATION_PLAN_STORAGE_VERSION) {
      return normalizeData(parsed.data);
    }
    return normalizeData(parsed.data);
  } catch {
    return { ...EMPTY_IMMIGRATION_PLAN };
  }
}

export function getImmigrationPlanLocalSavedAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnvelope;
    return typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
  } catch {
    return null;
  }
}

/** Persiste no dispositivo; devolve ISO da gravação. */
export function persistImmigrationPlanLocal(data: ImmigrationPlanData): string {
  const savedAt = new Date().toISOString();
  const envelope: StoredEnvelope = {
    version: IMMIGRATION_PLAN_STORAGE_VERSION,
    data: {
      meta: data.meta ?? {},
      checks: data.checks ?? {},
    },
    savedAt,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  return savedAt;
}
