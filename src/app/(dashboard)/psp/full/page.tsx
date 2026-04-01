"use client";

export default function PSPFullPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          PSP - Portugal Sem Perrengue (PDF completo)
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Visualize o PDF completo do guia diretamente dentro da Comunidade RPM.
        </p>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
        <iframe
          src="/psp/psp-completo.pdf"
          className="h-full w-full"
          title="PSP - Portugal Sem Perrengue"
        />
      </div>
    </div>
  );
}

