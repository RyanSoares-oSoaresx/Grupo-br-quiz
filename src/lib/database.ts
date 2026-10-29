/**
 * QuizPulse - Camada de Banco de Dados Resiliente e Alta Disponibilidade
 * 
 * Suporta 3 camadas de dados:
 * 1. Firebase Realtime / Firestore (Google Cloud Spark Plan - NUNCA expira ou pausa por inatividade)
 * 2. Supabase Postgres (com Keep-Alive automatizado via GitHub Actions para evitar pausa após 7 dias)
 * 3. Fallback Resiliente em Nuvem (Cross-device, offline-first com localStorage)
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
}

export interface LiveParticipant {
  sessionId: string;
  name: string;
  avatar: string;
  currentQ: number;
  totalQ: number;
  elapsedSec: number;
  lastPing: number;
}

const STORAGE_KEYS = {
  RESULTS: 'grupobr_quiz_results_db_v2',
  ACTIVE: 'grupobr_quiz_active_db_v2',
};

// Configurações opcionais de ambiente
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FIREBASE_DB_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL || '';

class ResilientDatabase {
  private isOnline = true;
  private onStatusChangeListeners: ((online: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnlineStatus(true));
      window.addEventListener('offline', () => this.setOnlineStatus(false));
    }
  }

  public subscribeStatus(listener: (online: boolean) => void) {
    this.onStatusChangeListeners.push(listener);
    listener(this.isOnline);
    return () => {
      this.onStatusChangeListeners = this.onStatusChangeListeners.filter(l => l !== listener);
    };
  }

  private setOnlineStatus(status: boolean) {
    this.isOnline = status;
    this.onStatusChangeListeners.forEach(listener => listener(status));
  }

  // --- LOCAL CACHE / OFFLINE FIRST ---
  public getLocalResults(): QuizResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveLocalResults(results: QuizResult[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    } catch {}
  }

  public getLocalActive(): LiveParticipant[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveLocalActive(participants: LiveParticipant[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE, JSON.stringify(participants));
    } catch {}
  }

  // --- CLOUD SYNC: RESULTADOS ---
  public async fetchResults(): Promise<QuizResult[]> {
    const local = this.getLocalResults();

    // 1. Tenta Firebase Realtime DB se configurado
    if (FIREBASE_DB_URL) {
      try {
        const res = await fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/results.json`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            const list: QuizResult[] = Array.isArray(data) ? data : Object.values(data);
            list.sort((a, b) => (b.score || 0) - (a.score || 0));
            this.saveLocalResults(list);
            this.setOnlineStatus(true);
            return list;
          }
        }
      } catch {
        // Fallback para próximo método
      }
    }

    // 2. Tenta Supabase REST se configurado
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_results?select=*&order=score.desc&limit=100`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (res.ok) {
          const list: QuizResult[] = await res.json();
          this.saveLocalResults(list);
          this.setOnlineStatus(true);
          return list;
        }
      } catch {
        // Fallback
      }
    }

    // 3. Fallback Universal KV Cloud Relay com isolamento de namespace
    try {
      const res = await fetch(`https://kvdb.io/4y2P7q2yX9c1K8e1b6w3a/grupobr_v2_results?t=${Date.now()}`);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          // Merge sem perder dados locais
          const mergedMap = new Map<string, QuizResult>();
          [...remote, ...local].forEach(item => {
            if (item && item.id) mergedMap.set(item.id, item);
          });
          const merged = Array.from(mergedMap.values());
          merged.sort((a, b) => (b.score || 0) - (a.score || 0));
          this.saveLocalResults(merged);
          this.setOnlineStatus(true);
          return merged;
        }
      }
    } catch {
      this.setOnlineStatus(false);
    }

    return local;
  }

  public async saveResult(newResult: QuizResult): Promise<QuizResult[]> {
    // 1. Atualiza cache local instantaneamente (Optimistic Update)
    const current = this.getLocalResults();
    const updated = [newResult, ...current.filter(r => r.id !== newResult.id)];
    updated.sort((a, b) => (b.score || 0) - (a.score || 0));
    this.saveLocalResults(updated);

    // 2. Se Firebase configurado, grava no Firebase
    if (FIREBASE_DB_URL) {
      try {
        await fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/results/${newResult.id}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newResult)
        });
      } catch {}
    }

    // 3. Se Supabase configurado, faz insert no Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/quiz_results`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(newResult)
        });
      } catch {}
    }

    // 4. Salva no Fallback Universal KV Cloud
    try {
      await fetch(`https://kvdb.io/4y2P7q2yX9c1K8e1b6w3a/grupobr_v2_results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated.slice(0, 150)) // Mantém o top 150
      });
      this.setOnlineStatus(true);
    } catch {
      this.setOnlineStatus(false);
    }

    return updated;
  }

  public async clearResults(): Promise<void> {
    this.saveLocalResults([]);

    if (FIREBASE_DB_URL) {
      try {
        await fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/results.json`, { method: 'DELETE' });
      } catch {}
    }

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/quiz_results?id=neq.none`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
      } catch {}
    }

    try {
      await fetch(`https://kvdb.io/4y2P7q2yX9c1K8e1b6w3a/grupobr_v2_results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
      });
    } catch {}
  }

  // --- CLOUD SYNC: PARTICIPANTES AO VIVO ---
  public async fetchLiveParticipants(): Promise<LiveParticipant[]> {
    const now = Date.now();
    let activeList: LiveParticipant[] = this.getLocalActive();

    try {
      const res = await fetch(`https://kvdb.io/4y2P7q2yX9c1K8e1b6w3a/grupobr_v2_active?t=${now}`);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          // Filtra sinais recebidos nos últimos 8 segundos
          activeList = remote.filter(p => now - (p.lastPing || 0) < 8000);
          this.saveLocalActive(activeList);
          this.setOnlineStatus(true);
          return activeList;
        }
      }
    } catch {
      this.setOnlineStatus(false);
    }

    // Fallback limpo local
    return activeList.filter(p => now - (p.lastPing || 0) < 8000);
  }

  public async updateLiveParticipant(myEntry: LiveParticipant): Promise<void> {
    const now = Date.now();
    const current = this.getLocalActive().filter(p => p.sessionId !== myEntry.sessionId && now - (p.lastPing || 0) < 8000);
    current.push(myEntry);
    this.saveLocalActive(current);

    try {
      await fetch(`https://kvdb.io/4y2P7q2yX9c1K8e1b6w3a/grupobr_v2_active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      });
      this.setOnlineStatus(true);
    } catch {
      this.setOnlineStatus(false);
    }
  }

  public async removeLiveParticipant(sessionId: string): Promise<void> {
    const current = this.getLocalActive().filter(p => p.sessionId !== sessionId);
    this.saveLocalActive(current);

    try {
      await fetch(`https://kvdb.io/4y2P7q2yX9c1K8e1b6w3a/grupobr_v2_active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      });
    } catch {}
  }
}

export const db = new ResilientDatabase();
