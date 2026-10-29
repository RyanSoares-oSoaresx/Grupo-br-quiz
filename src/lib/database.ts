/**
 * QuizPulse - Camada de Banco de Dados e Sincronização em Tempo Real (Alta Disponibilidade)
 * 
 * Funcionalidades:
 * 1. BroadcastChannel para sincronização instantânea (0ms) entre todas as abas abertas no navegador
 * 2. Vercel Serverless API (/api/sync) para sincronização multi-dispositivo sem CORS
 * 3. Fallback Cloud Storage permanente (restful-api.dev ID dedicado - NUNCA expira ou pausa por inatividade)
 * 4. Cache local Offline-First via localStorage
 */

export interface QuizResult {
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
  sessionId?: string;
}

export interface LiveParticipant {
  sessionId: string;
  name: string;
  avatar: string;
  currentQ: number;
  totalQ: number;
  elapsedSec: number;
  lastPing: number;
  streak?: number;
}

const STORAGE_KEYS = {
  RESULTS: 'grupobr_quiz_results_v3',
  ACTIVE: 'grupobr_quiz_active_v3',
};

// ID permanente do Cloud Storage dedicado (100% ativo, nunca pausa por inatividade)
const DIRECT_CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects/ff808181a09d98f701a188175bca502d';

class RealtimeDatabase {
  private channel: BroadcastChannel | null = null;
  private isOnline = true;
  private statusListeners: ((online: boolean) => void)[] = [];
  private dataListeners: ((data: { results: QuizResult[]; active: LiveParticipant[] }) => void)[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private cachedResults: QuizResult[] = [];
  private cachedActive: LiveParticipant[] = [];

  constructor() {
    this.cachedResults = this.getLocalResults();
    this.cachedActive = this.getLocalActive();

    // 1. Inicializa o canal Broadcast em tempo real para sincronização entre abas
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('quizpulse_realtime_v3');
      this.channel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
    }

    // 2. Monitor de conectividade
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnlineStatus(true));
      window.addEventListener('offline', () => this.setOnlineStatus(false));
    }

    // 3. Inicia loop de sincronização periódica (a cada 2.5s)
    this.startPeriodicSync();
  }

  // --- CANAL BROADCAST CROSS-TAB ---
  private handleBroadcastMessage(msg: { type: string; payload?: unknown }) {
    if (!msg || !msg.type) return;

    const now = Date.now();

    if (msg.type === 'PULSE') {
      const p = msg.payload as LiveParticipant;
      if (p && p.sessionId) {
        const filtered = this.cachedActive.filter(item => item.sessionId !== p.sessionId && now - (item.lastPing || 0) < 8000);
        filtered.push(p);
        this.cachedActive = filtered;
        this.saveLocalActive(filtered);
        this.notifyDataListeners();
      }
    } else if (msg.type === 'LEAVE') {
      const sessionId = msg.payload as string;
      if (sessionId) {
        this.cachedActive = this.cachedActive.filter(p => p.sessionId !== sessionId);
        this.saveLocalActive(this.cachedActive);
        this.notifyDataListeners();
      }
    } else if (msg.type === 'RESULT') {
      const res = msg.payload as QuizResult;
      if (res && res.id) {
        const existing = this.cachedResults.filter(r => r.id !== res.id);
        const updated = [res, ...existing];
        updated.sort((a, b) => (b.score || 0) - (a.score || 0));
        this.cachedResults = updated;
        this.saveLocalResults(updated);
        // Também remove do bloco ativo
        if (res.sessionId) {
          this.cachedActive = this.cachedActive.filter(p => p.sessionId !== res.sessionId);
          this.saveLocalActive(this.cachedActive);
        }
        this.notifyDataListeners();
      }
    } else if (msg.type === 'CLEAR') {
      this.cachedResults = [];
      this.saveLocalResults([]);
      this.notifyDataListeners();
    }
  }

  private broadcast(type: string, payload?: unknown) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload });
      } catch {}
    }
  }

  // --- INSCRIÇÕES E LISTENERS ---
  public subscribeStatus(listener: (online: boolean) => void) {
    this.statusListeners.push(listener);
    listener(this.isOnline);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  public subscribeData(listener: (data: { results: QuizResult[]; active: LiveParticipant[] }) => void) {
    this.dataListeners.push(listener);
    listener({ results: this.cachedResults, active: this.cachedActive });
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== listener);
    };
  }

  private setOnlineStatus(status: boolean) {
    this.isOnline = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private notifyDataListeners() {
    const data = { results: this.cachedResults, active: this.cachedActive };
    this.dataListeners.forEach(listener => listener(data));
  }

  // --- ARMAZENAMENTO LOCAL ---
  public getLocalResults(): QuizResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalResults(results: QuizResult[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    } catch {}
  }

  public getLocalActive(): LiveParticipant[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE);
      const now = Date.now();
      const list: LiveParticipant[] = data ? JSON.parse(data) : [];
      return list.filter(p => now - (p.lastPing || 0) < 8000);
    } catch {
      return [];
    }
  }

  private saveLocalActive(participants: LiveParticipant[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE, JSON.stringify(participants));
    } catch {}
  }

  // --- SINCRONIZAÇÃO EM NUVEM ---
  private startPeriodicSync() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const syncTick = async () => {
      await this.syncFromCloud();
    };

    // Sincronização inicial
    syncTick();

    // Loop contínuo a cada 2.5 segundos (sem necessidade de pressionar F5)
    this.pollInterval = setInterval(syncTick, 2500);
  }

  public async syncFromCloud(): Promise<void> {
    const now = Date.now();

    // 1. Tenta API do Vercel (/api/sync)
    try {
      const res = await fetch('/api/sync', { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          const remoteResults: QuizResult[] = json.results || [];
          const remoteActive: LiveParticipant[] = (json.active || []).filter(
            (p: LiveParticipant) => now - (p.lastPing || 0) < 8000
          );

          this.updateStateAndNotify(remoteResults, remoteActive);
          this.setOnlineStatus(true);
          return;
        }
      }
    } catch {
      // Falhou a rota local ou /api não respondeu, tenta fallback direto
    }

    // 2. Fallback Direto na Nuvem (restful-api.dev - 100% permanente)
    try {
      const res = await fetch(DIRECT_CLOUD_ENDPOINT, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          const remoteResults: QuizResult[] = Array.isArray(json.data.results) ? json.data.results : [];
          const remoteActive: LiveParticipant[] = (Array.isArray(json.data.active) ? json.data.active : []).filter(
            (p: LiveParticipant) => now - (p.lastPing || 0) < 8000
          );

          this.updateStateAndNotify(remoteResults, remoteActive);
          this.setOnlineStatus(true);
          return;
        }
      }
    } catch {
      this.setOnlineStatus(false);
    }
  }

  private updateStateAndNotify(remoteResults: QuizResult[], remoteActive: LiveParticipant[]) {
    // Mescla resultados de forma consistente
    const mergedMap = new Map<string, QuizResult>();
    [...remoteResults, ...this.cachedResults].forEach(r => {
      if (r && r.id) mergedMap.set(r.id, r);
    });
    const finalResults = Array.from(mergedMap.values());
    finalResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    this.cachedResults = finalResults;
    this.cachedActive = remoteActive;

    this.saveLocalResults(finalResults);
    this.saveLocalActive(remoteActive);

    this.notifyDataListeners();
  }

  // --- GRAVAÇÃO DE RESULTADO FINAL ---
  public async saveResult(newResult: QuizResult): Promise<QuizResult[]> {
    // 1. Atualização Otimista Imediata + Broadcast entre abas (0ms)
    const existing = this.cachedResults.filter(r => r.id !== newResult.id);
    const updated = [newResult, ...existing];
    updated.sort((a, b) => (b.score || 0) - (a.score || 0));

    this.cachedResults = updated;
    this.saveLocalResults(updated);
    this.broadcast('RESULT', newResult);
    this.notifyDataListeners();

    // 2. Envia para o Vercel Serverless
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'result', result: newResult })
      });
      if (res.ok) {
        this.setOnlineStatus(true);
        return updated;
      }
    } catch {}

    // 3. Fallback Direto na Nuvem
    try {
      await fetch(DIRECT_CLOUD_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'quizpulse_grupobr_v1',
          data: {
            results: updated.slice(0, 100),
            active: this.cachedActive
          }
        })
      });
      this.setOnlineStatus(true);
    } catch {
      this.setOnlineStatus(false);
    }

    return updated;
  }

  // --- PULSO DO PARTICIPANTE AO VIVO ---
  public async emitLivePulse(participant: LiveParticipant): Promise<void> {
    const now = Date.now();
    participant.lastPing = now;

    // 1. Atualização Otimista Imediata + Broadcast entre abas (0ms)
    const filtered = this.cachedActive.filter(p => p.sessionId !== participant.sessionId && now - (p.lastPing || 0) < 8000);
    filtered.push(participant);
    this.cachedActive = filtered;
    this.saveLocalActive(filtered);

    this.broadcast('PULSE', participant);
    this.notifyDataListeners();

    // 2. Envia para o Vercel Serverless
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pulse', participant })
      });
      if (res.ok) {
        this.setOnlineStatus(true);
        return;
      }
    } catch {}

    // 3. Fallback Direto na Nuvem
    try {
      await fetch(DIRECT_CLOUD_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'quizpulse_grupobr_v1',
          data: {
            results: this.cachedResults.slice(0, 100),
            active: filtered
          }
        })
      });
      this.setOnlineStatus(true);
    } catch {
      this.setOnlineStatus(false);
    }
  }

  // --- REMOÇÃO DO PARTICIPANTE AO SAIR ---
  public async removeLiveParticipant(sessionId: string): Promise<void> {
    this.cachedActive = this.cachedActive.filter(p => p.sessionId !== sessionId);
    this.saveLocalActive(this.cachedActive);
    this.broadcast('LEAVE', sessionId);
    this.notifyDataListeners();

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', sessionId })
      });
    } catch {
      try {
        await fetch(DIRECT_CLOUD_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'quizpulse_grupobr_v1',
            data: {
              results: this.cachedResults.slice(0, 100),
              active: this.cachedActive
            }
          })
        });
      } catch {}
    }
  }

  // --- LIMPAR HISTÓRICO ---
  public async clearResults(): Promise<void> {
    this.cachedResults = [];
    this.saveLocalResults([]);
    this.broadcast('CLEAR');
    this.notifyDataListeners();

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
    } catch {
      try {
        await fetch(DIRECT_CLOUD_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'quizpulse_grupobr_v1',
            data: {
              results: [],
              active: this.cachedActive
            }
          })
        });
      } catch {}
    }
  }
}

export const db = new RealtimeDatabase();
