'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { AgendarHeroImage } from '@/components/rafacall/AgendarHeroImage';
import { readRafacallLastName, saveRafacallLastName } from '@/lib/rafacall-guest-storage';
import { BRAND_LOGO_HORIZONTAL_COLORIDA, SITE_NAME_FULL } from '@/lib/site-branding';

type Props = {
  namePrefill?: string;
};

/**
 * Entrada genérica em `/agendar` sem `?whatsapp=`.
 * Nome + WhatsApp → redireciona para a escolha de horários.
 */
export function RafacallPublicWhatsappGate({ namePrefill = '' }: Props) {
  const router = useRouter();
  const [name, setName] = useState(namePrefill.trim());
  const [whatsapp, setWhatsapp] = useState('');
  const [nameError, setNameError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (namePrefill.trim()) return;
    const saved = readRafacallLastName();
    if (saved) setName(saved);
  }, [namePrefill]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const digits = whatsapp.replace(/\D/g, '');

    let hasError = false;
    if (trimmedName.length < 2) {
      setNameError('Indica o teu nome para continuar.');
      hasError = true;
    } else {
      setNameError('');
    }
    if (digits.length < 8) {
      setWhatsappError('Indica um número de WhatsApp válido com indicativo do país.');
      hasError = true;
    } else {
      setWhatsappError('');
    }
    if (hasError) return;

    setIsSubmitting(true);
    saveRafacallLastName(trimmedName);

    const params = new URLSearchParams({
      whatsapp: digits,
      name: trimmedName,
    });
    router.push(`/agendar?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex justify-center">
        <Link href="/" aria-label={`Ir para a página inicial — ${SITE_NAME_FULL}`}>
          <Image
            src={BRAND_LOGO_HORIZONTAL_COLORIDA}
            alt={SITE_NAME_FULL}
            width={480}
            height={120}
            className="h-auto w-[min(100%,14rem)] sm:w-52"
            priority
          />
        </Link>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl bg-card shadow-sm"
      >
        <AgendarHeroImage />
        <div className="p-6">
          <h1 className="text-xl font-bold text-foreground">
            Video chamada com Rafa &amp; Carol
          </h1>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">
            <p>
              Queremos muito te conhecer! Este agendamento é gratuito: vamos te explicar os
              detalhes do nosso serviço e entender o que você realmente precisa.
            </p>
            <p>
              Anote suas dúvidas e venha preparado(a) para esclarecer tudo que for possível.
            </p>
          </div>
          <p className="mt-4 inline-flex rounded-full bg-brand-primary/8 px-3 py-1 text-xs font-semibold text-brand-primary">
            Duração: 15 minutos
          </p>

          <label
            className="mt-6 block text-sm font-medium text-foreground"
            htmlFor="agendar-gate-name"
          >
            Indique seu nome
          </label>
          <input
            id="agendar-gate-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            onBlur={() => saveRafacallLastName(name)}
            placeholder="Seu nome"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-60"
            autoComplete="name"
          />
          {nameError ? (
            <p className="mt-2 text-sm text-red-700">{nameError}</p>
          ) : null}

          <div className="mt-4">
            <LoginWhatsappFields
              idPrefix="agendar-gate"
              value={whatsapp}
              onChange={(v) => {
                setWhatsapp(v);
                if (whatsappError) setWhatsappError('');
              }}
              disabled={isSubmitting}
              error={whatsappError}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'A carregar horários…' : 'Ver horários disponíveis'}
          </button>
        </div>
      </form>
    </div>
  );
}
