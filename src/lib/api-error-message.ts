/** Erro HTTP da API (ver `api.ts`). */
export type HttpErrorLike = Error & { status?: number; code?: string };

const NETWORK_MESSAGE_PATTERNS = [
  /^failed to fetch$/i,
  /^networkerror$/i,
  /network request failed/i,
  /load failed/i,
  /fetch failed/i,
  /err_connection/i,
  /err_network/i,
];

function isNetworkFailureMessage(msg: string): boolean {
  const t = msg.trim();
  if (!t) return true;
  return NETWORK_MESSAGE_PATTERNS.some((p) => p.test(t));
}

function networkFailureMessage(includeUploadHint: boolean): string {
  const apiBase =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
      : '';
  const parts = [
    'Não foi possível contactar o servidor.',
    'Verifica a tua ligação à internet',
  ];
  if (apiBase) {
    parts.push(`e se o endereço da API está correto (${apiBase})`);
  }
  let text = parts.join(' ') + '.';
  if (includeUploadHint) {
    text +=
      ' Se estiveres a enviar várias fotos ou um vídeo grande, o pedido pode falhar por limite de tamanho ou timeout — tenta com ficheiros mais pequenos.';
  }
  return text;
}

/** Mensagens HTTP genéricas em português quando a API não envia `message`. */
export function fallbackHttpErrorMessagePt(status: number): string {
  switch (status) {
    case 400:
      return 'Pedido inválido. Verifica os dados preenchidos e tenta novamente.';
    case 401:
      return 'Sessão expirada ou não autenticado. Inicia sessão novamente.';
    case 403:
      return 'Não tens permissão para realizar esta ação.';
    case 404:
      return 'O recurso pedido não foi encontrado. Atualiza a página e tenta outra vez.';
    case 409:
      return 'Conflito: este registo já existe ou foi alterado entretanto.';
    case 413:
      return 'Os ficheiros enviados são demasiado grandes. Reduz o tamanho das imagens ou do vídeo e tenta novamente.';
    case 429:
      return 'Demasiados pedidos em pouco tempo. Aguarda um momento e tenta outra vez.';
    case 502:
    case 503:
    case 504:
      return 'O servidor está temporariamente indisponível. Tenta novamente dentro de alguns minutos.';
    default:
      if (status >= 500) {
        return `Erro no servidor (${status}). Tenta novamente mais tarde ou contacta o suporte.`;
      }
      return `Não foi possível concluir o pedido (código ${status}).`;
  }
}

export type UserFacingApiErrorOptions = {
  /** Ex.: «Ao guardar o anúncio» — prefixo da frase final. */
  context?: string;
  /** Pedidos com upload (multipart) — mensagem extra sobre tamanho/timeout. */
  isMultipart?: boolean;
};

/**
 * Converte erros de `fetch`, rede ou HTTP em mensagens claras em português.
 */
export function getUserFacingApiError(
  err: unknown,
  options: UserFacingApiErrorOptions = {},
): string {
  const { context, isMultipart = false } = options;
  const prefix = context ? `${context}: ` : '';

  if (!(err instanceof Error)) {
    return `${prefix}Ocorreu um erro inesperado. Tenta novamente.`;
  }

  const httpErr = err as HttpErrorLike;
  const rawMsg = err.message?.trim() ?? '';

  if (err.name === 'AbortError') {
    return `${prefix}O pedido demorou demasiado tempo. ${
      isMultipart
        ? 'Tenta enviar menos ficheiros ou ficheiros mais pequenos.'
        : 'Tenta novamente com uma ligação mais estável.'
    }`;
  }

  const status = httpErr.status;
  if (status === 413) {
    return `${prefix}${fallbackHttpErrorMessagePt(413)}`;
  }
  if (status && status >= 400 && (!rawMsg || isNetworkFailureMessage(rawMsg))) {
    return `${prefix}${fallbackHttpErrorMessagePt(status)}`;
  }

  if (isNetworkFailureMessage(rawMsg)) {
    return `${prefix}${networkFailureMessage(isMultipart)}`;
  }

  if (rawMsg) {
    return context ? `${prefix}${rawMsg}` : rawMsg;
  }

  if (status) {
    return `${prefix}${fallbackHttpErrorMessagePt(status)}`;
  }

  return `${prefix}Ocorreu um erro inesperado. Tenta novamente.`;
}

export function inferMultipartContext(path: string): boolean {
  return /\/houses\b/i.test(path) || path.includes('/uploads');
}

export function inferUserMessageContext(path: string): string | undefined {
  if (/\/houses\b/i.test(path)) {
    return 'Ao guardar o anúncio';
  }
  if (path.includes('/catalog-video')) {
    return 'Ao enviar o vídeo';
  }
  if (path.includes('/card-image')) {
    return 'Ao enviar a imagem';
  }
  return undefined;
}

export function rethrowAsUserFacingError(
  err: unknown,
  path: string,
  extra?: UserFacingApiErrorOptions,
): never {
  const err2 = new Error(
    getUserFacingApiError(err, {
      context: extra?.context ?? inferUserMessageContext(path),
      isMultipart: extra?.isMultipart ?? inferMultipartContext(path),
    }),
  ) as HttpErrorLike;
  if (err instanceof Error) {
    const src = err as HttpErrorLike;
    if (src.status) err2.status = src.status;
    if (src.code) err2.code = src.code;
  }
  throw err2;
}
