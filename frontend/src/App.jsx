import { useEffect, useState } from "react";
import axios from "axios";

function apiUrl(path) {
  const base = import.meta.env.VITE_API_BASE; // set on Vercel for prod
  // In dev (Vite), no base → proxy handles /api and /images locally
  return base ? `${base}${path}` : path;
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setError("");
      setLoading(true);
      const res = await axios.get(apiUrl("/api/latest"), { timeout: 15000 });
      setData(res.data);
    } catch (e) {
      setError(e?.response?.status ? `${e.response.status}` : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui",background:"#0b1020",color:"#eef2ff"}}>
        ⏳ Loading latest Earth data…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui",background:"#0b1020",color:"#fca5a5"}}>
        ❌ API error: {error}
      </div>
    );
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(180deg,#0b1020,#0f1b3d 60%,#0b1020)",
      color:"#eef2ff",
      padding:"24px",
      fontFamily:"system-ui, Segoe UI, Roboto",
    }}>
      <div style={{maxWidth:960, margin:"0 auto"}}>
        <h1 style={{margin:"0 0 8px"}}>🌎 NASA EPIC — Live Earth Image</h1>
        <p style={{margin:"0 0 16px", opacity:0.85}}>
          <b>Date:</b> {data.date}{data.caption ? ` — ${data.caption}` : ""}
        </p>

        <div style={{display:"flex", gap:12, marginBottom:12}}>
          <button
            onClick={load}
            style={{padding:"8px 12px", borderRadius:8, border:"1px solid #374151", background:"#1f2937", color:"#e5e7eb", cursor:"pointer"}}
          >
            🔄 Refresh
          </button>
        </div>

        <div style={{background:"#111827", padding:12, borderRadius:12, boxShadow:"0 10px 30px rgba(0,0,0,0.35)"}}>
          <img
            src={apiUrl(data.image_local)}  // prod needs full base; dev proxy serves /images/...
            alt="EPIC Earth"
            style={{ width:"100%", borderRadius:8 }}
          />
        </div>

        <p style={{marginTop:12}}>
          <a href={data.image_url} target="_blank" rel="noreferrer" style={{color:"#a5b4fc"}}>
            View original on NASA EPIC
          </a>
        </p>
      </div>
    </div>
  );
}
