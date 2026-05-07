import { prisma } from "@/backend/db/prisma";

type RuntimeField = { name: string };
type RuntimeModel = { fields?: RuntimeField[] };
type RuntimeDataModel = { models?: Record<string, RuntimeModel> };

type IvaClientDelegate = {
  findMany?: (args: { orderBy: { name: "asc" } }) => Promise<Array<{ id: string; name: string }>>;
  findUnique?: (args: { where: { id: string }; select: { name: true } }) => Promise<{ name: string } | null>;
  upsert?: (args: { where: { name: string }; update: {}; create: { name: string } }) => Promise<{ id: string }>;
  delete?: (args: { where: { id: string } }) => Promise<unknown>;
};

function getRuntimeDataModel(): RuntimeDataModel | undefined {
  return (prisma as unknown as { _runtimeDataModel?: RuntimeDataModel })._runtimeDataModel;
}

export function getChequeModelFieldNames(): Set<string> {
  const model = getRuntimeDataModel()?.models?.Cheque;
  return new Set((model?.fields ?? []).map((field) => field.name));
}

export function hasChequeField(fieldName: string): boolean {
  return getChequeModelFieldNames().has(fieldName);
}

export function getIvaClientDelegate(): IvaClientDelegate | undefined {
  return (prisma as unknown as { ivaClient?: IvaClientDelegate }).ivaClient;
}

export function supportsIvaClientCatalog(): boolean {
  return Boolean(getIvaClientDelegate()?.findMany);
}
