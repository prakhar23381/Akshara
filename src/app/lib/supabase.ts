import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

// Initialize the real supabase client
const realSupabase = createClient(supabaseUrl, supabaseKey);

// Define a Mock Query Builder for offline sandbox mode
class MockQueryBuilder {
  private table: string;
  private filters: Array<{ col: string; val: any }> = [];
  private orderCol: string | null = null;
  private orderDesc: boolean = false;
  private limitCount: number | null = null;
  private isSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_cols: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }

  order(col: string, options?: { ascending?: boolean; desc?: boolean }) {
    this.orderCol = col;
    if (options) {
      if (options.ascending !== undefined) this.orderDesc = !options.ascending;
      if (options.desc !== undefined) this.orderDesc = options.desc;
    }
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute() {
    const raw = localStorage.getItem(`akshara_db_${this.table}`);
    let data = raw ? JSON.parse(raw) : [];

    for (const filter of this.filters) {
      data = data.filter((item: any) => item[filter.col] === filter.val);
    }

    if (this.orderCol) {
      data.sort((a: any, b: any) => {
        const valA = a[this.orderCol!];
        const valB = b[this.orderCol!];
        if (valA < valB) return this.orderDesc ? 1 : -1;
        if (valA > valB) return this.orderDesc ? -1 : 1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      return { data: data[0] || null, error: null };
    }

    return { data, error: null };
  }

  async insert(row: any) {
    const raw = localStorage.getItem(`akshara_db_${this.table}`);
    const data = raw ? JSON.parse(raw) : [];
    const newRow = { 
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
      created_at: new Date().toISOString(), 
      ...row 
    };
    data.push(newRow);
    localStorage.setItem(`akshara_db_${this.table}`, JSON.stringify(data));
    return { data: newRow, error: null };
  }

  async upsert(row: any) {
    const raw = localStorage.getItem(`akshara_db_${this.table}`);
    let data = raw ? JSON.parse(raw) : [];
    let index = -1;
    if (row.id) {
      index = data.findIndex((item: any) => item.id === row.id);
    } else if (row.user_id && row.letter) {
      index = data.findIndex((item: any) => item.user_id === row.user_id && item.letter === row.letter);
    } else if (row.user_id) {
      index = data.findIndex((item: any) => item.user_id === row.user_id);
    }

    const updatedRow = { created_at: new Date().toISOString(), ...row };
    if (index !== -1) {
      data[index] = { ...data[index], ...updatedRow };
    } else {
      updatedRow.id = updatedRow.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      data.push(updatedRow);
    }
    localStorage.setItem(`akshara_db_${this.table}`, JSON.stringify(data));
    return { data: updatedRow, error: null };
  }
}

// Mock auth interface for offline usage
const mockAuth = {
  async getSession() {
    const raw = localStorage.getItem("akshara_mock_session");
    if (raw) {
      return { data: { session: JSON.parse(raw) }, error: null };
    }
    return { data: { session: null }, error: null };
  },
  onAuthStateChange(callback: any) {
    const listener = () => {
      const raw = localStorage.getItem("akshara_mock_session");
      const session = raw ? JSON.parse(raw) : null;
      callback("SIGNED_IN", session);
    };
    window.addEventListener("akshara_auth_state_change", listener);
    
    // Initial call
    const raw = localStorage.getItem("akshara_mock_session");
    const session = raw ? JSON.parse(raw) : null;
    setTimeout(() => callback("SIGNED_IN", session), 0);

    return {
      data: {
        subscription: {
          unsubscribe() {
            window.removeEventListener("akshara_auth_state_change", listener);
          }
        }
      }
    };
  },
  async signInWithOAuth() {
    return { error: null };
  },
  async signOut() {
    localStorage.removeItem("akshara_mock_session");
    localStorage.removeItem("akshara_offline_mode");
    window.dispatchEvent(new Event("akshara_auth_state_change"));
    return { error: null };
  }
};

// Proxied supabase client that delegates to mock classes when offline mode is active
export const supabase = new Proxy(realSupabase, {
  get(target, prop, receiver) {
    const offlineMode = localStorage.getItem("akshara_offline_mode") === "true";
    
    if (prop === "auth") {
      if (offlineMode) {
        return mockAuth;
      }
    }
    
    if (prop === "from") {
      if (offlineMode) {
        return (table: string) => new MockQueryBuilder(table);
      }
    }
    
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") {
      return value.bind(target);
    }
    return value;
  }
});
