import type { VercelRequest, VercelResponse } from '@vercel/node';

// ID permanente do Cloud Storage no restful-api.dev (gratuito, sem inatividade, 100% ativo)
const CLOUD_STORAGE_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a188175bca502d';

interface Participant {
  sessionId: string;
  name: string;
  avatar: string;
  currentQ: number;
  totalQ: number;
  elapsedSec: number;
  lastPing: number;
  streak?: number;
}

interface Result {
  id: string;
  name: string;
  avatar: string;
  score: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  timestamp: string;
  createdAt: number;
}

// Cache em memória de alta velocidade na Edge/Serverless do Vercel
let memoryCache: {
  results: Result[];
  active: Participant[];
  lastFetch: number;
} = {
  results: [],
  active: [],
  lastFetch: 0
};

// Busca dados consolidados da nuvem
async function fetchCloudData(): Promise<{ results: Result[]; active: Participant[] }> {
  try {
    const res = await fetch(CLOUD_STORAGE_URL, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const results = Array.isArray(json.data.results) ? json.data.results : [];
        const active = Array.isArray(json.data.active) ? json.data.active : [];
        return { results, active };
      }
    }
  } catch (err) {
    console.error('Erro ao buscar dados na nuvem:', err);
  }
  return { results: memoryCache.results, active: memoryCache.active };
}

// Salva dados consolidados na nuvem
async function saveCloudData(results: Result[], active: Participant[]) {
  try {
    await fetch(CLOUD_STORAGE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'quizpulse_grupobr_v1',
        data: {
          results: results.slice(0, 100),
          active
        }
      })
    });
  } catch (err) {
    console.error('Erro ao salvar na nuvem:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura CORS total para funcionar em qualquer domínio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();

  // Limpa participantes com ping expirado (mais de 8 segundos)
  const cleanActiveList = (list: Participant[]) => list.filter(p => now - (p.lastPing || 0) < 8000);

  if (req.method === 'GET') {
    // Atualiza da nuvem se passou mais de 2.5s desde a última leitura
    if (now - memoryCache.lastFetch > 2500 || memoryCache.results.length === 0) {
      const cloud = await fetchCloudData();
      memoryCache.results = cloud.results;
      // Mescla os participantes ativos da memória com os da nuvem
      const mergedMap = new Map<string, Participant>();
      [...cloud.active, ...memoryCache.active].forEach(p => {
        if (p && p.sessionId && now - (p.lastPing || 0) < 8000) {
          mergedMap.set(p.sessionId, p);
        }
      });
      memoryCache.active = Array.from(mergedMap.values());
      memoryCache.lastFetch = now;
    }

    memoryCache.active = cleanActiveList(memoryCache.active);

    return res.status(200).json({
      success: true,
      results: memoryCache.results,
      active: memoryCache.active,
      timestamp: now
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, participant, sessionId, result } = body || {};

    // 1. Pulso de participante ativo no quiz
    if (action === 'pulse' && participant) {
      const filtered = memoryCache.active.filter(p => p.sessionId !== participant.sessionId && now - (p.lastPing || 0) < 8000);
      filtered.push({
        ...participant,
        lastPing: now
      });
      memoryCache.active = filtered;

      // Salva de forma assíncrona na nuvem
      saveCloudData(memoryCache.results, memoryCache.active).catch(() => {});

      return res.status(200).json({ success: true, active: memoryCache.active });
    }

    // 2. Remoção de participante (ao terminar ou fechar aba)
    if (action === 'leave' && sessionId) {
      memoryCache.active = memoryCache.active.filter(p => p.sessionId !== sessionId);
      saveCloudData(memoryCache.results, memoryCache.active).catch(() => {});
      return res.status(200).json({ success: true });
    }

    // 3. Novo resultado gravado no ranking
    if (action === 'result' && result) {
      const existing = memoryCache.results.filter(r => r.id !== result.id);
      const updated = [result, ...existing];
      updated.sort((a, b) => (b.score || 0) - (a.score || 0));
      memoryCache.results = updated;

      // Remove do ao vivo
      if (result.sessionId) {
        memoryCache.active = memoryCache.active.filter(p => p.sessionId !== result.sessionId);
      }

      await saveCloudData(memoryCache.results, memoryCache.active);
      return res.status(200).json({ success: true, results: memoryCache.results });
    }

    // 4. Limpeza de histórico (Admin)
    if (action === 'clear') {
      memoryCache.results = [];
      await saveCloudData([], memoryCache.active);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Ação desconhecida' });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
