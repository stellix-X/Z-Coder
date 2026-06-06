import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Bookmark {
  id: number;
  problem_url: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  // Bookmark State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [newUrl, setNewUrl] = useState('');
  
  // Compiler State
  const [code, setCode] = useState('def solve():\n    print("Hello from Z-Coder Engine!")\n\nif __name__ == "__main__":\n    solve()');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('Output will appear here...');
  const [isCompiling, setIsCompiling] = useState(false);
  
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('zcoder_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/bookmarks', getAuthHeaders());
        setBookmarks(res.data);
      } catch (err) {
        localStorage.removeItem('zcoder_token');
        navigate('/login');
      }
    };
    fetchBookmarks();
  }, [navigate]);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    try {
      const res = await axios.post('http://localhost:5000/api/bookmarks', { url: newUrl }, getAuthHeaders());
      setBookmarks([res.data, ...bookmarks]);
      setNewUrl('');
    } catch (err) {
      alert('Failed to save problem link.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:5000/api/bookmarks/${id}`, getAuthHeaders());
      setBookmarks(bookmarks.filter(b => b.id !== id));
    } catch (err) {
      alert('Failed to delete bookmark.');
    }
  };

  // Compiler Execution Logic
  const handleCompile = async () => {
    setIsCompiling(true);
    setOutput("Compiling and executing via Z-Coder Engine...");
    try {
      const res = await axios.post('http://localhost:5000/api/compile', { language, code }, getAuthHeaders());
      setOutput(res.data.output);
    } catch (err: any) {
      setOutput(err.response?.data?.output || "Engine execution failed.");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zcoder_token');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <nav style={styles.navbar}>
        <h2 style={styles.logo}>Z-Coder Hub</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>Log Out</button>
      </nav>

      <div style={styles.grid}>
        {/* LEFT COLUMN: URL SYNCING */}
        <div style={styles.column}>
          <h3 style={styles.sectionTitle}>Synced Problems</h3>
          <form onSubmit={handleAddBookmark} style={styles.inputGroup}>
            <input 
              type="url" 
              placeholder="Paste problem URL..." 
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.addBtn}>Sync</button>
          </form>

          <div style={styles.list}>
            {bookmarks.length === 0 ? (
              <p style={styles.mutedText}>No problems saved. Use the browser extension!</p>
            ) : (
              bookmarks.map((bookmark) => (
                <div key={bookmark.id} style={styles.card}>
                  <a href={bookmark.problem_url} target="_blank" rel="noreferrer" style={styles.link}>
                    {bookmark.problem_url.length > 40 ? bookmark.problem_url.substring(0, 40) + '...' : bookmark.problem_url}
                  </a>
                  <button onClick={() => handleDelete(bookmark.id)} style={styles.deleteBtn}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Z-CODER COMPILER */}
        <div style={styles.column}>
          <div style={styles.compilerHeader}>
            <h3 style={styles.sectionTitle}>ZCoder Compiler</h3>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.select}>
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC)</option>
            </select>
          </div>
          
          <textarea 
            style={styles.editor} 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
          />
          
          <button 
            onClick={handleCompile} 
            disabled={isCompiling} 
            style={{...styles.runBtn, opacity: isCompiling ? 0.7 : 1}}
          >
            {isCompiling ? "Executing..." : "Run Code 🚀"}
          </button>

          <div style={styles.terminal}>
            <span style={styles.terminalPrompt}>$ zcoder-engine execution --out</span>
            <pre style={styles.outputText}>{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// Advanced Dark Mode Layout
const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0d1117', fontFamily: 'system-ui, sans-serif' },
  navbar: { display: 'flex', justifyContent: 'space-between', padding: '15px 40px', backgroundColor: '#161b22', borderBottom: '1px solid #30363d' },
  logo: { color: '#e6edf3', margin: 0 },
  logoutBtn: { backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', padding: '30px 40px', maxWidth: '1400px', margin: '0 auto' },
  column: { display: 'flex', flexDirection: 'column' as const, gap: '15px' },
  sectionTitle: { color: '#e6edf3', margin: '0 0 10px 0' },
  inputGroup: { display: 'flex', gap: '10px' },
  input: { flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#010409', color: '#e6edf3', outline: 'none' },
  addBtn: { padding: '0 20px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '10px', overflowY: 'auto' as const, maxHeight: '600px' },
  mutedText: { color: '#8b949e', fontStyle: 'italic' },
  card: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161b22', padding: '15px', borderRadius: '6px', border: '1px solid #30363d' },
  link: { color: '#58a6ff', textDecoration: 'none', fontSize: '14px' },
  deleteBtn: { backgroundColor: 'transparent', color: '#8b949e', border: 'none', cursor: 'pointer', fontSize: '16px' },
  compilerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  select: { padding: '8px', backgroundColor: '#161b22', color: '#e6edf3', border: '1px solid #30363d', borderRadius: '4px', outline: 'none' },
  editor: { height: '350px', backgroundColor: '#010409', color: '#e6edf3', fontFamily: 'monospace', padding: '15px', borderRadius: '6px', border: '1px solid #30363d', fontSize: '15px', resize: 'none' as const, outline: 'none' },
  runBtn: { padding: '12px', backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-end' as const },
  terminal: { backgroundColor: '#010409', padding: '15px', borderRadius: '6px', border: '1px solid #30363d', minHeight: '150px' },
  terminalPrompt: { color: '#3fb950', fontSize: '12px', fontFamily: 'monospace', display: 'block', marginBottom: '10px' },
  outputText: { color: '#e6edf3', fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap' as const, fontSize: '14px' }
};

export default Dashboard;